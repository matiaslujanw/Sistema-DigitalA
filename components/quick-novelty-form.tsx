"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { addProjectEventAction, addProjectNoteAction } from "@/app/actions/projects";
import { localKeys } from "@/lib/local-keys";
import type { Client, Project, ProjectEvent, ProjectNote } from "@/lib/types";

const noveltyTypes = ["Reunion", "Relevamiento", "Decision", "Pedido cliente", "Entrega", "Feature", "Bloqueo", "Cambio de alcance", "Nota"] as const;
const noteTypes = ["Relevamiento", "Decision", "Pedido cliente", "Bloqueo", "Cambio de alcance", "Nota", "Reunion"];

export function QuickNoveltyForm({
  clients,
  partnerNames,
  projects,
  source
}: {
  clients: Client[];
  partnerNames: string[];
  projects: Project[];
  source: "mock" | "supabase";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState({
    body: "",
    createsTask: false,
    date: today,
    hours: "1",
    owner: partnerNames[0] ?? "",
    projectId: projects[0]?.id ?? "",
    title: "",
    type: "Reunion" as (typeof noveltyTypes)[number]
  });

  function saveNovelty() {
    if (!draft.projectId || !draft.title.trim() || !draft.body.trim()) return;

    if (source !== "supabase") {
      saveLocally();
      router.push(`/proyectos/${draft.projectId}`);
      return;
    }

    startTransition(async () => {
      try {
        if (noteTypes.includes(draft.type)) {
          // addProjectNoteAction ya crea la nota y el evento de trazabilidad.
          await addProjectNoteAction({
            body: draft.body,
            createsTask: draft.createsTask,
            date: draft.date,
            owner: draft.owner,
            projectId: draft.projectId,
            title: draft.title,
            type: mapNoveltyToNote(draft.type)
          });
        } else {
          await addProjectEventAction({
            date: draft.date,
            hours: Number(draft.hours) || 0,
            notes: draft.body,
            owner: draft.owner,
            projectId: draft.projectId,
            title: draft.title,
            type: mapNoveltyToEvent(draft.type)
          });
        }
        router.push(`/proyectos/${draft.projectId}`);
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo guardar la novedad");
      }
    });
  }

  function saveLocally() {
    const event: ProjectEvent = {
      id: `local-event-${Date.now()}`,
      projectId: draft.projectId,
      date: draft.date,
      hours: Number(draft.hours) || 0,
      notes: draft.body,
      owner: draft.owner,
      title: draft.title,
      type: mapNoveltyToEvent(draft.type)
    };
    appendToList(localKeys.events, event);

    if (noteTypes.includes(draft.type)) {
      const note: ProjectNote = {
        id: `local-note-${Date.now()}`,
        projectId: draft.projectId,
        body: draft.body,
        createsTask: draft.createsTask,
        date: draft.date,
        owner: draft.owner,
        title: draft.title,
        type: mapNoveltyToNote(draft.type)
      };
      appendToList(localKeys.notes, note);
    }
  }

  return (
    <section className="executive-page novelty-command">
      <header className="command-header">
        <div>
          <h1>Cargar Novedad</h1>
          <p>Registro rapido de reuniones, decisiones, pedidos, entregas o relevamientos vinculados a un proyecto.</p>
        </div>
      </header>

      <article className="finance-drawer">
        <header>
          <span className="eyebrow">Nueva novedad · impacta en trazabilidad</span>
          <strong>{feedback ?? (source === "supabase" ? "Conectado a Supabase" : "Modo local")}</strong>
        </header>
        <div className="finance-form compact">
          <div className="field-grid">
            <label className="field">
              <span>Proyecto</span>
              <select value={draft.projectId} onChange={(event) => setDraft((current) => ({ ...current, projectId: event.target.value }))}>
                {projects.map((project) => {
                  const client = clients.find((item) => item.id === project.clientId);
                  return (
                    <option key={project.id} value={project.id}>
                      {project.name} · {client?.name ?? "Cliente"}
                    </option>
                  );
                })}
              </select>
            </label>
            <label className="field">
              <span>Tipo</span>
              <select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as (typeof noveltyTypes)[number] }))}>
                {noveltyTypes.map((type) => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span>Fecha</span>
              <input type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} />
            </label>
            <label className="field">
              <span>Responsable</span>
              <input
                list="novelty-partners"
                value={draft.owner}
                onChange={(event) => setDraft((current) => ({ ...current, owner: event.target.value }))}
              />
              <datalist id="novelty-partners">
                {partnerNames.map((name) => <option key={name} value={name} />)}
              </datalist>
            </label>
            <label className="field">
              <span>Horas asociadas</span>
              <input min="0" step="0.5" type="number" value={draft.hours} onChange={(event) => setDraft((current) => ({ ...current, hours: event.target.value }))} />
            </label>
            <label className="field checkbox-field">
              <input
                checked={draft.createsTask}
                type="checkbox"
                onChange={(event) => setDraft((current) => ({ ...current, createsTask: event.target.checked }))}
              />
              <span>Genera tarea/feature</span>
            </label>
          </div>

          <label className="field">
            <span>Titulo</span>
            <input value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
          </label>
          <label className="field">
            <span>Detalle</span>
            <textarea rows={4} value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} />
          </label>

          <div className="quick-note-actions">
            <button className="command-primary" disabled={isPending} type="button" onClick={saveNovelty}>
              {isPending ? "Guardando…" : "Guardar novedad"}
            </button>
          </div>
        </div>
      </article>
    </section>
  );
}

function mapNoveltyToEvent(type: (typeof noveltyTypes)[number]): ProjectEvent["type"] {
  if (type === "Pedido cliente") return "Pedido cliente";
  if (type === "Cambio de alcance") return "Cambio de alcance";
  if (type === "Bloqueo") return "Bloqueo";
  if (type === "Nota") return "Nota";
  return type;
}

function mapNoveltyToNote(type: (typeof noveltyTypes)[number]): ProjectNote["type"] {
  if (type === "Feature" || type === "Entrega") return "Nota interna";
  if (type === "Nota") return "Nota interna";
  return type as ProjectNote["type"];
}

function appendToList<T extends { id: string }>(key: string, item: T) {
  const current = readLocal<T[]>(key, []);
  window.localStorage.setItem(key, JSON.stringify([item, ...current.filter((currentItem) => currentItem.id !== item.id)]));
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
