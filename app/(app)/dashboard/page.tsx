import Link from "next/link";
import { getAppData } from "@/lib/data";
import { dateLabel, daysBetween, money } from "@/lib/format";

export default async function DashboardPage() {
  const { cashMovements, clients, costs, events, payments: projectPayments, projects, source } = await getAppData();
  const today = new Date().toISOString().slice(0, 10);

  const totalSold = projects.filter((project) => project.currency === "ARS").reduce((sum, project) => sum + project.salePrice, 0);
  const totalPaid = projectPayments.filter((payment) => payment.currency === "ARS").reduce((sum, payment) => sum + payment.amount, 0);
  const pending = Math.max(0, totalSold - totalPaid);
  const pendingProjects = projects.filter((project) => project.salePrice > project.paidAmount).length;
  const monthlyCosts = costs.filter((cost) => cost.currency === "ARS" && cost.cadence === "Mensual").reduce((sum, cost) => sum + cost.amount, 0);
  const usdCash = projectPayments.filter((payment) => payment.currency === "USD").reduce((sum, payment) => sum + payment.amount, 0);
  const activeProjects = projects.filter((project) => project.status !== "En uso");
  const collectedPercent = totalSold > 0 ? Math.min(100, Math.round((totalPaid / totalSold) * 100)) : 0;
  const avgMargin =
    activeProjects.length > 0
      ? Math.round(activeProjects.reduce((sum, project) => sum + project.marginTarget, 0) / activeProjects.length)
      : 0;
  const partnerDistribution = cashMovements
    .filter((movement) => movement.operation === "Reparto socios" && movement.currency === "ARS")
    .reduce((sum, movement) => sum + movement.amount, 0);
  const trackedHours = events.reduce((sum, event) => sum + event.hours, 0);

  // Reuniones reales: proximas primero; si no hay futuras, las ultimas registradas.
  const meetingEvents = events.filter((event) => event.type === "Reunion");
  const upcomingMeetings = meetingEvents.filter((event) => event.date >= today).sort((a, b) => a.date.localeCompare(b.date));
  const meetings = (upcomingMeetings.length > 0 ? upcomingMeetings : [...meetingEvents].sort((a, b) => b.date.localeCompare(a.date))).slice(0, 3);

  // Dias sin actividad por proyecto (hoy - ultimo evento registrado).
  const idleDaysByProject = new Map<string, number | null>(
    projects.map((project) => {
      const lastEvent = events
        .filter((event) => event.projectId === project.id)
        .reduce<string | null>((latest, event) => (latest === null || event.date > latest ? event.date : latest), null);
      return [project.id, lastEvent ? daysBetween(lastEvent, today) : null];
    })
  );
  const delayedProjects = activeProjects
    .map((project) => ({ idleDays: idleDaysByProject.get(project.id) ?? null, project }))
    .filter((item): item is { idleDays: number; project: (typeof activeProjects)[number] } => item.idleDays !== null && item.idleDays > 7)
    .sort((a, b) => b.idleDays - a.idleDays)
    .slice(0, 3);

  const riskProjects = projects.filter((project) => project.status === "Correcciones" || project.status === "Relevamiento").length;
  const healthPercent = activeProjects.length > 0 ? Math.round(((activeProjects.length - riskProjects) / activeProjects.length) * 100) : 100;
  const recentEvents = [...events].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 4);

  return (
    <section className="executive-overview">
      <section className="kpi-grid">
        <MetricCard label="Total vendido" value={money(totalSold)} note={`${projects.length} proyectos en cartera`} tone="positive" />
        <MetricCard label="Total cobrado" value={money(totalPaid)} bar={collectedPercent} note={`${collectedPercent}% de lo vendido`} />
        <MetricCard label="Pendiente de cobro" value={money(pending)} note={pendingProjects > 0 ? `${pendingProjects} proyectos con saldo` : "Sin saldos pendientes"} tone="warning" />
        <MetricCard label="Caja USD" value={money(usdCash, "USD")} note="Cobros dolarizados" tone="blue" />
        <MetricCard label="Costos mensuales" value={money(monthlyCosts)} note={`${costs.filter((cost) => cost.cadence === "Mensual").length} servicios recurrentes`} tone="danger" />
        <MetricCard label="Margen objetivo" value={`${avgMargin}%`} note={`Promedio de ${activeProjects.length} activos`} tone="positive" />
        <MetricCard label="Distribucion socios" value={money(partnerDistribution)} note={partnerDistribution > 0 ? "Acumulado repartido" : "Sin repartos registrados"} />
      </section>

      <section className="overview-main-grid">
        <article className="executive-panel meetings-panel">
          <div className="panel-title-row">
            <h2>{upcomingMeetings.length > 0 ? "Proximas reuniones" : "Ultimas reuniones"}</h2>
            <span className="panel-icon panel-icon-calendar" />
          </div>
          <div className="meeting-list">
            {meetings.length > 0 ? (
              meetings.map((meeting) => {
                const project = projects.find((item) => item.id === meeting.projectId);
                const meetingDate = new Date(`${meeting.date}T12:00:00`);
                return (
                  <div className="meeting-item" key={meeting.id}>
                    <div>
                      <span>{meetingDate.toLocaleDateString("es-AR", { month: "short" }).replace(".", "").toUpperCase()}</span>
                      <strong>{meetingDate.getDate()}</strong>
                    </div>
                    <div>
                      <strong>{meeting.title}</strong>
                      <span>{project?.name ?? "Sin proyecto"} · {meeting.owner}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="panel-empty">
                <strong>Sin reuniones registradas</strong>
                <Link href="/reuniones">Agendar la primera</Link>
              </div>
            )}
          </div>
        </article>

        <article className="executive-panel deliveries-panel">
          <div className="panel-title-row">
            <h2>Proximas entregas</h2>
            <span className="panel-icon panel-icon-delivery" />
          </div>
          <div className="delivery-list">
            {activeProjects.slice(0, 3).map((project) => {
              const idleDays = idleDaysByProject.get(project.id);
              return (
                <Link className="delivery-card" href={`/proyectos/${project.id}`} key={project.id}>
                  <div>
                    <strong>{project.nextMilestone}</strong>
                    <span>{project.name}</span>
                  </div>
                  <div>
                    <strong>{project.status}</strong>
                    <span>{idleDays === null || idleDays === undefined ? "Sin actividad" : idleDays === 0 ? "Actividad hoy" : `Hace ${idleDays} d`}</span>
                  </div>
                </Link>
              );
            })}
            {activeProjects.length === 0 ? (
              <div className="panel-empty">
                <strong>Sin proyectos activos</strong>
                <Link href="/proyectos/nuevo">Crear proyecto</Link>
              </div>
            ) : null}
          </div>
        </article>

        <article className="executive-panel delayed-panel">
          <div className="panel-title-row">
            <h2>Proyectos sin actividad</h2>
            <span className="panel-icon panel-icon-warning" />
          </div>
          {delayedProjects.length > 0 ? (
            <div className="delayed-table">
              <div className="delayed-head">
                <span>Proyecto</span>
                <span>Responsable</span>
                <span>Sin actividad</span>
                <span>Impacto</span>
                <span>Acciones</span>
              </div>
              {delayedProjects.map(({ idleDays, project }) => (
                <div className="delayed-row" key={project.id}>
                  <strong>{project.name}</strong>
                  <span>{project.partners[0] ?? "Sin asignar"}</span>
                  <span className="danger-text">{idleDays} dias</span>
                  <span><mark>{idleDays > 14 ? "Critico" : "Moderado"}</mark></span>
                  <Link href={`/proyectos/${project.id}`}>Ver proyecto</Link>
                </div>
              ))}
            </div>
          ) : (
            <div className="panel-empty">
              <strong>Todos los proyectos activos registraron actividad esta semana.</strong>
            </div>
          )}
        </article>
      </section>

      <aside className="overview-right-rail">
        <article className="global-status-card">
          <div className="map-surface" />
          <span>Estado del sistema</span>
          <strong>{source === "supabase" ? "Supabase conectado" : "Datos mock locales"}</strong>
          <div className="status-line">
            <span>Proyectos activos</span>
            <strong>{activeProjects.length}</strong>
          </div>
          <div className="status-line">
            <span>Horas registradas</span>
            <strong>{Math.round(trackedHours)} hs</strong>
          </div>
          <div className="mini-progress"><span style={{ width: `${Math.min(100, collectedPercent)}%` }} /></div>
        </article>

        <article className="executive-panel portfolio-health">
          <h2>Salud de portfolio</h2>
          <div className="status-line">
            <span>Proyectos activos ({activeProjects.length})</span>
            <strong>{healthPercent}% Health</strong>
          </div>
          <div className="health-bars">
            <span className="healthy" />
            <span className="warn" />
            <span className="risk" />
          </div>
          <div className="status-line">
            <span>En riesgo (relevamiento/correcciones)</span>
            <strong>{riskProjects}</strong>
          </div>
        </article>

        <article className="executive-panel activity-card">
          <h2>Actividad reciente</h2>
          <div className="activity-list">
            {recentEvents.length > 0 ? (
              recentEvents.map((event) => {
                const project = projects.find((item) => item.id === event.projectId);
                const client = project ? clients.find((item) => item.id === project.clientId) : null;
                return (
                  <div className="activity-item" key={event.id}>
                    <span>{event.type.slice(0, 1)}</span>
                    <div>
                      <strong>{event.title}</strong>
                      <small>{client?.name ?? project?.name ?? "Sin proyecto"} · {dateLabel(event.date)}</small>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="panel-empty">
                <strong>Sin actividad registrada</strong>
                <Link href="/novedades/nueva">Cargar novedad</Link>
              </div>
            )}
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
