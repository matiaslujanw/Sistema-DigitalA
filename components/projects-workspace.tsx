"use client";

import Link from "next/link";
import type { Route } from "next";
import { useMemo, useState } from "react";
import { money } from "@/lib/format";
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
  const [statusFilter, setStatusFilter] = useState("Todos");
  const [partnerFilter, setPartnerFilter] = useState("Todos");
  const partners = useMemo(() => Array.from(new Set(projects.flatMap((project) => project.partners))).sort(), [projects]);
  const enrichedProjects = useMemo(() => {
    return projects.map((project) => {
      const client = clients.find((item) => item.id === project.clientId);
      const projectPayments = payments.filter((payment) => payment.projectId === project.id);
      const paidAmount = projectPayments
        .filter((payment) => payment.currency === project.currency)
        .reduce((sum, payment) => sum + payment.amount, 0);
      const pendingAmount = Math.max(0, project.salePrice - paidAmount);
      const paidPercent = project.salePrice > 0 ? Math.min(100, Math.round((paidAmount / project.salePrice) * 100)) : 0;
      const projectEvents = events.filter((event) => event.projectId === project.id);
      const trackedHours = projectEvents.reduce((sum, event) => sum + event.hours, 0);

      return {
        client,
        paidAmount,
        paidPercent,
        pendingAmount,
        project,
        trackedHours
      };
    });
  }, [clients, events, payments, projects]);
  const filteredProjects = enrichedProjects.filter(({ project }) => {
    const matchesStatus = statusFilter === "Todos" || project.status === statusFilter;
    const matchesPartner = partnerFilter === "Todos" || project.partners.includes(partnerFilter);
    return matchesStatus && matchesPartner;
  });
  const activeProjects = projects.filter((project) => project.status !== "En uso");
  const arsSold = projects.filter((project) => project.currency === "ARS").reduce((sum, project) => sum + project.salePrice, 0);
  const usdSold = projects.filter((project) => project.currency === "USD").reduce((sum, project) => sum + project.salePrice, 0);
  const totalPending = enrichedProjects.reduce((sum, item) => sum + item.pendingAmount, 0);
  const avgMargin = activeProjects.length > 0 ? Math.round(activeProjects.reduce((sum, project) => sum + project.marginTarget, 0) / activeProjects.length) : 0;
  const riskProjects = projects.filter((project) => project.status === "Correcciones" || project.status === "Relevamiento").length;
  const trackedHours = events.reduce((sum, event) => sum + event.hours, 0);
  const deliveredProjects = projects.filter((project) => project.status === "En uso" || project.status === "MVP entregado").length;

  return (
    <section className="executive-page projects-command">
      <header className="command-header">
        <div>
          <h1>Proyectos en Curso</h1>
          <p>Visualizacion de rendimiento, cobranza y riesgos operativos.</p>
        </div>
        <div className="command-filters">
          <label>
            <span>Estado</span>
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="Todos">Todos</option>
              <option value="Relevamiento">Relevamiento</option>
              <option value="En desarrollo">En desarrollo</option>
              <option value="MVP armado">MVP armado</option>
              <option value="MVP entregado">MVP entregado</option>
              <option value="Correcciones">Correcciones</option>
              <option value="Implementacion">Implementacion</option>
              <option value="En uso">En uso</option>
            </select>
          </label>
          <label>
            <span>Socio</span>
            <select value={partnerFilter} onChange={(event) => setPartnerFilter(event.target.value)}>
              <option value="Todos">Todos</option>
              {partners.map((partner) => (
                <option value={partner} key={partner}>{partner}</option>
              ))}
            </select>
          </label>
          <Link className="command-primary" href={"/proyectos/nuevo" as Route}>+ Nuevo Proyecto</Link>
        </div>
      </header>

      <section className="project-command-kpis">
        <KpiCard label="Cartera total" value={`${money(arsSold)}${usdSold > 0 ? ` / ${money(usdSold, "USD")}` : ""}`} tone="green" />
        <KpiCard label="Cobros pendientes" value={money(totalPending)} tone="blue" />
        <KpiCard label="Margen promedio" value={`${avgMargin}%`} tone="blue" />
        <KpiCard label="Riesgo detectado" value={`${riskProjects} Proyectos`} tone="red" />
      </section>

      <section className="project-ledger">
        <div className="project-ledger-head">
          <span>Cliente / Proyecto</span>
          <span>Estado</span>
          <span>Socio</span>
          <span>Progreso</span>
          <span>Monto vendido</span>
          <span>Cobrado</span>
          <span>Pendiente</span>
          <span>Margen</span>
          <span>Entrega</span>
        </div>
        <div className="project-ledger-body">
          {filteredProjects.map(({ client, paidAmount, paidPercent, pendingAmount, project, trackedHours }, index) => (
            <Link className="project-ledger-row" href={`/proyectos/${project.id}` as Route} key={project.id}>
              <div className={`project-name-cell stripe-${riskTone(project.status, index)}`}>
                <strong>{project.name}</strong>
                <span>{client?.name ?? "Cliente"} · {client?.industry ?? "Sin rubro"}</span>
              </div>
              <div>
                <mark className={`project-state ${riskTone(project.status, index)}`}>{stateLabel(project.status)}</mark>
              </div>
              <div className="partner-cell">
                <span className="partner-dot" />
                <strong>{project.partners[0] ?? "Sin socio"}</strong>
              </div>
              <div className="progress-cell">
                <span>{paidPercent}%</span>
                <div className="table-progress"><i style={{ width: `${paidPercent}%` }} /></div>
              </div>
              <div className="money-cell">{money(project.salePrice, project.currency)}</div>
              <div className="money-cell paid">{money(paidAmount, project.currency)}</div>
              <div className={`money-cell ${pendingAmount > 0 ? "pending" : ""}`}>{money(pendingAmount, project.currency)}</div>
              <div className="margin-cell">{project.marginTarget}%</div>
              <div className="delivery-cell">
                <strong className={dueTone(project)}>{dueLabel(project)}</strong>
                <span>{trackedHours} h</span>
              </div>
            </Link>
          ))}
        </div>
        <footer className="project-ledger-footer">
          <span>Mostrando {filteredProjects.length} de {projects.length} proyectos · {source === "supabase" ? "Supabase" : "Mock"}</span>
          <div className="pager">
            <button type="button">{"<"}</button>
            <button className="active" type="button">1</button>
            <button type="button">2</button>
            <button type="button">{">"}</button>
          </div>
        </footer>
      </section>

      <section className="project-command-bottom">
        <article className="command-analysis-card">
          <header>
            <h2>Analisis de entrega</h2>
            <span>+12</span>
          </header>
          <div className="analysis-row">
            <span>Eficiencia de plazos</span>
            <strong>+12%</strong>
          </div>
          <div className="analysis-row">
            <span>Horas trazadas</span>
            <strong>{trackedHours} h</strong>
          </div>
          <div className="analysis-meter"><i style={{ width: `${Math.min(100, deliveredProjects * 24)}%` }} /></div>
        </article>

        <article className="command-analysis-card">
          <header>
            <h2>Resumen de cobranzas</h2>
            <span>ARS</span>
          </header>
          <div className="collection-grid">
            <div>
              <span>Recaudado</span>
              <strong>{money(enrichedProjects.reduce((sum, item) => sum + item.paidAmount, 0))}</strong>
            </div>
            <div>
              <span>Proyeccion</span>
              <strong>{money(totalPending)}</strong>
            </div>
          </div>
        </article>
      </section>
    </section>
  );
}

