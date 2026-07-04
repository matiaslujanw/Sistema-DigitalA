"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";
import { clients, projects } from "@/lib/mock-data";
import { localKeys } from "@/lib/local-keys";
import type { Client, Project, ProjectEvent, ProjectNote } from "@/lib/types";

const noveltyTypes = ["Reunion", "Relevamiento", "Decision", "Pedido cliente", "Entrega", "Feature", "Bloqueo", "Cambio de alcance", "Nota"] as const;

export function QuickNoveltyForm() {
  const router = useRouter();
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [localClients, setLocalClients] = useState<Client[]>([]);
  const [draft, setDraft] = useState({
    body: "",
    createsTask: false,
    date: "2026-07-04",
    hours: "1",
    owner: "Matias",
    projectId: "",
    title: "",
    type: "Reunion" as (typeof noveltyTypes)[number]
  });

  useEffect(() => {
    const storedProjects = readLocal<Project[]>(localKeys.projects, []);
    const storedClients = readLocal<Client[]>(localKeys.clients, []);
    setLocalProjects(storedProjects);
    setLocalClients(storedClients);
    setDraft((current) => ({ ...current, projectId: [...projects, ...storedProjects][0]?.id ?? "" }));
  }, []);

  const allProjects = useMemo(() => [...projects, ...localProjects], [localProjects]);
  const allClients = useMemo(() => [...clients, ...localClients], [localClients]);

  function saveNovelty() {
    if (!draft.projectId || !draft.title.trim() || !draft.body.trim()) return;

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

    if (["Relevamiento", "Decision", "Pedido cliente", "Bloqueo", "Cambio de alcance", "Nota", "Reunion"].includes(draft.type)) {
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

    router.push(`/proyectos/${draft.projectId}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Carga rapida"
        title="Registrar una novedad sin perder el hilo."
        description="Sirve para reuniones, decisiones, pedidos, entregas o relevamientos rapidos vinculados a un proyecto."
      />

      <section className="panel-block form-shell">
        <div className="block-heading">
          <span className="eyebrow">Nueva novedad</span>
          <span>Impacta en trazabilidad</span>
        </div>

        <div className="field-grid form-grid-wide">
          <label className="field">
            <span>Proyecto</span>
            <select value={draft.projectId} onChange={(event) => setDraft((current) => ({ ...current, projectId: event.target.value }))}>
              {allProjects.map((project) => {
                const client = allClients.find((item) => item.id === project.clientId);
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
            <input value={draft.owner} onChange={(event) => setDraft((current) => ({ ...current, owner: event.target.value }))} />
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
          <textarea value={draft.body} onChange={(event) => setDraft((current) => ({ ...current, body: event.target.value }))} />
        </label>

        <button className="command-button form-submit" type="button" onClick={saveNovelty}>Guardar novedad</button>
      </section>
    </>
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
