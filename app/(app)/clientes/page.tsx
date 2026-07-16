import Link from "next/link";
import { getAppData } from "@/lib/data";
import { dateLabel, money } from "@/lib/format";

export default async function ClientsPage() {
  const data = await getAppData();

  const clientRows = data.clients.map((client) => {
    const clientProjects = data.projects.filter((project) => project.clientId === client.id);
    const projectIds = new Set(clientProjects.map((project) => project.id));
    const activeCount = clientProjects.filter((project) => project.status !== "En uso").length;

    const soldArs = clientProjects.filter((p) => p.currency === "ARS").reduce((sum, p) => sum + p.salePrice, 0);
    const soldUsd = clientProjects.filter((p) => p.currency === "USD").reduce((sum, p) => sum + p.salePrice, 0);
    const paidArs = data.payments.filter((p) => projectIds.has(p.projectId) && p.currency === "ARS").reduce((sum, p) => sum + p.amount, 0);
    const paidUsd = data.payments.filter((p) => projectIds.has(p.projectId) && p.currency === "USD").reduce((sum, p) => sum + p.amount, 0);

    const lastActivity = data.events
      .filter((event) => projectIds.has(event.projectId))
      .reduce<string | null>((latest, event) => (latest === null || event.date > latest ? event.date : latest), null);

    return { activeCount, client, lastActivity, paidArs, paidUsd, projects: clientProjects, soldArs, soldUsd };
  });

  const totalClients = clientRows.length;
  const activeClients = clientRows.filter((row) => row.activeCount > 0).length;
  const withDebt = clientRows.filter((row) => row.soldArs > row.paidArs || row.soldUsd > row.paidUsd).length;

  return (
    <section className="executive-page clients-command">
      <header className="command-header">
        <div>
          <h1>Cartera de Clientes</h1>
          <p>Quien es cada cliente, que proyectos tiene y como viene la relacion comercial.</p>
        </div>
      </header>

      <section className="ops-kpis">
        <article className="ops-kpi blue">
          <i aria-hidden="true" />
          <span>En cartera</span>
          <small>Clientes</small>
          <strong>{totalClients}</strong>
        </article>
        <article className="ops-kpi green">
          <i aria-hidden="true" />
          <span>Con proyectos en curso</span>
          <small>Activos</small>
          <strong>{activeClients}</strong>
        </article>
        <article className="ops-kpi orange">
          <i aria-hidden="true" />
          <span>Saldo por cobrar</span>
          <small>Con deuda</small>
          <strong>{withDebt}</strong>
        </article>
        <article className="ops-kpi neutral">
          <i aria-hidden="true" />
          <span>Total historico</span>
          <small>Proyectos</small>
          <strong>{data.projects.length}</strong>
        </article>
      </section>

      <section className="clients-grid">
        {clientRows.map(({ activeCount, client, lastActivity, paidArs, paidUsd, projects, soldArs, soldUsd }) => (
          <Link className="client-card" href={`/clientes/${client.id}`} key={client.id}>
            <header>
              <div className="person-avatar">{client.name.slice(0, 2).toUpperCase()}</div>
              <div>
                <strong>{client.name}</strong>
                <span>{client.industry} · {client.contact}</span>
              </div>
              <mark className={activeCount > 0 ? "client-active" : "client-idle"}>
                {activeCount > 0 ? `${activeCount} en curso` : "Sin proyectos activos"}
              </mark>
            </header>
            <div className="client-card-stats">
              <div>
                <span>Proyectos</span>
                <strong>{projects.length}</strong>
              </div>
              <div>
                <span>Vendido</span>
                <strong>{soldArs > 0 ? money(soldArs) : soldUsd > 0 ? money(soldUsd, "USD") : "—"}</strong>
              </div>
              <div>
                <span>Pendiente</span>
                <strong className={soldArs - paidArs > 0 || soldUsd - paidUsd > 0 ? "warn-text" : ""}>
                  {soldArs - paidArs > 0 ? money(soldArs - paidArs) : soldUsd - paidUsd > 0 ? money(soldUsd - paidUsd, "USD") : "Al dia"}
                </strong>
              </div>
              <div>
                <span>Ultima actividad</span>
                <strong>{lastActivity ? dateLabel(lastActivity) : "Sin registro"}</strong>
              </div>
            </div>
          </Link>
        ))}
        {clientRows.length === 0 ? (
          <div className="panel-empty">
            <strong>Sin clientes cargados.</strong>
            <Link href="/proyectos/nuevo">Crear el primer proyecto crea tambien su cliente</Link>
          </div>
        ) : null}
      </section>
    </section>
  );
}
