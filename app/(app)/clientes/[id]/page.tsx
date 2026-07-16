import Link from "next/link";
import { getAppData } from "@/lib/data";
import { dateLabel, money } from "@/lib/format";
import { StatusPill } from "@/components/ui";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const data = await getAppData();
  const client = data.clients.find((item) => item.id === id) ?? null;

  if (!client) {
    return (
      <section className="panel-block missing-project">
        <span className="eyebrow">Cliente no encontrado</span>
        <strong>No encontramos este cliente en {data.source === "supabase" ? "Supabase" : "los mocks"}.</strong>
        <Link className="command-button" href="/clientes">Volver a clientes</Link>
      </section>
    );
  }

  const clientProjects = data.projects.filter((project) => project.clientId === client.id);
  const projectIds = new Set(clientProjects.map((project) => project.id));
  const clientPayments = data.payments.filter((payment) => projectIds.has(payment.projectId));
  const clientEvents = data.events
    .filter((event) => projectIds.has(event.projectId))
    .sort((a, b) => b.date.localeCompare(a.date));
  const clientCosts = data.costs.filter((cost) => cost.projectId && projectIds.has(cost.projectId));

  const soldArs = clientProjects.filter((p) => p.currency === "ARS").reduce((sum, p) => sum + p.salePrice, 0);
  const soldUsd = clientProjects.filter((p) => p.currency === "USD").reduce((sum, p) => sum + p.salePrice, 0);
  const paidArs = clientPayments.filter((p) => p.currency === "ARS").reduce((sum, p) => sum + p.amount, 0);
  const paidUsd = clientPayments.filter((p) => p.currency === "USD").reduce((sum, p) => sum + p.amount, 0);
  const costsArs = clientCosts.filter((c) => c.currency === "ARS").reduce((sum, c) => sum + c.amount, 0);
  const totalHours = clientEvents.reduce((sum, event) => sum + event.hours, 0);
  const meetings = clientEvents.filter((event) => event.type === "Reunion");

  return (
    <section className="executive-page client-detail-page">
      <header className="command-header">
        <div>
          <Link href="/clientes" className="back-link">← Clientes</Link>
          <h1>{client.name}</h1>
          <p>{client.industry} · Contacto: {client.contact}</p>
        </div>
      </header>

      <section className="ops-kpis">
        <article className="ops-kpi blue">
          <i aria-hidden="true" />
          <span>{clientProjects.filter((p) => p.status !== "En uso").length} en curso</span>
          <small>Proyectos</small>
          <strong>{clientProjects.length}</strong>
        </article>
        <article className="ops-kpi green">
          <i aria-hidden="true" />
          <span>{soldUsd > 0 ? `+ ${money(soldUsd, "USD")}` : "Historico"}</span>
          <small>Vendido</small>
          <strong>{money(soldArs)}</strong>
        </article>
        <article className="ops-kpi orange">
          <i aria-hidden="true" />
          <span>{soldUsd - paidUsd > 0 ? `+ ${money(soldUsd - paidUsd, "USD")}` : "Saldo total"}</span>
          <small>Pendiente de cobro</small>
          <strong>{money(Math.max(0, soldArs - paidArs))}</strong>
        </article>
        <article className="ops-kpi neutral">
          <i aria-hidden="true" />
          <span>{meetings.length} reuniones</span>
          <small>Horas invertidas</small>
          <strong>{Math.round(totalHours)} hs</strong>
        </article>
      </section>

      <section className="client-detail-grid">
        <article className="executive-panel client-projects-panel">
          <h2>Proyectos</h2>
          <div className="data-list">
            {clientProjects.map((project) => {
              const projectPaid = clientPayments
                .filter((payment) => payment.projectId === project.id && payment.currency === project.currency)
                .reduce((sum, payment) => sum + payment.amount, 0);
              const pendingAmount = Math.max(0, project.salePrice - projectPaid);
              return (
                <Link className="data-row client-project-row" href={`/proyectos/${project.id}`} key={project.id}>
                  <div>
                    <strong>{project.name}</strong>
                    <span>
                      Inicio {dateLabel(project.startDate)}
                      {project.dueDate ? ` · Entrega ${dateLabel(project.dueDate)}` : " · Sin fecha de entrega"}
                    </span>
                  </div>
                  <div>
                    <StatusPill status={project.status} />
                    <span>{pendingAmount > 0 ? `Pendiente ${money(pendingAmount, project.currency)}` : "Cobrado 100%"}</span>
                  </div>
                </Link>
              );
            })}
            {clientProjects.length === 0 ? (
              <div className="panel-empty">
                <strong>Este cliente todavia no tiene proyectos.</strong>
                <Link href="/proyectos/nuevo">Crear proyecto</Link>
              </div>
            ) : null}
          </div>
        </article>

        <aside className="client-detail-side">
          <article className="executive-panel">
            <h2>Relacion comercial</h2>
            <div className="settings-row">
              <span>Cobrado ARS</span>
              <strong>{money(paidArs)}</strong>
            </div>
            {paidUsd > 0 ? (
              <div className="settings-row">
                <span>Cobrado USD</span>
                <strong>{money(paidUsd, "USD")}</strong>
              </div>
            ) : null}
            <div className="settings-row">
              <span>Costos asociados (ARS)</span>
              <strong>{costsArs > 0 ? money(costsArs) : "—"}</strong>
            </div>
            <div className="settings-row">
              <span>Resultado (cobrado − costos)</span>
              <strong className={paidArs - costsArs >= 0 ? "settings-ok" : "danger-text"}>{money(paidArs - costsArs)}</strong>
            </div>
          </article>

          <article className="executive-panel activity-card">
            <h2>Actividad reciente</h2>
            <div className="activity-list">
              {clientEvents.slice(0, 5).map((event) => {
                const project = clientProjects.find((item) => item.id === event.projectId);
                return (
                  <div className="activity-item" key={event.id}>
                    <span>{event.type.slice(0, 1)}</span>
                    <div>
                      <strong>{event.title}</strong>
                      <small>{project?.name} · {dateLabel(event.date)}</small>
                    </div>
                  </div>
                );
              })}
              {clientEvents.length === 0 ? (
                <div className="panel-empty">
                  <strong>Sin actividad registrada.</strong>
                </div>
              ) : null}
            </div>
          </article>
        </aside>
      </section>
    </section>
  );
}
