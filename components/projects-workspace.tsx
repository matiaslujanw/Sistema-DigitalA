"use client";

import Link from "next/link";
import type { Route } from "next";
import { useEffect, useMemo, useState } from "react";
import { PageHeader, StatusPill } from "@/components/ui";
import { clients, events, projectPayments, projects } from "@/lib/mock-data";
import { dateLabel, daysBetween, money } from "@/lib/format";
import { localKeys } from "@/lib/local-keys";
import type { Client, Project, ProjectEvent, ProjectPayment } from "@/lib/types";

type StoredProject = Project & { payments?: ProjectPayment[] };

export function ProjectsWorkspace() {
  const [localProjects, setLocalProjects] = useState<Project[]>([]);
  const [localClients, setLocalClients] = useState<Client[]>([]);
  const [localEvents, setLocalEvents] = useState<ProjectEvent[]>([]);

  useEffect(() => {
    setLocalProjects(readLocal<Project[]>(localKeys.projects, []));
    setLocalClients(readLocal<Client[]>(localKeys.clients, []));
    setLocalEvents(readLocal<ProjectEvent[]>(localKeys.events, []));
  }, []);

  const allClients = useMemo(() => [...clients, ...localClients], [localClients]);
  const allProjects = useMemo(() => {
    const merged = [...projects, ...localProjects];
    return merged.map((project) => {
      const saved = readLocal<StoredProject | null>(`da-project-${project.id}`, null);
      return saved ? { ...project, ...saved } : project;
    });
  }, [localProjects]);
  const allEvents = useMemo(() => [...events, ...localEvents].sort((a, b) => b.date.localeCompare(a.date)), [localEvents]);

  return (
    <>
      <PageHeader
        eyebrow="Delivery room"
        title="Proyectos, hitos y tiempos trazados."
        description="Aca vive el seguimiento de cada cliente: estado, precio, cobros, responsables y eventos relevantes."
        action="Nuevo proyecto"
        actionHref="/proyectos/nuevo"
      />

      <section className="route-grid projects-layout">
        <div className="panel-block projects-board">
          <div className="block-heading">
            <span className="eyebrow">Pipeline comercial</span>
            <span>{allProjects.length} proyectos</span>
          </div>
          <div className="project-list">
            {allProjects.map((project) => {
              const client = allClients.find((item) => item.id === project.clientId);
              const saved = readLocal<StoredProject | null>(`da-project-${project.id}`, null);
              const savedPayments = saved?.payments ?? [];
              const payments = savedPayments.length > 0 ? savedPayments : projectPayments.filter((payment) => payment.projectId === project.id);
              const paidAmount = payments
                .filter((payment) => payment.currency === project.currency)
                .reduce((sum, payment) => sum + payment.amount, 0);
              const paidPercent = project.salePrice > 0 ? Math.round((paidAmount / project.salePrice) * 100) : 0;

              return (
                <Link className="project-card project-link-card" href={`/proyectos/${project.id}` as Route} key={project.id}>
                  <div>
                    <StatusPill status={project.status} />
                    <strong>{project.name}</strong>
                    <span>{client?.name ?? "Cliente local"} · {client?.industry ?? "Sin rubro"}</span>
                  </div>
                  <div className="project-money">
                    <span>{money(project.salePrice, project.currency)}</span>
                    <strong>{paidPercent}% cobrado</strong>
                    <small>{project.contractSigned ? "Contrato firmado" : "Sin contrato"}</small>
                  </div>
                  <div className="progress-track">
                    <span style={{ width: `${Math.min(100, paidPercent)}%` }} />
                  </div>
                  <footer>
                    <span>{project.nextMilestone}</span>
                    <small>{project.partners.join(", ")}</small>
                  </footer>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="panel-block trace-board">
          <div className="block-heading">
            <span className="eyebrow">Trazabilidad</span>
            <span>{allEvents.length} eventos</span>
          </div>
          <div className="event-stack">
            {allEvents.map((event) => {
              const project = allProjects.find((item) => item.id === event.projectId);
              const previousEvent = allEvents
                .filter((item) => item.projectId === event.projectId && item.date < event.date)
                .sort((a, b) => b.date.localeCompare(a.date))[0];
              const daysFromPrevious = previousEvent ? daysBetween(previousEvent.date, event.date) : 0;

              return (
                <article className="event-line expanded" key={event.id}>
                  <span>{event.type} · {dateLabel(event.date)}</span>
                  <strong>{event.title}</strong>
                  <p>{event.notes}</p>
                  <small>
                    {project?.name ?? "Proyecto local"} · {event.owner} · {event.hours} h
                    {previousEvent ? ` · ${daysFromPrevious} dias desde el evento anterior` : ""}
                  </small>
                </article>
              );
            })}
          </div>
        </div>
      </section>
    </>
  );
}

function readLocal<T>(key: string, fallback: T): T {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}
