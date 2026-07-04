"use client";

import { useMemo, useState } from "react";
import { dateLabel } from "@/lib/format";
import type { Client, Project, ProjectEvent } from "@/lib/types";

const fallbackEvents = [
  {
    type: "Bloqueo",
    title: "Atraso en integracion de pasarela",
    notes: "Se detecto un bloqueo critico en la API de pagos internacionales. Riesgo estimado: 3 dias de desviacion.",
    date: "2026-07-04",
    owner: "Dev Team",
    hours: 2
  },
  {
    type: "Reunion",
    title: "Sincronizacion semanal ejecutiva",
    notes: "Revision de KPIs, alcance y presupuesto para infraestructura cloud.",
    date: "2026-07-03",
    owner: "Socios",
    hours: 1
  },
  {
    type: "Entrega",
    title: "Hito #2 - Desarrollo frontend",
    notes: "Entrega parcial confirmada por el cliente.",
    date: "2026-07-02",
    owner: "Delivery",
    hours: 6
  },
  {
    type: "Implementacion",
    title: "Lanzamiento beta interno",
    notes: "Despliegue exitoso en staging con mejoras de autenticacion.",
    date: "2026-07-01",
    owner: "Dev Team",
    hours: 4
  }
];

export function CronogramaWorkspace({
  clients,
  events,
  projects
}: {
  clients: Client[];
  events: ProjectEvent[];
  projects: Project[];
}) {
  const [selectedProjectId, setSelectedProjectId] = useState(projects[0]?.id ?? "");
  const selectedProject = projects.find((project) => project.id === selectedProjectId) ?? projects[0];
  const selectedClient = selectedProject ? clients.find((client) => client.id === selectedProject.clientId) : null;
  const selectedProjectKey = selectedProject?.id ?? "";
  const timeline = useMemo(() => {
    if (!selectedProjectKey) {
      return [];
    }

    const projectEvents = events
      .filter((event) => event.projectId === selectedProjectKey)
      .sort((a, b) => b.date.localeCompare(a.date));

    return projectEvents.length > 0 ? projectEvents : fallbackEvents.map((event, index) => ({ ...event, id: `fallback-${index}`, projectId: selectedProjectKey }));
  }, [events, selectedProjectKey]);

  if (!selectedProject) {
    return null;
  }

  return (
    <section className="schedule-page">
      <header className="schedule-header">
        <div>
          <h1>Trazabilidad de Proyecto</h1>
          <p>Seguimiento cronologico exhaustivo de hitos, decisiones y flujos operativos por proyecto.</p>
        </div>
        <div className="schedule-actions">
          <button type="button">Filtrar eventos</button>
          <button type="button">Nuevo evento</button>
        </div>
      </header>

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
            <span>Hoy · 04 Jul 2026</span>
          </div>

          <div className="vertical-timeline">
            {timeline.map((event, index) => (
              <article className="timeline-entry" key={event.id}>
                <div className={`timeline-node node-${event.type.toLowerCase().replaceAll(" ", "-")}`}>
                  <span>{iconForEvent(event.type)}</span>
                </div>
                <div className="timeline-card">
                  <div className="timeline-card-header">
                    <span>{event.type}</span>
                    <small>{index === 0 ? "11:20 AM" : dateLabel(event.date)}</small>
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
          </div>

          <div className="schedule-summary">
            <div>
              <span>Salud del cronograma</span>
              <strong>94% Optimo</strong>
            </div>
            <div>
              <span>Hitos completados</span>
              <strong>{Math.max(2, timeline.length)} / 15</strong>
            </div>
            <div>
              <span>Riesgos activos</span>
              <strong>02 Bloqueos</strong>
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
