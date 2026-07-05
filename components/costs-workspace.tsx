"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCostAction, deleteCostAction } from "@/app/actions/projects";
import { money } from "@/lib/format";
import type { Cost, Project } from "@/lib/types";

const exchangeRate = 1210;
const categories: Cost["category"][] = ["Infra", "Software", "Dominio", "Marketing", "Operativo"];

export function CostsWorkspace({
  costs: initialCosts,
  projects,
  source
}: {
  costs: Cost[];
  projects: Project[];
  source: "mock" | "supabase";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [costs, setCosts] = useState<Cost[]>(initialCosts);
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    amount: "",
    cadence: "Mensual" as Cost["cadence"],
    category: "Infra" as Cost["category"],
    currency: "ARS" as "ARS" | "USD",
    name: "",
    projectId: "",
    provider: ""
  });

  const monthlyCosts = costs.filter((cost) => cost.cadence === "Mensual");
  const monthlyTotal = monthlyCosts.reduce((sum, cost) => sum + normalizeCost(cost), 0);
  const infraTotal = monthlyCosts.filter((cost) => cost.category === "Infra").reduce((sum, cost) => sum + normalizeCost(cost), 0);
  const softwareTotal = monthlyCosts.filter((cost) => cost.category === "Software").reduce((sum, cost) => sum + normalizeCost(cost), 0);
  const usdMonthly = monthlyCosts.filter((cost) => cost.currency === "USD");
  const categoryTotals = getCategoryTotals(costs);

  const alerts = useMemo(() => buildAlerts(costs, projects), [costs, projects]);

  function saveCost() {
    const amount = Number(draft.amount);
    if (!draft.name.trim() || !amount || amount <= 0) return;

    const cost: Cost = {
      id: `local-cost-${Date.now()}`,
      amount,
      cadence: draft.cadence,
      category: draft.category,
      currency: draft.currency,
      name: draft.name.trim(),
      projectId: draft.projectId || null,
      provider: draft.provider.trim() || "Sin proveedor"
    };

    if (source !== "supabase") {
      setCosts((current) => [cost, ...current]);
      resetDraft();
      return;
    }

    startTransition(async () => {
      try {
        const newId = await addCostAction({
          amount: cost.amount,
          cadence: cost.cadence,
          category: cost.category,
          currency: cost.currency,
          name: cost.name,
          projectId: cost.projectId,
          provider: cost.provider
        });
        setCosts((current) => [{ ...cost, id: newId }, ...current]);
        resetDraft();
        setFeedback("Costo guardado en Supabase");
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo guardar el costo");
      }
    });
  }

  function resetDraft() {
    setDraft((current) => ({ ...current, amount: "", name: "", provider: "" }));
    setShowForm(false);
  }

  function deleteCost(cost: Cost) {
    if (confirmingDeleteId !== cost.id) {
      setConfirmingDeleteId(cost.id);
      return;
    }

    const removeLocally = () => {
      setCosts((current) => current.filter((item) => item.id !== cost.id));
      setConfirmingDeleteId(null);
    };

    if (source !== "supabase") {
      removeLocally();
      return;
    }

    startTransition(async () => {
      try {
        await deleteCostAction(cost.id);
        removeLocally();
        setFeedback("Costo eliminado");
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo borrar el costo");
      }
    });
  }

  function exportCsv() {
    const header = "Servicio,Proveedor,Categoria,Monto,Moneda,Cadencia,Proyecto";
    const rows = costs.map((cost) => {
      const project = projects.find((item) => item.id === cost.projectId);
      return [cost.name, cost.provider, cost.category, cost.amount, cost.currency, cost.cadence, project?.name ?? "Corporate"]
        .map((value) => `"${String(value).replaceAll('"', '""')}"`)
        .join(",");
    });
    const blob = new Blob([`${header}\n${rows.join("\n")}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `costos-${new Date().toISOString().slice(0, 10)}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  return (
    <section className="executive-page costs-command">
      <header className="ops-head">
        <div>
          <span>Admin / Finanzas / Costos recurrentes</span>
          <h1>Gestion de Costos Operativos</h1>
          <p>Infraestructura, herramientas y servicios externos.</p>
        </div>
        <div className="finance-actions">
          <button className="finance-export" type="button" onClick={exportCsv}>Exportar CSV</button>
          <button className="command-primary" type="button" onClick={() => setShowForm((current) => !current)}>+ Nuevo servicio</button>
        </div>
      </header>

      {showForm ? (
        <article className="finance-drawer">
          <header>
            <span className="eyebrow">Nuevo servicio o costo</span>
            <strong>{feedback ?? (source === "supabase" ? "Conectado a Supabase" : "Modo local")}</strong>
          </header>
          <div className="finance-form compact">
            <div className="field-grid">
              <label className="field">
                <span>Servicio</span>
                <input placeholder="Ej: Supabase Pro" value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
              </label>
              <label className="field">
                <span>Proveedor</span>
                <input placeholder="Ej: Supabase" value={draft.provider} onChange={(event) => setDraft((current) => ({ ...current, provider: event.target.value }))} />
              </label>
              <label className="field">
                <span>Categoria</span>
                <select value={draft.category} onChange={(event) => setDraft((current) => ({ ...current, category: event.target.value as Cost["category"] }))}>
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
            </div>
            <div className="field-grid">
              <label className="field">
                <span>Monto</span>
                <input min="0" type="number" value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} />
              </label>
              <label className="field">
                <span>Moneda</span>
                <select value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value as "ARS" | "USD" }))}>
                  <option value="ARS">ARS</option>
                  <option value="USD">USD</option>
                </select>
              </label>
              <label className="field">
                <span>Cadencia</span>
                <select value={draft.cadence} onChange={(event) => setDraft((current) => ({ ...current, cadence: event.target.value as Cost["cadence"] }))}>
                  <option value="Mensual">Mensual</option>
                  <option value="Unico">Unico</option>
                </select>
              </label>
              <label className="field">
                <span>Proyecto (opcional)</span>
                <select value={draft.projectId} onChange={(event) => setDraft((current) => ({ ...current, projectId: event.target.value }))}>
                  <option value="">Corporate</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.name}</option>)}
                </select>
              </label>
            </div>
            <div className="quick-note-actions">
              <button className="command-primary" disabled={isPending} type="button" onClick={saveCost}>
                {isPending ? "Guardando…" : "Guardar servicio"}
              </button>
              <button className="ghost-button" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        </article>
      ) : null}

      <section className="ops-kpis">
        <OpsKpi label="Gasto mensual total" value={money(monthlyTotal)} note={`${monthlyCosts.length} servicios activos`} tone="blue" />
        <OpsKpi label="Infraestructura & AI" value={money(infraTotal)} note={`${monthlyCosts.filter((cost) => cost.category === "Infra").length} servicios`} tone="orange" />
        <OpsKpi label="Software operativo" value={money(softwareTotal)} note={`${monthlyCosts.filter((cost) => cost.category === "Software").length} servicios`} tone="green" />
        <OpsKpi label="Exposicion USD" value={money(usdMonthly.reduce((sum, cost) => sum + cost.amount, 0), "USD")} note={`${usdMonthly.length} servicios en USD`} tone="neutral" />
      </section>

      <section className="ops-table-card">
        <header>
          <h2>Desglose de Costos Recurrentes</h2>
          <div>
            <span>{source === "supabase" ? "Supabase" : "Mock"}</span>
          </div>
        </header>
        <div className="ops-table-head">
          <span>Servicio / Proveedor</span>
          <span>Costo</span>
          <span>Cadencia</span>
          <span>Asociado a</span>
          <span>Estado</span>
          <span>Equivalente ARS</span>
          <span>Accion</span>
        </div>
        {costs.map((cost) => {
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
              <span>{cost.cadence}</span>
              <mark>{project?.name ?? "Corporate"}</mark>
              <StatusBadge cost={cost} />
              <span>{cost.currency === "USD" ? money(cost.amount * exchangeRate) : "—"}</span>
              <div className="table-actions">
                <button className={confirmingDeleteId === cost.id ? "danger-confirm" : ""} disabled={isPending} type="button" onClick={() => deleteCost(cost)}>
                  {confirmingDeleteId === cost.id ? "Confirmar" : "Borrar"}
                </button>
                {confirmingDeleteId === cost.id ? <button type="button" onClick={() => setConfirmingDeleteId(null)}>Cancelar</button> : null}
              </div>
            </article>
          );
        })}
        <footer>
          <span>{costs.length} {costs.length === 1 ? "servicio" : "servicios"} registrados</span>
        </footer>
      </section>

      <section className="ops-bottom-grid">
        <article className="category-card">
          <header>
            <h2>Distribucion de Gasto por Categoria</h2>
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
          {alerts.length > 0 ? (
            alerts.map((alert) => <Alert detail={alert.detail} key={alert.title} title={alert.title} tone={alert.tone} />)
          ) : (
            <div className="ops-alert green">
              <strong>Sin alertas</strong>
              <span>Los costos estan bajo control.</span>
            </div>
          )}
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
  const label = cost.cadence === "Unico" ? "Pagado" : "Activo";
  const tone = cost.cadence === "Unico" ? "neutral" : "green";
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

