"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addProjectEventAction } from "@/app/actions/projects";
import { dateLabel } from "@/lib/format";
import type { Project, ProjectEvent } from "@/lib/types";

export function MeetingsWorkspace({
  initialMeetings,
  partnerNames,
  projects,
  source
}: {
  initialMeetings: ProjectEvent[];
  partnerNames: string[];
  projects: Project[];
  source: "mock" | "supabase";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [meetings, setMeetings] = useState<ProjectEvent[]>(initialMeetings);
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [draft, setDraft] = useState({
    date: today,
    hours: "1",
    notes: "",
    owner: partnerNames[0] ?? "",
    projectId: projects[0]?.id ?? "",
    title: ""
  });

  const projectNameById = useMemo(() => new Map(projects.map((project) => [project.id, project.name])), [projects]);
  const sortedMeetings = useMemo(() => [...meetings].sort((a, b) => b.date.localeCompare(a.date)), [meetings]);

  const metrics = useMemo(() => {
    const currentMonth = today.slice(0, 7);
    const thisMonth = meetings.filter((meeting) => meeting.date.startsWith(currentMonth));
    const hours = meetings.reduce((sum, meeting) => sum + meeting.hours, 0);
    const upcoming = meetings.filter((meeting) => meeting.date >= today).sort((a, b) => a.date.localeCompare(b.date));
    const projectsWithRecent = new Set(
      meetings.filter((meeting) => daysAgo(meeting.date, today) <= 30).map((meeting) => meeting.projectId)
    ).size;

    return {
      hours,
      nextMeeting: upcoming[0] ?? null,
      projectsWithRecent,
      thisMonth: thisMonth.length
    };
  }, [meetings, today]);

  function saveMeeting() {
    if (!draft.title.trim() || !draft.projectId) return;

    const meeting: ProjectEvent = {
      id: `local-meeting-${Date.now()}`,
      projectId: draft.projectId,
      type: "Reunion",
      title: draft.title.trim(),
      date: draft.date,
      hours: Number(draft.hours) || 0,
      owner: draft.owner.trim() || "Sin responsable",
      notes: draft.notes.trim()
    };

    if (source !== "supabase") {
      setMeetings((current) => [meeting, ...current]);
      resetDraft();
      return;
    }

    startTransition(async () => {
      try {
        await addProjectEventAction({
          date: meeting.date,
          hours: meeting.hours,
          notes: meeting.notes,
          owner: meeting.owner,
          projectId: meeting.projectId,
          title: meeting.title,
          type: "Reunion"
        });
        setMeetings((current) => [meeting, ...current]);
        resetDraft();
        setFeedback("Reunion guardada en Supabase");
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo guardar la reunion");
      }
    });
  }

  function resetDraft() {
    setDraft((current) => ({ ...current, hours: "1", notes: "", title: "" }));
    setShowForm(false);
  }

  return (
    <section className="executive-page meetings-command">
      <header className="command-header">
        <div>
          <h1>Agenda y Reuniones</h1>
          <p>Registro de reuniones, minutas y acuerdos vinculados a cada proyecto.</p>
        </div>
        <div className="finance-actions">
          <button className="command-primary" type="button" onClick={() => setShowForm((current) => !current)}>
            + Nueva reunion
          </button>
        </div>
      </header>

      {showForm ? (
        <article className="finance-drawer">
          <header>
            <span className="eyebrow">Nueva reunion</span>
            <strong>{feedback ?? (source === "supabase" ? "Conectado a Supabase" : "Modo local")}</strong>
          </header>
          <div className="finance-form compact">
            <label className="field">
              <span>Titulo</span>
              <input
                placeholder="Ej: kickoff, seguimiento semanal, demo MVP"
                value={draft.title}
                onChange={(event) => setDraft((current) => ({ ...current, title: event.target.value }))}
              />
            </label>
            <div className="field-grid">
              <label className="field">
                <span>Fecha</span>
                <input type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} />
              </label>
              <label className="field">
                <span>Proyecto</span>
                <select value={draft.projectId} onChange={(event) => setDraft((current) => ({ ...current, projectId: event.target.value }))}>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Responsable</span>
                <input
                  list="meeting-partners"
                  value={draft.owner}
                  onChange={(event) => setDraft((current) => ({ ...current, owner: event.target.value }))}
                />
                <datalist id="meeting-partners">
                  {partnerNames.map((name) => <option key={name} value={name} />)}
                </datalist>
              </label>
              <label className="field">
                <span>Horas</span>
                <input min="0" step="0.5" type="number" value={draft.hours} onChange={(event) => setDraft((current) => ({ ...current, hours: event.target.value }))} />
              </label>
            </div>
            <label className="field">
              <span>Minuta / acuerdos</span>
              <textarea
                placeholder="Que se hablo, que se decidio, que quedo pendiente..."
                rows={4}
                value={draft.notes}
                onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))}
              />
            </label>
            <div className="quick-note-actions">
              <button className="command-primary" disabled={isPending} type="button" onClick={saveMeeting}>
                {isPending ? "Guardando…" : "Guardar reunion"}
              </button>
              <button className="ghost-button" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        </article>
      ) : null}

      <section className="ops-kpis">
        <article className="ops-kpi">
          <span>Reuniones este mes</span>
          <strong>{metrics.thisMonth}</strong>
        </article>
        <article className="ops-kpi">
          <span>Horas en reuniones</span>
          <strong>{Math.round(metrics.hours * 10) / 10} hs</strong>
        </article>
        <article className="ops-kpi">
          <span>Proyectos con reunion (30d)</span>
          <strong>{metrics.projectsWithRecent}</strong>
        </article>
        <article className="ops-kpi">
          <span>Proxima reunion</span>
          <strong>{metrics.nextMeeting ? dateLabel(metrics.nextMeeting.date) : "—"}</strong>
        </article>
      </section>

      <section className="meetings-ledger" aria-label="Historial de reuniones">
        {sortedMeetings.length > 0 ? (
          sortedMeetings.map((meeting) => {
            const meetingDate = new Date(`${meeting.date}T12:00:00`);
            const expanded = expandedId === meeting.id;
            return (
              <article className={`meeting-row ${expanded ? "expanded" : ""}`} key={meeting.id}>
                <button className="meeting-row-main" type="button" onClick={() => setExpandedId(expanded ? null : meeting.id)}>
                  <div className="meeting-date-block">
                    <span>{meetingDate.toLocaleDateString("es-AR", { month: "short" }).replace(".", "").toUpperCase()}</span>
                    <strong>{meetingDate.getDate()}</strong>
                  </div>
                  <div className="meeting-row-copy">
                    <strong>{meeting.title}</strong>
                    <span>{projectNameById.get(meeting.projectId) ?? "Sin proyecto"} · {meeting.owner}</span>
                  </div>
                  <div className="meeting-row-meta">
                    <span>{meeting.hours} hs</span>
                    <small>{meeting.notes ? (expanded ? "Ocultar minuta" : "Ver minuta") : "Sin minuta"}</small>
                  </div>
                </button>
                {expanded && meeting.notes ? <p className="meeting-minutes">{meeting.notes}</p> : null}
              </article>
            );
          })
        ) : (
          <div className="panel-empty">
            <strong>Todavia no hay reuniones registradas.</strong>
            <span>Carga la primera con “+ Nueva reunion”.</span>
          </div>
        )}
      </section>
    </section>
  );
}

function daysAgo(from: string, to: string) {
  return Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / 86400000);
}
