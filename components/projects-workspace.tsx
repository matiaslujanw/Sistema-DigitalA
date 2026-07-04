"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo } from "react";
import { PageHeader, StatusPill } from "@/components/ui";
import { dateLabel, daysBetween, money } from "@/lib/format";
import type { Client, Project, ProjectEvent, ProjectPayment } from "@/lib/types";

export function ProjectsWorkspace({
  clients,
  events,
  payments,
  projects,
  source
}: {
  clients: Client[];
  events: ProjectEvent[];
  payments: ProjectPayment[];
  projects: Project[];
  source: "mock" | "supabase";
}) {
  const allEvents = useMemo(() => [...events].sort((a, b) => b.date.localeCompare(a.date)), [events]);

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
            <span>{projects.length} proyectos · {source === "supabase" ? "Supabase" : "Mock"}</span>
          </div>
          <div className="project-list">
            {projects.map((project) => {
              const client = clients.find((item) => item.id === project.clientId);
              const projectPayments = payments.filter((payment) => payment.projectId === project.id);
              const paidAmount = projectPayments
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
              const project = projects.find((item) => item.id === event.projectId);
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