function KpiCard({ label, tone, value }: { label: string; tone: "blue" | "green" | "red"; value: string }) {
  return (
    <article className={`project-kpi ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function riskTone(status: Project["status"], index: number) {
  if (status === "Correcciones") return "critical";
  if (status === "Relevamiento") return "paused";
  if (status === "En uso") return "neutral";
  return index % 4 === 0 ? "blue" : "active";
}

function stateLabel(status: Project["status"]) {
  if (status === "En desarrollo") return "Activo";
  if (status === "Correcciones") return "Critico";
  if (status === "Relevamiento") return "En pausa";
  return status;
}

function remainingDays(dueDate: string) {
  const today = new Date().toISOString().slice(0, 10);
  return Math.round((new Date(`${dueDate}T12:00:00`).getTime() - new Date(`${today}T12:00:00`).getTime()) / 86400000);
}

function dueLabel(project: Project) {
  if (project.status === "En uso") return "Entregado";
  if (!project.dueDate) return "Sin fecha";
  const days = remainingDays(project.dueDate);
  if (days < 0) return `Vencido ${-days} d`;
  if (days === 0) return "Vence hoy";
  return `En ${days} d`;
}

function dueTone(project: Project) {
  if (project.status === "En uso" || !project.dueDate) return "";
  const days = remainingDays(project.dueDate);
  if (days < 0) return "danger-text";
  return days <= 7 ? "warn-text" : "";
}
