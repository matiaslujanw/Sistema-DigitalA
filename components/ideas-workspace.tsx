"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createIdeaAction, deleteIdeaAction, updateIdeaAction } from "@/app/actions/ideas";
import { localKeys } from "@/lib/local-keys";
import type { Idea, IdeaUrgency } from "@/lib/types";

const urgencies: Array<{ label: string; value: IdeaUrgency }> = [
  { label: "Baja", value: "baja" },
  { label: "Media", value: "media" },
  { label: "Alta", value: "alta" },
  { label: "Urgente", value: "urgente" }
];

const emptyDraft: Omit<Idea, "id" | "createdAt"> = {
  body: "",
  kind: "Idea",
  need: "",
  title: "",
  urgency: "media"
};

export function IdeasWorkspace({
  initialIdeas,
  source
}: {
  initialIdeas: Idea[];
  source: "mock" | "supabase";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [notes, setNotes] = useState<Idea[]>(initialIdeas);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const isLocal = source !== "supabase";

  // Modo local: cargar y persistir en localStorage (comportamiento previo).
  useEffect(() => {
    if (!isLocal) return;
    const savedNotes = window.localStorage.getItem(localKeys.ideas);
    if (!savedNotes) return;

    try {
      const parsed = JSON.parse(savedNotes) as Array<Partial<Idea> & { note?: string; priority?: string; client?: string; nextAction?: string }>;
      if (!Array.isArray(parsed)) return;
      setNotes(parsed.map(normalizeNote));
    } catch {
      // se mantienen las iniciales
    }
  }, [isLocal]);

  useEffect(() => {
    if (!isLocal) return;
    window.localStorage.setItem(localKeys.ideas, JSON.stringify(notes));
  }, [isLocal, notes]);

  const metrics = useMemo(() => {
    const urgent = notes.filter((note) => note.urgency === "urgente" || note.urgency === "alta").length;
    const possibleProjects = notes.filter((note) => note.kind.toLowerCase().includes("proyecto")).length;
    return { possibleProjects, total: notes.length, urgent };
  }, [notes]);

  function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() && !draft.body.trim()) return;

    const cleanDraft = {
      body: draft.body.trim(),
      kind: draft.kind.trim() || "Nota",
      need: draft.need.trim(),
      title: draft.title.trim() || "Nota sin titulo",
      urgency: draft.urgency
    };
    const nextNote: Idea = {
      ...cleanDraft,
      id: editingId ?? `note-${Date.now()}`,
      createdAt: new Date().toISOString().slice(0, 10)
    };

    if (isLocal) {
      applyNote(nextNote);
      return;
    }

    startTransition(async () => {
      try {
        if (editingId) {
          await updateIdeaAction(editingId, cleanDraft);
          applyNote(nextNote);
        } else {
          const newId = await createIdeaAction(cleanDraft);
          applyNote({ ...nextNote, id: newId });
        }
        setFeedback(null);
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo guardar la nota");
      }
    });
  }

  function applyNote(nextNote: Idea) {
    setNotes((current) => {
      if (!editingId) return [nextNote, ...current];
      return current.map((note) => (note.id === editingId ? nextNote : note));
    });
    setDraft(emptyDraft);
    setEditingId(null);
  }

  function editNote(note: Idea) {
    setEditingId(note.id);
    setDraft({
      body: note.body,
      kind: note.kind,
      need: note.need,
      title: note.title,
      urgency: note.urgency
    });
  }

  function deleteNote(id: string) {
    const removeLocally = () => {
      setNotes((current) => current.filter((note) => note.id !== id));
      if (editingId === id) {
        setEditingId(null);
        setDraft(emptyDraft);
      }
    };

    if (isLocal) {
      removeLocally();
      return;
    }

    startTransition(async () => {
      try {
        await deleteIdeaAction(id);
        removeLocally();
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo borrar la nota");
      }
    });
  }

  return (
    <section className="executive-page notes-command">
      <header className="notes-head">
        <div>
          <span>Notas / Ideas / Posibles proyectos</span>
          <h1>Tablero de Notas</h1>
          <p>Un lugar simple para dejar pegado lo que aparece: ideas, leads, cosas a pedir y puntos para arrancar despues.</p>
          {feedback ? <p className="notes-feedback">{feedback}</p> : null}
        </div>
        <div className="notes-metrics">
          <article>
            <span>Notas</span>
            <strong>{metrics.total}</strong>
          </article>
          <article>
            <span>Urgentes</span>
            <strong>{metrics.urgent}</strong>
          </article>
          <article>
            <span>Posibles proyectos</span>
            <strong>{metrics.possibleProjects}</strong>
          </article>
        </div>
      </header>

      <form className="quick-note" onSubmit={saveNote}>
        <div className="quick-note-main">
          <label>
            <span>Titulo</span>
            <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} placeholder="Ej: pedir presupuesto de automatizacion" />
          </label>
          <label>
            <span>Nota</span>
            <textarea value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} placeholder="Anotar rapido que paso, que falta, que hay que pedir o que podria ser..." />
          </label>
        </div>
        <div className="quick-note-side">
          <label>
            <span>Tipo</span>
            <input value={draft.kind} onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value }))} placeholder="Idea, posible proyecto, pendiente..." />
          </label>
          <label>
            <span>Necesito</span>
            <input value={draft.need} onChange={(event) => setDraft((current) => ({ ...current, need: event.target.value }))} placeholder="Reunion, datos, decision..." />
          </label>
          <div className="urgency-picker" role="radiogroup" aria-label="Urgencia">
            {urgencies.map((urgency) => (
              <button
                className={draft.urgency === urgency.value ? "active" : ""}
                key={urgency.value}
                type="button"
                onClick={() => setDraft((current) => ({ ...current, urgency: urgency.value }))}
              >
                <span className={`urgency-dot ${urgency.value}`} aria-hidden="true" />
                {urgency.label}
              </button>
            ))}
          </div>
          <div className="quick-note-actions">
            <button className="command-primary" disabled={isPending} type="submit">
              {isPending ? "Guardando…" : editingId ? "Guardar nota" : "+ Pegar nota"}
            </button>
            {editingId ? <button className="ghost-button" type="button" onClick={() => { setEditingId(null); setDraft(emptyDraft); }}>Cancelar</button> : null}
          </div>
        </div>
      </form>

      <section className="sticky-board" aria-label="Tablero de notas">
        {notes.map((note, index) => (
          <article className={`sticky-note ${note.urgency} tilt-${index % 4}`} key={note.id}>
            <header>
              <span>{note.kind}</span>
              <small>{urgencyLabel(note.urgency)}</small>
            </header>
            <h2>{note.title}</h2>
            <p>{note.body || "Sin detalle todavia."}</p>
            {note.need ? (
              <div>
                <span>Necesito</span>
                <strong>{note.need}</strong>
              </div>
            ) : null}
            <footer>
              <time>{note.createdAt}</time>
              <button type="button" onClick={() => editNote(note)}>Editar</button>
              <button type="button" onClick={() => deleteNote(note.id)}>Borrar</button>
            </footer>
          </article>
        ))}
        {notes.length === 0 ? (
          <div className="panel-empty">
            <strong>Todavia no hay notas.</strong>
            <span>Pega la primera con el formulario de arriba.</span>
          </div>
        ) : null}
      </section>
    </section>
  );
}

function normalizeNote(note: Partial<Idea> & { note?: string; priority?: string; client?: string; nextAction?: string }): Idea {
  return {
    body: note.body ?? note.note ?? "",
    createdAt: note.createdAt ?? new Date().toISOString().slice(0, 10),
    id: note.id ?? `note-${Math.random().toString(36).slice(2)}`,
    kind: note.kind ?? note.client ?? "Nota",
    need: note.need ?? note.nextAction ?? "",
    title: note.title ?? "Nota sin titulo",
    urgency: normalizeUrgency(note.urgency ?? note.priority)
  };
}

function normalizeUrgency(value?: string): IdeaUrgency {
  const normalized = value?.toLowerCase();
  if (normalized === "alta") return "alta";
  if (normalized === "baja") return "baja";
  if (normalized === "urgente") return "urgente";
  return "media";
}

function urgencyLabel(value: IdeaUrgency) {
  if (value === "baja") return "Baja";
  if (value === "alta") return "Alta";
  if (value === "urgente") return "Urgente";
  return "Media";
}
