import { PageHeader } from "@/components/ui";
import { FinanceWorkspace } from "@/components/finance-workspace";
import { cashMovements, projects } from "@/lib/mock-data";
import { getOverviewMetrics } from "@/lib/metrics";
import { money } from "@/lib/format";

export default function FinancePage() {
  const metrics = getOverviewMetrics();
  const projectNames = Object.fromEntries(projects.map((project) => [project.id, project.name]));

  return (
    <>
      <PageHeader
        eyebrow="Caja y decisiones"
        title="Que entro, que falta cobrar y que hicimos con la plata."
        description="Esta ruta separa cobros, reparto entre socios, inversiones, dolares, cheques y caja operativa."
        action="Nuevo movimiento"
      />

      <section className="route-grid finance-layout">
        <article className="hero-panel finance-hero">
          <div>
            <span className="eyebrow">Cobrado</span>
            <strong>{money(metrics.arsPaid)} / {money(metrics.usdPaid, "USD")}</strong>
            <p>Vista mixta de caja en pesos y dolares, todavia sin conversion automatica.</p>
          </div>
          <div className="signal-stack">
            <span>Vendido local {money(metrics.arsSold)}</span>
            <span>Vendido dolarizado {money(metrics.usdSold, "USD")}</span>
            <span>Horas trazadas {metrics.trackedHours} h</span>
          </div>
        </article>
      </section>

      <FinanceWorkspace initialMovements={cashMovements} projectNames={projectNames} />
    </>
  );
}
