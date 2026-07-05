"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCashMovementAction, deleteCashMovementAction } from "@/app/actions/projects";
import { dateLabel, money } from "@/lib/format";
import type { CashDestination, CashMovement, FinanceOperation } from "@/lib/types";

const operationOptions: FinanceOperation[] = ["Cobro", "Reparto socios", "Compra divisa", "Inversion", "Gasto", "Reserva"];
const destinations: CashDestination[] = ["Reparto socios", "Reinversion", "Dolares", "Plazo fijo", "Cheques", "Caja"];
const fallbackExchangeRate = 1210;

export function FinanceWorkspace({
  initialMovements,
  metrics,
  partnerNames,
  projectNames,
  source
}: {
  initialMovements: CashMovement[];
  metrics: {
    arsPaid: number;
    arsSold: number;
    monthlyArsCost: number;
    monthlyUsdCost: number;
    usdPaid: number;
    usdSold: number;
  };
  partnerNames: string[];
  projectNames: Record<string, string>;
  source: "mock" | "supabase";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [movements, setMovements] = useState<CashMovement[]>(initialMovements);
  const [showForm, setShowForm] = useState(false);
  const [ledgerFilter, setLedgerFilter] = useState("Todos");
  const [feedback, setFeedback] = useState(source === "supabase" ? "Conectado a Supabase" : "Fallback mock");
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [draft, setDraft] = useState({
    concept: "",
    amount: "",
    currency: "ARS" as "ARS" | "USD",
    date: new Date().toISOString().slice(0, 10),
    operation: "Reparto socios" as FinanceOperation,
    acquiredCurrency: "USD" as "USD" | "EUR" | "USDT" | "ARS",
    acquiredAmount: "",
    exchangeRate: "",
    expectedReturnPercent: "",
    actualReturnPercent: "",
    notes: ""
  });

  // Tipo de cambio: del ultimo movimiento real de compra de divisa; si no hay, valor de referencia.
  const exchangeRate = useMemo(() => {
    const lastPurchase = movements.find((movement) => movement.operation === "Compra divisa" && movement.exchangeRate);
    return lastPurchase?.exchangeRate ?? fallbackExchangeRate;
  }, [movements]);
  const isReferenceRate = !movements.some((movement) => movement.operation === "Compra divisa" && movement.exchangeRate);

  const totals = useMemo(() => {
    const byDestination = destinations.reduce<Record<CashDestination, number>>((acc, destination) => {
      acc[destination] = 0;
      return acc;
    }, {} as Record<CashDestination, number>);

    for (const movement of movements) {
      byDestination[movement.destination] += normalizedAmount(movement, exchangeRate);
    }

    const paidArs = metrics.arsPaid + metrics.usdPaid * exchangeRate;
    const soldArs = metrics.arsSold + metrics.usdSold * exchangeRate;
    const pendingArs = Math.max(0, soldArs - paidArs);
    const allocated = Object.values(byDestination).reduce((sum, value) => sum + value, 0);
    const companyCash = byDestination.Caja + byDestination.Dolares + byDestination["Plazo fijo"];
    const undecided = Math.max(0, paidArs - allocated);
    const monthlyCosts = metrics.monthlyArsCost + metrics.monthlyUsdCost * exchangeRate;

    return { allocated, byDestination, companyCash, monthlyCosts, paidArs, pendingArs, soldArs, undecided };
  }, [exchangeRate, metrics, movements]);

  const partnerCount = Math.max(1, partnerNames.length);
  const partnerShare = Math.round((totals.byDestination["Reparto socios"] || 0) / partnerCount);
  const lastDistribution = useMemo(
    () => movements.filter((movement) => movement.operation === "Reparto socios").map((movement) => movement.date).sort().at(-1) ?? null,
    [movements]
  );
  const filteredMovements = ledgerFilter === "Todos" ? movements : movements.filter((movement) => movement.operation === ledgerFilter);

  function addMovement() {
    const amount = Number(draft.amount);
    if (!draft.concept || !amount || amount <= 0) return;

    const movement: CashMovement = {
      id: `local-finance-${Date.now()}`,
      sourceProjectId: null,
      date: draft.date,
      concept: draft.concept,
      amount,
      currency: draft.currency,
      destination: operationToDestination(draft.operation),
      operation: draft.operation,
      acquiredCurrency: draft.operation === "Compra divisa" ? draft.acquiredCurrency : undefined,
      acquiredAmount: draft.acquiredAmount ? Number(draft.acquiredAmount) : undefined,
      exchangeRate: draft.exchangeRate ? Number(draft.exchangeRate) : undefined,
      expectedReturnPercent: draft.expectedReturnPercent ? Number(draft.expectedReturnPercent) : undefined,
      actualReturnPercent: draft.actualReturnPercent ? Number(draft.actualReturnPercent) : undefined,
      notes: draft.notes || "Movimiento cargado manualmente"
    };

    if (source !== "supabase") {
      setMovements((current) => [movement, ...current]);
      resetDraft();
      return;
    }

    startTransition(async () => {
      try {
        const newId = await addCashMovementAction(movement);
        setMovements((current) => [{ ...movement, id: newId }, ...current]);
        resetDraft();
        setFeedback("Movimiento guardado en Supabase");
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo guardar el movimiento");
      }
    });
  }

  function resetDraft() {
    setDraft((current) => ({ ...current, concept: "", amount: "", acquiredAmount: "", exchangeRate: "", notes: "" }));
    setShowForm(false);
  }

  function deleteMovement(movement: CashMovement) {
    if (confirmingDeleteId !== movement.id) {
      setConfirmingDeleteId(movement.id);
      return;
    }

    const removeLocally = () => {
      setMovements((current) => current.filter((item) => item.id !== movement.id));
      setConfirmingDeleteId(null);
    };

    if (source !== "supabase") {
      removeLocally();
      return;
    }

    startTransition(async () => {
      try {
        await deleteCashMovementAction(movement.id);
        removeLocally();
        setFeedback("Movimiento eliminado");
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo borrar el movimiento");
      }
    });
  }

  return (
    <section className="executive-page finance-command">
      <header className="finance-command-head">
        <div>
          <h1>Flujo de Caja & Asignacion</h1>
          <p>Monitoreo de capital en tiempo real y distribucion de utilidades.</p>
        </div>
        <div className="finance-actions">
          <button className="command-primary" type="button" onClick={() => setShowForm((current) => !current)}>+ Nueva operacion</button>
          <button className="finance-export" type="button">Exportar</button>
        </div>
      </header>

      {showForm ? (
        <article className="finance-drawer">
          <header>
            <span className="eyebrow">Nueva decision de caja</span>
            <strong>{feedback}</strong>
          </header>
          <div className="finance-form compact">
            <label className="field">
              <span>Operacion</span>
              <select value={draft.operation} onChange={(event) => setDraft((current) => ({ ...current, operation: event.target.value as FinanceOperation }))}>
                {operationOptions.map((operation) => <option key={operation} value={operation}>{operation}</option>)}
              </select>
            </label>
            <label className="field">
              <span>Concepto</span>
              <input value={draft.concept} onChange={(event) => setDraft((current) => ({ ...current, concept: event.target.value }))} />
            </label>
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
                <span>Fecha</span>
                <input type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} />
              </label>
            </div>

            {draft.operation === "Compra divisa" ? (
              <div className="field-grid">
                <label className="field">
                  <span>Divisa</span>
                  <select value={draft.acquiredCurrency} onChange={(event) => setDraft((current) => ({ ...current, acquiredCurrency: event.target.value as "USD" | "EUR" | "USDT" | "ARS" }))}>
                    <option value="USD">USD</option>
                    <option value="EUR">EUR</option>
                    <option value="USDT">USDT</option>
                  </select>
                </label>
                <label className="field">
                  <span>Cantidad</span>
                  <input min="0" type="number" value={draft.acquiredAmount} onChange={(event) => setDraft((current) => ({ ...current, acquiredAmount: event.target.value }))} />
                </label>
                <label className="field">
                  <span>Tipo de cambio</span>
                  <input min="0" type="number" value={draft.exchangeRate} onChange={(event) => setDraft((current) => ({ ...current, exchangeRate: event.target.value }))} />
                </label>
              </div>
            ) : null}

            <label className="field">
              <span>Notas</span>
              <input value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
            </label>
            <div className="finance-form-actions">
              <button className="command-primary" disabled={isPending} type="button" onClick={addMovement}>{isPending ? "Guardando" : "Guardar movimiento"}</button>
              <button className="ghost-button" type="button" onClick={() => setShowForm(false)}>Cerrar</button>
            </div>
          </div>
        </article>
      ) : null}

      <section className="finance-kpis">
        <FinanceKpi label="Cobrado" value={money(totals.paidArs)} tone="green" icon="cash" />
        <FinanceKpi label="Pendiente" value={money(totals.pendingArs)} tone="orange" icon="clock" />
        <FinanceKpi label="Caja compania" value={money(totals.companyCash)} tone="blue" icon="bank" />
        <FinanceKpi label="Por decidir" value={money(totals.undecided)} tone="neutral" icon="question" />
      </section>

      <section className="finance-allocation-grid">
        <article className="allocation-map">
          <header>
            <h2>Desglose de Asignacion</h2>
            <span>Optimizado</span>
          </header>
          <div className="allocation-body">
            <div className="allocation-bars">
              <AllocationBar label="Distribuido a socios" value={totals.byDestination["Reparto socios"]} total={totals.allocated || 1} />
              <AllocationBar label="Reinversion" value={totals.byDestination.Reinversion} total={totals.allocated || 1} />
              <AllocationBar label="Costos pagados" value={totals.monthlyCosts} total={totals.allocated + totals.monthlyCosts || 1} />
            </div>
            <div className="allocation-tower" aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>
            <div className="allocation-floating">
              <MiniAllocation title="Compra dolares" value={totals.byDestination.Dolares} note="Acumulado" />
              <MiniAllocation title="Plazo fijo" value={totals.byDestination["Plazo fijo"]} note="Invertido" />
              <MiniAllocation title="Compra cheques" value={totals.byDestination.Cheques} note="Acumulado" />
              <MiniAllocation title="Herramientas / SaaS" value={totals.monthlyCosts} note="Mensual" />
            </div>
          </div>
          <footer>
            <div>
              <span>Efectivo total</span>
              <strong>{money(totals.paidArs)}</strong>
            </div>
            <div>
              <span>Ultimo reparto</span>
              <strong>{lastDistribution ? dateLabel(lastDistribution) : "—"}</strong>
            </div>
            <div>
              <span>Prox. distribucion</span>
              <strong>{lastDistribution ? dateLabel(addMonths(lastDistribution, 3)) : "—"}</strong>
            </div>
          </footer>
        </article>

        <aside className="finance-side-stack">
          <article className="partner-distribution">
            <h2>Distribucion socios</h2>
            {(partnerNames.length > 0 ? partnerNames : ["Sin socios cargados"]).map((partner) => (
              <div className="partner-money-row" key={partner}>
                <span>{partner.slice(0, 2).toUpperCase()}</span>
                <strong>{partner}</strong>
                <b>{money(partnerShare)}</b>
              </div>
            ))}
          </article>

          <article className="exchange-card">
            <span>Tipo de cambio</span>
            <strong>{exchangeRate.toLocaleString("es-AR")} <small>ARS/USD {isReferenceRate ? "referencia" : "ultima compra"}</small></strong>
            <div className="exchange-bars" aria-hidden="true">
              <i /><i /><i /><i /><i /><i /><i />
            </div>
          </article>
        </aside>
      </section>

      <section className="finance-ledger">
        <header>
          <h2>Movimientos recientes</h2>
          <select aria-label="Filtro de operacion" value={ledgerFilter} onChange={(event) => setLedgerFilter(event.target.value)}>
            <option value="Todos">Todos</option>
            {operationOptions.map((operation) => <option key={operation} value={operation}>{operation}</option>)}
          </select>
        </header>
        <div className="finance-ledger-head">
          <span>Operacion</span>
          <span>Proyecto</span>
          <span>Fecha</span>
          <span>Destino</span>
          <span>Monto</span>
          <span>Detalle</span>
          <span>Accion</span>
        </div>
        {filteredMovements.map((movement) => (
          <article className="finance-ledger-row" key={movement.id}>
            <div>
              <strong>{movement.concept}</strong>
              <span>{movement.operation}</span>
            </div>
            <span>{projectNames[movement.sourceProjectId ?? ""] ?? "General"}</span>
            <span>{dateLabel(movement.date)}</span>
            <mark>{movement.destination}</mark>
            <strong>{money(movement.amount, movement.currency)}</strong>
            <p>{movementDetails(movement)}</p>
            <div className="table-actions">
              <button className={confirmingDeleteId === movement.id ? "danger-confirm" : ""} disabled={isPending} type="button" onClick={() => deleteMovement(movement)}>
                {confirmingDeleteId === movement.id ? "Confirmar" : "Borrar"}
              </button>
              {confirmingDeleteId === movement.id ? <button type="button" onClick={() => setConfirmingDeleteId(null)}>Cancelar</button> : null}
            </div>
          </article>
        ))}
      </section>
    </section>
  );
}

