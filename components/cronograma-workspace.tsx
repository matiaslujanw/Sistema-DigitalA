"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addProjectEventAction, deleteProjectEventAction, deleteProjectNoteAction, deleteProjectPaymentAction } from "@/app/actions/projects";
import { dateLabel, money } from "@/lib/format";
import type { Client, Project, ProjectEvent, ProjectNote, ProjectPayment } from "@/lib/types";

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

const timelineFilters = ["Todos", "Evento", "Reunion", "Nota", "Pago"] as const;
type TimelineFilter = (typeof timelineFilters)[number];

type TimelineItem = {
  amount?: number;
  currency?: ProjectPayment["currency"];
  date: string;
  detail: string;
  hours?: number;
  id: string;
  kind: "Evento" | "Nota" | "Pago";
  method?: ProjectPayment["method"];
  owner?: string;
  projectId: string;
  rawId: string;
  sourceType: string;
  title: string;
};

export function CronogramaWorkspace({
  clients,
  events: initialEvents,
  notes,
  payments,
  projects,
  source
}: {
  clients: Client[];
  events: ProjectEvent[];
  notes: ProjectNote[];
  payments: ProjectPayment[];
  projects: Project[];
  source: "mock" | "supabase";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [events, setEvents] = useState<ProjectEvent[]>(initialEvents);
  const [timelineNotes, setTimelineNotes] = useState<ProjectNote[]>(notes);
  const [timelinePayments, setTimelinePayments] = useState<ProjectPayment[]>(payments);
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const [typeFilter, setTypeFilter] = useState<TimelineFilter>("Todos");
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
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
  const projectNotes = useMemo(
    () => timelineNotes.filter((note) => note.projectId === selectedProjectKey),
    [timelineNotes, selectedProjectKey]
  );
  const projectPayments = useMemo(
    () => timelinePayments.filter((payment) => payment.projectId === selectedProjectKey),
    [timelinePayments, selectedProjectKey]
  );
  const timeline = useMemo(() => {
    const mirroredNoteKeys = new Set(projectNotes.map((note) => timelineMirrorKey(note.projectId, note.date, note.title, note.body)));
    const eventItems = projectEvents
      .filter((event) => !mirroredNoteKeys.has(timelineMirrorKey(event.projectId, event.date, event.title, event.notes)))
      .map<TimelineItem>((event) => ({
        date: event.date,
        detail: event.notes || "Sin detalle cargado.",
        hours: event.hours,
        id: `event-${event.id}`,
        kind: "Evento",
        owner: event.owner,
        projectId: event.projectId,
        rawId: event.id,
        sourceType: event.type,
        title: event.title
      }));
    const noteItems = projectNotes.map<TimelineItem>((note) => ({
      date: note.date,
      detail: note.body || "Sin detalle cargado.",
      id: `note-${note.id}`,
      kind: "Nota",
      owner: note.owner,
      projectId: note.projectId,
      rawId: note.id,
      sourceType: note.type,
      title: note.title
    }));
    const paymentItems = projectPayments.map<TimelineItem>((payment) => ({
      amount: payment.amount,
      currency: payment.currency,
      date: payment.date,
      detail: payment.note || "Pago registrado.",
      id: `payment-${payment.id}`,
      kind: "Pago",
      method: payment.method,
      projectId: payment.projectId,
      rawId: payment.id,
      sourceType: "Pago",
      title: money(payment.amount, payment.currency)
    }));
    const allItems = [...eventItems, ...noteItems, ...paymentItems].sort((a, b) => {
      const dateOrder = b.date.localeCompare(a.date);
      if (dateOrder !== 0) return dateOrder;
      return timelineKindOrder(a.kind) - timelineKindOrder(b.kind);
    });

    if (typeFilter === "Todos") return allItems;
    if (typeFilter === "Reunion") return allItems.filter((item) => item.sourceType === "Reunion");
    return allItems.filter((item) => item.kind === typeFilter);
  }, [projectEvents, projectNotes, projectPayments, typeFilter]);

  const summary = useMemo(() => {
    const hours = projectEvents.reduce((sum, event) => sum + event.hours, 0);
    return { hours, notes: projectNotes.length, payments: projectPayments.length, total: timeline.length };
  }, [projectEvents, projectNotes.length, projectPayments.length, timeline.length]);

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
        const newId = await addProjectEventAction({
          date: event.date,
          hours: event.hours,
          notes: event.notes,
          owner: event.owner,
          projectId: event.projectId,
          title: event.title,
          type: event.type
        });
        setEvents((current) => [{ ...event, id: newId }, ...current]);
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

  function deleteTimelineItem(item: TimelineItem) {
    if (confirmingDeleteId !== item.id) {
      setConfirmingDeleteId(item.id);
      return;
    }

    const removeLocally = () => {
      if (item.kind === "Evento") setEvents((current) => current.filter((event) => event.id !== item.rawId));
      if (item.kind === "Nota") setTimelineNotes((current) => current.filter((note) => note.id !== item.rawId));
      if (item.kind === "Pago") setTimelinePayments((current) => current.filter((payment) => payment.id !== item.rawId));
      setConfirmingDeleteId(null);
    };

    if (source !== "supabase") {
      removeLocally();
      return;
    }

    startTransition(async () => {
      try {
        if (item.kind === "Evento") await deleteProjectEventAction(item.rawId);
        if (item.kind === "Nota") await deleteProjectNoteAction(item.rawId);
        if (item.kind === "Pago") await deleteProjectPaymentAction(item.rawId);
        removeLocally();
        setFeedback(`${item.kind} eliminado`);
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo borrar la entrada");
      }
    });
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
            {timelineFilters.map((filter) => (
              <option key={filter} value={filter}>
                {filter === "Todos" ? "Toda la linea" : filter === "Reunion" ? "Reuniones" : `${filter}s`}
              </option>
            ))}
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
            {timeline.map((item) => (
              <article className={`timeline-entry timeline-entry-${item.kind.toLowerCase()}`} key={item.id}>
                <div className={`timeline-node node-${timelineNodeClass(item)}`}>
                  <span>{iconForTimelineItem(item)}</span>
                </div>
                <div className="timeline-card">
                  <div className="timeline-card-header">
                    <span>{item.kind} · {item.sourceType}</span>
                    <small>{dateLabel(item.date)}</small>
                  </div>
                  <strong>{item.title}</strong>
                  <p>{item.detail}</p>
                  <div className="timeline-meta">
                    {item.owner ? <span>Responsable: {item.owner}</span> : null}
                    {item.hours !== undefined ? <span>{item.hours} h registradas</span> : null}
                    {item.method ? <span>Metodo: {item.method}</span> : null}
                    {item.amount !== undefined && item.currency ? <span>Monto: {money(item.amount, item.currency)}</span> : null}
                  </div>
                  <div className="timeline-actions">
                    <button className={confirmingDeleteId === item.id ? "danger-confirm" : ""} disabled={isPending} type="button" onClick={() => deleteTimelineItem(item)}>
                      {confirmingDeleteId === item.id ? "Confirmar borrado" : "Borrar"}
                    </button>
                    {confirmingDeleteId === item.id ? <button type="button" onClick={() => setConfirmingDeleteId(null)}>Cancelar</button> : null}
                  </div>
                </div>
              </article>
            ))}
            {timeline.length === 0 ? (
              <div className="panel-empty">
                <strong>{typeFilter === "Todos" ? "Este proyecto todavia no tiene movimientos." : `Sin entradas de tipo ${typeFilter}.`}</strong>
                <span>Registra el primero con “Nuevo evento”.</span>
              </div>
            ) : null}
          </div>

          <div className="schedule-summary">
            <div>
              <span>Entradas visibles</span>
              <strong>{summary.total}</strong>
            </div>
            <div>
              <span>Horas registradas</span>
              <strong>{Math.round(summary.hours * 10) / 10} hs</strong>
            </div>
            <div>
              <span>Notas</span>
              <strong>{summary.notes}</strong>
            </div>
            <div>
              <span>Pagos</span>
              <strong>{summary.payments}</strong>
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

function iconForTimelineItem(item: TimelineItem) {
  if (item.kind === "Pago") return "$";
  if (item.kind === "Nota") return "N";
  return iconForEvent(item.sourceType);
}

function timelineNodeClass(item: TimelineItem) {
  if (item.kind === "Pago") return "pago";
  if (item.kind === "Nota") return "nota";
  return item.sourceType.toLowerCase().replaceAll(" ", "-");
}

function timelineKindOrder(kind: TimelineItem["kind"]) {
  if (kind === "Pago") return 0;
  if (kind === "Nota") return 1;
  return 2;
}

function timelineMirrorKey(projectId: string, date: string, title: string, detail: string) {
  return [projectId, date, normalizeTimelineText(title), normalizeTimelineText(detail)].join("|");
}

function normalizeTimelineText(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}
