import Link from "next/link";
import { getAppData } from "@/lib/data";
import { money } from "@/lib/format";

export default async function DashboardPage() {
  const { clients, costs, events, payments: projectPayments, projects, source } = await getAppData();
  const totalSold = projects.filter((project) => project.currency === "ARS").reduce((sum, project) => sum + project.salePrice, 0);
  const totalPaid = projectPayments.filter((payment) => payment.currency === "ARS").reduce((sum, payment) => sum + payment.amount, 0);
  const pending = Math.max(0, totalSold - totalPaid);
  const monthlyCosts = costs.filter((cost) => cost.currency === "ARS" && cost.cadence === "Mensual").reduce((sum, cost) => sum + cost.amount, 0);
  const usdCash = projectPayments.filter((payment) => payment.currency === "USD").reduce((sum, payment) => sum + payment.amount, 0);
  const activeProjects = projects.filter((project) => project.status !== "En uso");
  const delayedProjects = projects.filter((project) => project.status === "Correcciones" || project.status === "En desarrollo").slice(0, 3);
  const recentEvents = [...events].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  return (
    <section className="executive-overview">
      <article className="executive-alert">
        <div className="alert-mark">!</div>
        <div>
          <strong>Decisiones financieras pendientes</strong>
          <span>Requiere aprobacion de distribucion para Q3 y ajuste de presupuesto en proyectos activos. Fuente: {source === "supabase" ? "Supabase" : "Mock"}</span>
        </div>
        <Link href="/finanzas">Revisar ahora</Link>
      </article>

      <section className="kpi-grid">
        <MetricCard label="Total vendido" value={money(totalSold)} note="+12% vs periodo anterior" tone="positive" />
        <MetricCard label="Total cobrado" value={money(totalPaid)} bar={68} />
        <MetricCard label="Pendiente de cobro" value={money(pending)} note="8 facturas" tone="warning" />
        <MetricCard label="Caja empresa" value={money(usdCash, "USD")} note="Reserva dolarizada" tone="blue" />
        <MetricCard label="Costos mensuales" value={money(monthlyCosts)} note="+2.4% vs mes anterior" tone="danger" />
        <MetricCard label="Margen estimado" value="38.4%" note="Eficiencia operativa optima" tone="positive" />
        <MetricCard label="Distribucion socios" value={money(310000)} note="Pendiente de validacion trimestral" />
      </section>

      <section className="overview-main-grid">
        <article className="executive-panel meetings-panel">
          <div className="panel-title-row">
            <h2>Proximas reuniones</h2>
            <span className="panel-icon panel-icon-calendar" />
          </div>
          <div className="meeting-list">
            <Meeting day="14" month="OCT" title="Comite ejecutivo - Q4 plan" detail="09:00 AM · Sala de conferencias A" />
            <Meeting day="15" month="OCT" title="Revision de margen: Cliente X" detail="11:30 AM · Video call" />
            <Meeting day="17" month="OCT" title="Pitch socios inversionistas" detail="03:00 PM · Private club" />
          </div>
        </article>

        <article className="executive-panel deliveries-panel">
          <div className="panel-title-row">
            <h2>Proximas entregas</h2>
            <span className="panel-icon panel-icon-delivery" />
          </div>
          <div className="delivery-list">
            {activeProjects.slice(0, 3).map((project, index) => (
              <Link className="delivery-card" href={`/proyectos/${project.id}`} key={project.id}>
                <div>
                  <strong>{project.nextMilestone}</strong>
                  <span>{project.name}</span>
                </div>
                <div>
                  <strong>{index === 0 ? "Manana" : `en ${index + 3} dias`}</strong>
                  <span>Hito {index + 2}/6</span>
                </div>
              </Link>
            ))}
          </div>
        </article>

        <article className="executive-panel delayed-panel">
          <div className="panel-title-row">
            <h2>Proyectos retrasados</h2>
            <span className="panel-icon panel-icon-warning" />
          </div>
          <div className="delayed-table">
            <div className="delayed-head">
              <span>Proyecto</span>
              <span>Responsable</span>
              <span>Desviacion</span>
              <span>Impacto</span>
              <span>Acciones</span>
            </div>
            {(delayedProjects.length ? delayedProjects : activeProjects.slice(0, 2)).map((project, index) => (
              <div className="delayed-row" key={project.id}>
                <strong>{project.name}</strong>
                <span>{project.partners[0]}</span>
                <span className="danger-text">+{index === 0 ? 14 : 5} dias</span>
                <span><mark>{index === 0 ? "Critico" : "Moderado"}</mark></span>
                <Link href={`/proyectos/${project.id}`}>Ver ticket</Link>
              </div>
            ))}
          </div>
        </article>
      </section>

      <aside className="overview-right-rail">
        <article className="global-status-card">
          <div className="map-surface" />
          <span>Global status</span>
          <strong>HQ - Madrid Hub</strong>
          <div className="status-line">
            <span>Estado de operaciones</span>
            <strong>Nominal</strong>
          </div>
          <div className="status-line">
            <span>Carga de trabajo equipo</span>
            <strong>82%</strong>
          </div>
          <div className="mini-progress"><span style={{ width: "82%" }} /></div>
        </article>

        <article className="executive-panel portfolio-health">
          <h2>Salud de portfolio</h2>
          <div className="status-line">
            <span>Proyectos activos ({activeProjects.length})</span>
            <strong>92% Health</strong>
          </div>
          <div className="health-bars">
            <span className="healthy" />
            <span className="warn" />
            <span className="risk" />
          </div>
          <button type="button">Generar reporte PDF</button>
        </article>

        <article className="executive-panel activity-card">
          <h2>Actividad reciente</h2>
          <div className="activity-list">
            {recentEvents.map((event) => {
              const project = projects.find((item) => item.id === event.projectId);
              const client = project ? clients.find((item) => item.id === project.clientId) : null;
              return (
                <div className="activity-item" key={event.id}>
                  <span>{event.type.slice(0, 1)}</span>
                  <div>
                    <strong>{event.title}</strong>
                    <small>{client?.name ?? project?.name} · hace {Math.max(1, Math.round(event.hours))} hs</small>
                  </div>
                </div>
              );
            })}
          </div>
        </article>
      </aside>
    </section>
  );
}

function MetricCard({
  bar,
  label,
  note,
  tone,
  value
}: {
  bar?: number;
  label: string;
  note?: string;
  tone?: "positive" | "warning" | "danger" | "blue";
  value: string;
}) {
  return (
    <article className={`metric-card-exec ${tone ? `tone-${tone}` : ""}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      {bar ? <div className="metric-bar"><i style={{ width: `${bar}%` }} /></div> : null}
      {note ? <small>{note}</small> : null}
    </article>
  );
}

function Meeting({ day, detail, month, title }: { day: string; detail: string; month: string; title: string }) {
  return (
    <div className="meeting-item">
      <div>
        <span>{month}</span>
        <strong>{day}</strong>
      </div>
      <div>
        <strong>{title}</strong>
        <span>{detail}</span>
      </div>
    </div>
  );
}
