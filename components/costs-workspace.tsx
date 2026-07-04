import { money } from "@/lib/format";
import type { Cost, Project } from "@/lib/types";

const exchangeRate = 1210;

export function CostsWorkspace({
  costs,
  projects,
  source
}: {
  costs: Cost[];
  projects: Project[];
  source: "mock" | "supabase";
}) {
  const monthlyCosts = costs.filter((cost) => cost.cadence === "Mensual");
  const monthlyTotal = monthlyCosts.reduce((sum, cost) => sum + normalizeCost(cost), 0);
  const infraTotal = monthlyCosts.filter((cost) => cost.category === "Infra").reduce((sum, cost) => sum + normalizeCost(cost), 0);
  const softwareTotal = monthlyCosts.filter((cost) => cost.category === "Software").reduce((sum, cost) => sum + normalizeCost(cost), 0);
  const renewalRisk = costs.filter((cost) => cost.cadence === "Mensual" && cost.currency === "USD").length;
  const categoryTotals = getCategoryTotals(costs);

  return (
    <section className="executive-page costs-command">
      <header className="ops-head">
        <div>
          <span>Admin / Finanzas / Costos recurrentes</span>
          <h1>Gestion de Costos Operativos</h1>
          <p>Infraestructura, herramientas y servicios externos del Q3 2026.</p>
        </div>
        <div className="finance-actions">
          <button className="finance-export" type="button">Exportar</button>
          <button className="command-primary" type="button">+ Nuevo servicio</button>
        </div>
      </header>

      <section className="ops-kpis">
        <OpsKpi label="Gasto mensual total" value={money(monthlyTotal)} note="+2.4% vs mes ant." tone="blue" />
        <OpsKpi label="Infraestructura & AI" value={money(infraTotal)} note={`${monthlyCosts.length} servicios activos`} tone="orange" />
        <OpsKpi label="Software operativo" value={money(softwareTotal)} note="-5.0% renovacion" tone="green" />
        <OpsKpi label="Proxima renovacion" value={nextRenewal(costs)} note={`${renewalRisk} en USD`} tone="neutral" />
      </section>

      <section className="ops-table-card">
        <header>
          <h2>Desglose de Costos Recurrentes</h2>
          <div>
            <span>{source === "supabase" ? "Supabase" : "Mock"}</span>
            <button type="button" aria-label="Filtrar costos" />
          </div>
        </header>
        <div className="ops-table-head">
          <span>Servicio / Proveedor</span>
          <span>Costo mensual</span>
          <span>Renovacion</span>
          <span>Asociado a</span>
          <span>Estado</span>
          <span>Acciones</span>
        </div>
        {costs.map((cost, index) => {
          const project = projects.find((item) => item.id === cost.projectId);
          return (
            <article className="ops-table-row" key={cost.id}>
              <div className="ops-service">
                <i className={`ops-icon ops-icon-${cost.category.toLowerCase()}`} aria-hidden="true" />
                <div>
                  <strong>{cost.name}</strong>
                  <span>{cost.provider} · {cost.category}</span>
                </div>
              </div>
              <strong>{money(cost.amount, cost.currency)}</strong>
              <span>{renewalLabel(cost, index)}</span>
              <mark>{project?.name ?? "Corporate"}</mark>
              <StatusBadge cost={cost} />
              <button className="ops-more" type="button" aria-label={`Acciones para ${cost.name}`}>...</button>
            </article>
          );
        })}
        <footer>
          <span>Mostrando 1-{costs.length} de {costs.length} servicios</span>
          <div className="pager">
            <button type="button">{"<"}</button>
            <button className="active" type="button">1</button>
            <button type="button">2</button>
            <button type="button">{">"}</button>
          </div>
        </footer>
      </section>

      <section className="ops-bottom-grid">
        <article className="category-card">
          <header>
            <h2>Distribucion de Gasto por Categoria</h2>
            <button type="button" aria-label="Expandir grafico" />
          </header>
          <div className="category-chart">
            {categoryTotals.map((item) => (
              <div key={item.label}>
                <span style={{ height: `${item.percent}%` }} />
                <strong>{item.label}</strong>
              </div>
            ))}
          </div>
        </article>

        <aside className="alerts-card">
          <h2>Alertas Financieras</h2>
          <Alert tone="red" title="Renovacion critica" detail="Hostinger expira pronto. Validar si continua o se migra." />
          <Alert tone="orange" title="Limite de APIs" detail="WhatsApp API puede crecer si suben automatizaciones CRM." />
          <Alert tone="green" title="Optimizacion detectada" detail="Supabase y Vercel podrian consolidarse por proyecto." />
          <button type="button">Ver todas las alertas</button>
        </aside>
      </section>
    </section>
  );
}

function OpsKpi({ label, note, tone, value }: { label: string; note: string; tone: "blue" | "green" | "neutral" | "orange"; value: string }) {
  return (
    <article className={`ops-kpi ${tone}`}>
      <i aria-hidden="true" />
      <span>{note}</span>
      <small>{label}</small>
      <strong>{value}</strong>
    </article>
  );
}

function StatusBadge({ cost }: { cost: Cost }) {
  const label = cost.cadence === "Unico" ? "Pagado" : cost.currency === "USD" ? "Activo" : "En curso";
  const tone = cost.cadence === "Unico" ? "neutral" : cost.currency === "USD" ? "green" : "blue";
  return <b className={`ops-status ${tone}`}>{label}</b>;
}

function Alert({ detail, title, tone }: { detail: string; title: string; tone: "green" | "orange" | "red" }) {
  return (
    <div className={`ops-alert ${tone}`}>
      <strong>{title}</strong>
      <span>{detail}</span>
    </div>
  );
}

function normalizeCost(cost: Cost) {
  return cost.currency === "USD" ? cost.amount * exchangeRate : cost.amount;
}

function getCategoryTotals(costs: Cost[]) {
  const totals = costs.reduce<Record<string, number>>((acc, cost) => {
    acc[cost.category] = (acc[cost.category] ?? 0) + normalizeCost(cost);
    return acc;
  }, {});
  const max = Math.max(...Object.values(totals), 1);
  return Object.entries(totals).map(([label, value]) => ({ label, percent: Math.max(8, Math.round((value / max) * 100)) }));
}

function nextRenewal(costs: Cost[]) {
  const firstMonthly = costs.find((cost) => cost.cadence === "Mensual");
  return firstMonthly ? `${firstMonthly.provider} (12 Sep)` : "Sin renovaciones";
}

function renewalLabel(cost: Cost, index: number) {
  if (cost.cadence === "Unico") return "Unico";
  const days = ["12 Sep 2026", "22 Oct 2026", "01 Oct 2026", "15 Oct 2026", "30 Oct 2026"];
  return days[index % days.length];
}