function FinanceKpi({ icon, label, tone, value }: { icon: string; label: string; tone: "blue" | "green" | "neutral" | "orange"; value: string }) {
  return (
    <article className={`finance-kpi ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <i className={`finance-kpi-icon ${icon}`} aria-hidden="true" />
    </article>
  );
}

function AllocationBar({ label, total, value }: { label: string; total: number; value: number }) {
  const percent = Math.max(4, Math.min(100, Math.round((value / total) * 100)));
  return (
    <div className="allocation-bar">
      <span>{label}</span>
      <div><i style={{ width: `${percent}%` }} /></div>
      <strong>{money(value)} <small>{percent}%</small></strong>
    </div>
  );
}

function MiniAllocation({ note, title, value }: { note: string; title: string; value: number }) {
  return (
    <div>
      <span>{title}</span>
      <strong>{money(value)}</strong>
      <small>{note}</small>
    </div>
  );
}

function normalizedAmount(movement: CashMovement, exchangeRate: number) {
  return movement.currency === "USD" ? movement.amount * exchangeRate : movement.amount;
}

function addMonths(date: string, months: number) {
  const base = new Date(`${date}T12:00:00`);
  base.setMonth(base.getMonth() + months);
  return base.toISOString().slice(0, 10);
}

function operationToDestination(operation: FinanceOperation): CashMovement["destination"] {
  if (operation === "Reparto socios") return "Reparto socios";
  if (operation === "Compra divisa") return "Dolares";
  if (operation === "Inversion") return "Plazo fijo";
  if (operation === "Gasto") return "Reinversion";
  return "Caja";
}

function movementDetails(movement: CashMovement) {
  const pieces = [movement.notes];
  if (movement.operation === "Compra divisa" && movement.acquiredAmount && movement.acquiredCurrency) {
    pieces.push(`Compra: ${movement.acquiredAmount} ${movement.acquiredCurrency}`);
  }
  if (movement.exchangeRate) pieces.push(`TC ${movement.exchangeRate}`);
  if (movement.expectedReturnPercent) pieces.push(`Rend. esperado ${movement.expectedReturnPercent}%`);
  if (movement.actualReturnPercent) pieces.push(`Rend. real ${movement.actualReturnPercent}%`);
  return pieces.filter(Boolean).join(" · ");
}
