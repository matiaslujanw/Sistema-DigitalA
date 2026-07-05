"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addProjectEventAction } from "@/app/actions/projects";
import { dateLabel } from "@/lib/format";
import type { Client, Project, ProjectEvent } from "@/lib/types";

const eventTypes: ProjectEvent["type"][] = [
  "Reunion",
  "Entrega",
  "Feature",
  "Implementacion",
  "Decision",
  "Relevamiento",
  "Nota",
  "Pedido cliente",
  "Bloqueo",
  "Cambio de alcance"
];

export function CronogramaWorkspace({
  clients,
  events: initialEvents,
  projects,
  source
}: {
  clients: Client[];
  events: ProjectEvent[];
  projects: Project[];
  source: "mock" | "supabase";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [events, setEvents] = useState<ProjectEvent[]>(initialEvents);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [typeFilter, setTypeFilter] = useState<"Todos" | ProjectEvent["type"]>("Todos");
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState({
    date: today,
    hours: "1",
    notes: "",
    owner: "",
    title: "",
    type: "Reunion" as ProjectEvent["type"]
  });

  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const selectedClient = selectedProject ? clients.find((client) => client.id === selectedProject.clientId) : null;
  const selectedProjectKey = selectedProject?.id ?? "";

  const projectEvents = useMemo(
    () =>
      events
        .filter((event) => event.projectId === selectedProjectKey)
        .sort((a, b) => b.date.localeCompare(a.date)),
    [events, selectedProjectKey]
  );
  const timeline = useMemo(
    () => (typeFilter === "Todos" ? projectEvents : projectEvents.filter((event) => event.type === typeFilter)),
    [projectEvents, typeFilter]
  );

  const summary = useMemo(() => {
    const hours = projectEvents.reduce((sum, event) => sum + event.hours, 0);
    const blocks = projectEvents.filter((event) => event.type === "Bloqueo").length;
    const deliveries = projectEvents.filter((event) => event.type === "Entrega" || event.type === "Implementacion").length;
    return { blocks, deliveries, hours, total: projectEvents.length };
  }, [projectEvents]);

  function saveEvent() {
    if (!draft.title.trim() || !selectedProjectKey) return;

    const event: ProjectEvent = {
      id: `local-event-${Date.now()}`,
      projectId: selectedProjectKey,
      type: draft.type,
      title: draft.title.trim(),
      date: draft.date,
      hours: Number(draft.hours) || 0,
      owner: draft.owner.trim() || "Sin responsable",
      notes: draft.notes.trim()
    };

    if (source !== "supabase") {
      setEvents((current) => [event, ...current]);
      resetDraft();
      return;
    }

    startTransition(async () => {
      try {
        await addProjectEventAction({
          date: event.date,
          hours: event.hours,
          notes: event.notes,
          owner: event.owner,
          projectId: event.projectId,
          title: event.title,
          type: event.type
        });
        setEvents((current) => [event, ...current]);
        resetDraft();
        setFeedback("Evento guardado en Supabase");
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo guardar el evento");
      }
    });
  }

  function resetDraft() {
    setDraft((current) => ({ ...current, hours: "1", notes: "", title: "" }));
    setShowForm(false);
  }

  if (!selectedProject) {
    return (
      <section className="schedule-page">
        <header className="schedule-header">
          <div>
            <h1>Trazabilidad de Proyecto</h1>
            <p>Seguimiento cronologico de hitos, decisiones y flujos operativos por proyecto.</p>
          </div>
        </header>
        <div className="panel-empty">
          <strong>Todavia no hay proyectos para trazar.</strong>
        </div>
      </section>
    );
  }

  return (
    <section className="schedule-page">
      <header className="schedule-header">
        <div>
          <h1>Trazabilidad de Proyecto</h1>
          <p>Seguimiento cronologico exhaustivo de hitos, decisiones y flujos operativos por proyecto.</p>
        </div>
        <div className="schedule-actions">
          <select aria-label="Filtrar eventos" value={typeFilter} onChange={(event) => setTypeFilter(event.target.value as typeof typeFilter)}>
            <option value="Todos">Todos los eventos</option>
            {eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
          </select>
          <button type="button" onClick={() => setShowForm((current) => !current)}>Nuevo evento</button>
        </div>
      </header>

      {showForm ? (
        <article className="finance-drawer">
          <header>
            <span className="eyebrow">Nuevo evento en {selectedProject.name}</span>
            <strong>{feedback ?? (source === "supabase" ? "Conectado a Supabase" : "Modo local")}</strong>
          </header>
          <div className="finance-form compact">
            <div className="field-grid">
              <label className="field">
                <span>Tipo</span>
                <select value={draft.type} onChange={(event) => setDraft((current) => ({ ...current, type: event.target.value as ProjectEvent["type"] }))}>
                  {eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Fecha</span>
                <input type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} />
              </label>
              <label className="field">
                <span>Horas</span>
                <input min="0" step="0.5" type="number" value={draft.hours} onChange={(event) => setDraft((current) => ({ ...current, hours: event.target.value }))} />
              </label>
              <label className="field">
                <span>Responsable</span>
                <input value={draft.owner} onChange={(event) => setDraft((current) => ({ ...current, owner: event.target.value }))} />
              </label>
            </div>
            <label className="field">
              <span>Titulo</span>
              <input placeholder="Ej: entrega parcial del modulo de stock" value={draft.title} onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="field">
              <span>Notas</span>
              <textarea rows={3} value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
            </label>
            <div className="quick-note-actions">
              <button className="command-primary" disabled={isPending} type="button" onClick={saveEvent}>
                {isPending ? "Guardando…" : "Guardar evento"}
              </button>
              <button className="ghost-button" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        </article>
      ) : null}

      <section className="schedule-layout">
        <aside className="project-selector-panel">
          <span className="eyebrow">Proyectos</span>
          <div className="schedule-project-list">
            {projects.map((project) => {
              const client = clients.find((item) => item.id === project.clientId);
              return (
                <button
                  className={project.id === selectedProject.id ? "active" : ""}
                  key={project.id}
                  type="button"
                  onClick={() => setSelectedProjectId(project.id)}
                >
                  <strong>{project.name}</strong>
                  <span>{client?.name ?? "Cliente"} · {project.status}</span>
                </button>
              );
            })}
          </div>
        </aside>

        <main className="timeline-panel">
          <div className="timeline-heading">
            <div>
              <span className="eyebrow">{selectedClient?.name ?? "Cliente"} · {selectedProject.status}</span>
              <h2>{selectedProject.name}</h2>
            </div>
            <span>Hoy · {dateLabel(today)}</span>
          </div>

          <div className="vertical-timeline">
            {timeline.map((event) => (
              <article className="timeline-entry" key={event.id}>
                <div className={`timeline-node node-${event.type.toLowerCase().replaceAll(" ", "-")}`}>
                  <span>{iconForEvent(event.type)}</span>
                </div>
                <div className="timeline-card">
                  <div className="timeline-card-header">
                    <span>{event.type}</span>
                    <small>{dateLabel(event.date)}</small>
                  </div>
                  <strong>{event.title}</strong>
                  <p>{event.notes}</p>
                  <div className="timeline-meta">
                    <span>Asignado a: {event.owner}</span>
                    <span>{event.hours} h registradas</span>
                  </div>
                </div>
              </article>
            ))}
            {timeline.length === 0 ? (
              <div className="panel-empty">
                <strong>{typeFilter === "Todos" ? "Este proyecto todavia no tiene eventos." : `Sin eventos de tipo ${typeFilter}.`}</strong>
                <span>Registra el primero con “Nuevo evento”.</span>
              </div>
            ) : null}
          </div>

          <div className="schedule-summary">
            <div>
              <span>Eventos registrados</span>
              <strong>{summary.total}</strong>
            </div>
            <div>
              <span>Horas registradas</span>
              <strong>{Math.round(summary.hours * 10) / 10} hs</strong>
            </div>
            <div>
              <span>Entregas / implementaciones</span>
              <strong>{summary.deliveries}</strong>
            </div>
            <div>
              <span>Bloqueos</span>
              <strong>{summary.blocks}</strong>
            </div>
          </div>
        </main>
      </section>
    </section>
  );
}

function iconForEvent(type: string) {
  if (type === "Reunion") return "R";
  if (type === "Entrega") return "$";
  if (type === "Implementacion") return "D";
  if (type === "Decision") return "OK";
  if (type === "Feature") return "F";
  if (type === "Bloqueo") return "!";
  return "-";
}
