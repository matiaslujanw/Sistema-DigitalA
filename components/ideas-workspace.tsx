"use client";

import type { FormEvent } from "react";
import { useEffect, useMemo, useState } from "react";
import { localKeys } from "@/lib/local-keys";

type NoteUrgency = "baja" | "media" | "alta" | "urgente";

type IdeaNote = {
  id: string;
  title: string;
  kind: string;
  body: string;
  need: string;
  urgency: NoteUrgency;
  createdAt: string;
};

const urgencies: Array<{ label: string; value: NoteUrgency }> = [
  { label: "Baja", value: "baja" },
  { label: "Media", value: "media" },
  { label: "Alta", value: "alta" },
  { label: "Urgente", value: "urgente" }
];

const initialNotes: IdeaNote[] = [
  {
    id: "note-portal",
    title: "Portal para clientes",
    kind: "Idea",
    body: "Que el cliente pueda ver avance, documentos y pendientes sin tener que pedir estado por WhatsApp.",
    need: "Pensar alcance MVP",
    urgency: "media",
    createdAt: "2026-07-04"
  },
  {
    id: "note-lead",
    title: "Lead dashboard comercial",
    kind: "Posible proyecto",
    body: "Hay interes, pero falta entender que datos tienen y si quieren algo operativo o solo reportes.",
    need: "Coordinar reunion",
    urgency: "alta",
    createdAt: "2026-07-04"
  },
  {
    id: "note-stock",
    title: "Producto stock + caja",
    kind: "Producto propio",
    body: "Puede repetirse en varios comercios chicos. Anotar preguntas antes de convertirlo en proyecto.",
    need: "Validar precio",
    urgency: "baja",
    createdAt: "2026-07-04"
  }
];

const emptyDraft: Omit<IdeaNote, "id" | "createdAt"> = {
  body: "",
  kind: "Idea",
  need: "",
  title: "",
  urgency: "media"
};

export function IdeasWorkspace() {
  const [notes, setNotes] = useState<IdeaNote[]>(initialNotes);
  const [draft, setDraft] = useState(emptyDraft);
  const [editingId, setEditingId] = useState<string | null>(null);

  useEffect(() => {
    const savedNotes = window.localStorage.getItem(localKeys.ideas);
    if (!savedNotes) return;

    try {
      const parsed = JSON.parse(savedNotes) as Array<Partial<IdeaNote> & { note?: string; priority?: string; client?: string; nextAction?: string }>;
      if (!Array.isArray(parsed)) return;
      setNotes(parsed.map(normalizeNote));
    } catch {
      setNotes(initialNotes);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(localKeys.ideas, JSON.stringify(notes));
  }, [notes]);

  const metrics = useMemo(() => {
    const urgent = notes.filter((note) => note.urgency === "urgente" || note.urgency === "alta").length;
    const possibleProjects = notes.filter((note) => note.kind.toLowerCase().includes("proyecto")).length;
    return { possibleProjects, total: notes.length, urgent };
  }, [notes]);

  function saveNote(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!draft.title.trim() && !draft.body.trim()) return;

    const nextNote: IdeaNote = {
      ...draft,
      body: draft.body.trim(),
      id: editingId ?? `note-${Date.now()}`,
      kind: draft.kind.trim() || "Nota",
      need: draft.need.trim(),
      title: draft.title.trim() || "Nota sin titulo",
      createdAt: new Date().toISOString().slice(0, 10)
    };

    setNotes((current) => {
      if (!editingId) return [nextNote, ...current];
      return current.map((note) => (note.id === editingId ? nextNote : note));
    });
    setDraft(emptyDraft);
    setEditingId(null);
  }

  function editNote(note: IdeaNote) {
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
    setNotes((current) => current.filter((note) => note.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraft(emptyDraft);
    }
  }

  return (
    <section className="executive-page notes-command">
      <header className="notes-head">
        <div>
          <span>Notas / Ideas / Posibles proyectos</span>
          <h1>Tablero de Notas</h1>
          <p>Un lugar simple para dejar pegado lo que aparece: ideas, leads, cosas a pedir y puntos para arrancar despues.</p>
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
            <button className="command-primary" type="submit">{editingId ? "Guardar nota" : "+ Pegar nota"}</button>
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
      </section>
    </section>
  );
}

function normalizeNote(note: Partial<IdeaNote> & { note?: string; priority?: string; client?: string; nextAction?: string }): IdeaNote {
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

function normalizeUrgency(value?: string): NoteUrgency {
  const normalized = value?.toLowerCase();
  if (normalized === "alta") return "alta";
  if (normalized === "baja") return "baja";
  if (normalized === "urgente") return "urgente";
  return "media";
}

function urgencyLabel(value: NoteUrgency) {
  if (value === "baja") return "Baja";
  if (value === "alta") return "Alta";
  if (value === "urgente") return "Urgente";
  return "Media";
}
