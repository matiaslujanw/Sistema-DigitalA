import { PageHeader } from "@/components/ui";
import { costs, projects } from "@/lib/mock-data";
import { getOverviewMetrics } from "@/lib/metrics";
import { money } from "@/lib/format";

export default function CostsPage() {
  const metrics = getOverviewMetrics();

  return (
    <>
      <PageHeader
        eyebrow="Stack y costos"
        title="Herramientas, infraestructura y costos por proyecto."
        description="Sirve para saber cuanto cuesta sostener cada sistema y que gasto es general o atribuible a un cliente."
        action="Nuevo costo"
      />

      <section className="route-grid costs-layout">
        <article className="signal-panel lime">
          <span>Mensual USD</span>
          <strong>{money(metrics.monthlyUsdCost, "USD")}</strong>
          <small>Servicios dolarizados base.</small>
        </article>
        <article className="signal-panel ink">
          <span>Mensual local</span>
          <strong>{money(metrics.monthlyArsCost)}</strong>
          <small>Servicios locales y APIs.</small>
        </article>

        <article className="panel-block costs-panel">
          <div className="block-heading">
            <span className="eyebrow">Inventario operativo</span>
            <span>{costs.length} costos</span>
          </div>
          <div className="data-list">
            {costs.map((cost) => {
              const project = projects.find((item) => item.id === cost.projectId);

              return (
                <article className="data-row cost-row" key={cost.id}>
                  <div>
                    <strong>{cost.name}</strong>
                    <span>{cost.provider} · {cost.category}</span>
                  </div>
                  <div>
                    <strong>{money(cost.amount, cost.currency)}</strong>
                    <span>{cost.cadence}</span>
                  </div>
                  <p>{project?.name ?? "Costo general de la empresa"}</p>
                </article>
              );
            })}
          </div>
        </article>
      </section>
    </>
  );
}