function buildAlerts(costs: Cost[], projects: Project[]) {
  const alerts: Array<{ detail: string; title: string; tone: "green" | "orange" | "red" }> = [];
  const monthly = costs.filter((cost) => cost.cadence === "Mensual");

  const heaviest = [...monthly].sort((a, b) => normalizeCost(b) - normalizeCost(a))[0];
  if (heaviest) {
    alerts.push({
      detail: `${heaviest.name} (${heaviest.provider}) representa ${money(normalizeCost(heaviest))} por mes.`,
      title: "Costo mas pesado",
      tone: "orange"
    });
  }

  const usdCount = monthly.filter((cost) => cost.currency === "USD").length;
  if (usdCount > 0) {
    alerts.push({
      detail: `${usdCount} ${usdCount === 1 ? "servicio mensual esta dolarizado" : "servicios mensuales estan dolarizados"}; revisar impacto ante saltos de tipo de cambio.`,
      title: "Exposicion cambiaria",
      tone: usdCount > 2 ? "red" : "orange"
    });
  }

  const orphanCosts = costs.filter((cost) => cost.projectId && !projects.some((project) => project.id === cost.projectId));
  if (orphanCosts.length > 0) {
    alerts.push({
      detail: `${orphanCosts.length} ${orphanCosts.length === 1 ? "costo apunta" : "costos apuntan"} a proyectos que ya no existen.`,
      title: "Costos huerfanos",
      tone: "red"
    });
  }

  const corporate = monthly.filter((cost) => !cost.projectId);
  if (corporate.length > 0) {
    alerts.push({
      detail: `${money(corporate.reduce((sum, cost) => sum + normalizeCost(cost), 0))} mensuales no estan asignados a ningun proyecto.`,
      title: "Gasto corporativo",
      tone: "green"
    });
  }

  return alerts.slice(0, 3);
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
