"use client";

import { useCallback, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addAllocationAction, deleteCashMovementAction } from "@/app/actions/projects";
import { dateLabel, money } from "@/lib/format";
import type { AllocationKind, CashMovement, ProjectPayment } from "@/lib/types";

const allocationKinds: AllocationKind[] = ["Cambio", "Reparto", "Cheque", "Plazo fijo", "Gasto", "Caja"];
const fallbackRate = 1500;

type Partner = { id: string; name: string };

export function FinanceWorkspace({
  movements: initialMovements,
  partners,
  payments,
  projectNames,
  source
}: {
  movements: CashMovement[];
  partners: Partner[];
  payments: ProjectPayment[];
  projectNames: Record<string, string>;
  source: "mock" | "supabase";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [movements, setMovements] = useState<CashMovement[]>(initialMovements);
  const [openForm, setOpenForm] = useState<string | null>(null);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState(source === "supabase" ? "Conectado a Supabase" : "Estas viendo datos de ejemplo: no se guardan.");
  const today = new Date().toISOString().slice(0, 10);
  const readOnly = source !== "supabase";

  const [draft, setDraft] = useState({
    kind: "Reparto" as AllocationKind,
    amount: "",
    date: today,
    concept: "",
    notes: "",
    targetCurrency: "ARS" as "ARS" | "USD",
    targetAmount: "",
    exchangeRate: "",
    partnerId: partners[0]?.id ?? "",
    expectedReturnPercent: "",
    actualReturnPercent: "",
    dueDate: ""
  });

  const partnerName = (id: string | null) => partners.find((partner) => partner.id === id)?.name ?? "Socio";

  const referenceRate = useMemo(() => {
    const lastCambio = movements
      .filter((movement) => movement.kind === "Cambio" && movement.exchangeRate)
      .sort((a, b) => b.date.localeCompare(a.date))[0];
    return lastCambio?.exchangeRate ?? fallbackRate;
  }, [movements]);

  const consumedUnder = useCallback(
    (paymentId: string, parentMovementId: string | null) =>
      movements
        .filter((movement) => movement.paymentId === paymentId && (movement.parentMovementId ?? null) === parentMovementId)
        .reduce((sum, movement) => sum + movement.amount, 0),
    [movements]
  );

  const childrenOf = useCallback(
    (paymentId: string, parentMovementId: string | null) =>
      movements
        .filter((movement) => movement.paymentId === paymentId && (movement.parentMovementId ?? null) === parentMovementId)
        .sort((a, b) => a.date.localeCompare(b.date)),
    [movements]
  );

  // KPIs (todo normalizado a ARS con el tipo de cambio de referencia).
  const totals = useMemo(() => {
    const toArs = (amount: number, currency: "ARS" | "USD") => (currency === "USD" ? amount * referenceRate : amount);
    const collected = payments.reduce((sum, payment) => sum + toArs(payment.amount, payment.currency), 0);

    // Sin asignar = saldo de cada cobro (pool USD/ARS del pago) + saldo de cada cambio (pool resultante).
    let poolUnassigned = 0;
    for (const payment of payments) {
      poolUnassigned += toArs(Math.max(0, payment.amount - consumedUnder(payment.id, null)), payment.currency);
    }
    for (const movement of movements) {
      if (movement.kind === "Cambio" && movement.acquiredAmount && movement.acquiredCurrency) {
        const currency = movement.acquiredCurrency === "USD" ? "USD" : "ARS";
        const saldo = Math.max(0, movement.acquiredAmount - consumedUnder(movement.paymentId ?? "", movement.id));
        poolUnassigned += toArs(saldo, currency);
      }
    }

    const distributed = movements
      .filter((movement) => movement.kind === "Reparto")
      .reduce((sum, movement) => sum + toArs(movement.amount, movement.currency), 0);
    const stored = movements
      .filter((movement) => movement.kind === "Cheque" || movement.kind === "Plazo fijo" || movement.kind === "Caja")
      .reduce((sum, movement) => sum + toArs(movement.amount, movement.currency), 0);
    const expectedYield = movements
      .filter((movement) => (movement.kind === "Cheque" || movement.kind === "Plazo fijo") && movement.expectedReturnPercent)
      .reduce((sum, movement) => {
        const projected = movement.amount * ((movement.expectedReturnPercent ?? 0) / 100);
        return sum + toArs(projected, movement.currency);
      }, 0);

    return { collected, distributed, expectedYield, stored, unassigned: poolUnassigned };
  }, [consumedUnder, movements, payments, referenceRate]);

  const perPartner = useMemo(() => {
    const toArs = (amount: number, currency: "ARS" | "USD") => (currency === "USD" ? amount * referenceRate : amount);
    return partners
      .map((partner) => ({
        name: partner.name,
        total: movements
          .filter((movement) => movement.kind === "Reparto" && movement.partnerId === partner.id)
          .reduce((sum, movement) => sum + toArs(movement.amount, movement.currency), 0)
      }))
      .sort((a, b) => b.total - a.total);
  }, [movements, partners, referenceRate]);

  function openStepForm(poolKey: string, poolCurrency: "ARS" | "USD", saldo: number) {
    setDraft({
      kind: poolCurrency === "USD" ? "Cambio" : "Reparto",
      amount: saldo > 0 ? String(Math.round(saldo)) : "",
      date: today,
      concept: "",
      notes: "",
      targetCurrency: poolCurrency === "USD" ? "ARS" : "USD",
      targetAmount: "",
      exchangeRate: "",
      partnerId: partners[0]?.id ?? "",
      expectedReturnPercent: "",
      actualReturnPercent: "",
      dueDate: ""
    });
    setOpenForm(poolKey);
  }

  function addStep(poolKey: string, paymentId: string, parentMovementId: string | null, poolCurrency: "ARS" | "USD", sourceProjectId: string | null) {
    const amount = Number(draft.amount);
    if (!amount || amount <= 0) return;
    if (draft.kind === "Reparto" && !draft.partnerId) {
      setFeedback("Elegi a que socio va el reparto.");
      return;
    }

    const isCambio = draft.kind === "Cambio";
    const isInvestment = draft.kind === "Cheque" || draft.kind === "Plazo fijo";
    let acquiredAmount = Number(draft.targetAmount) || 0;
    let rate = Number(draft.exchangeRate) || 0;
    if (isCambio) {
      if (!acquiredAmount && rate) acquiredAmount = poolCurrency === "USD" ? amount * rate : amount / rate;
      if (!rate && acquiredAmount) rate = poolCurrency === "USD" ? acquiredAmount / amount : amount / acquiredAmount;
    }

    const movement: CashMovement = {
      id: `local-alloc-${Date.now()}`,
      paymentId,
      parentMovementId,
      sourceProjectId,
      kind: draft.kind,
      date: draft.date,
      dueDate: isInvestment ? draft.dueDate || null : null,
      concept: draft.concept || defaultConcept(draft.kind),
      amount,
      currency: poolCurrency,
      partnerId: draft.kind === "Reparto" ? draft.partnerId : null,
      acquiredCurrency: isCambio ? draft.targetCurrency : undefined,
      acquiredAmount: isCambio ? Math.round(acquiredAmount) : undefined,
      exchangeRate: isCambio && rate ? Math.round(rate * 100) / 100 : undefined,
      expectedReturnPercent: isInvestment && draft.expectedReturnPercent ? Number(draft.expectedReturnPercent) : undefined,
      actualReturnPercent: isInvestment && draft.actualReturnPercent ? Number(draft.actualReturnPercent) : undefined,
      notes: draft.notes
    };

    if (readOnly) {
      setMovements((current) => [...current, movement]);
      setOpenForm(null);
      return;
    }

    startTransition(async () => {
      try {
        const newId = await addAllocationAction({
          paymentId,
          parentMovementId,
          kind: movement.kind,
          date: movement.date,
          dueDate: movement.dueDate,
          concept: movement.concept,
          amount: movement.amount,
          currency: movement.currency,
          partnerId: movement.partnerId,
          sourceProjectId,
          acquiredCurrency: movement.acquiredCurrency,
          acquiredAmount: movement.acquiredAmount,
          exchangeRate: movement.exchangeRate,
          expectedReturnPercent: movement.expectedReturnPercent,
          actualReturnPercent: movement.actualReturnPercent,
          notes: movement.notes
        });
        setMovements((current) => [...current, { ...movement, id: newId }]);
        setOpenForm(null);
        setFeedback(`${movement.kind} registrado en Supabase`);
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo guardar el paso");
      }
    });
  }

  function collectDescendants(id: string): string[] {
    const kids = movements.filter((movement) => movement.parentMovementId === id);
    return kids.reduce<string[]>((acc, kid) => [...acc, kid.id, ...collectDescendants(kid.id)], []);
  }

  function deleteStep(movement: CashMovement) {
    if (confirmingDeleteId !== movement.id) {
      setConfirmingDeleteId(movement.id);
      return;
    }

    const ids = [movement.id, ...collectDescendants(movement.id)];
    const removeLocally = () => {
      setMovements((current) => current.filter((item) => !ids.includes(item.id)));
      setConfirmingDeleteId(null);
    };

    if (readOnly) {
      removeLocally();
      return;
    }

    startTransition(async () => {
      try {
        await deleteCashMovementAction(movement.id); // los hijos caen por cascade en la DB
        removeLocally();
        setFeedback("Paso eliminado");
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo borrar el paso");
      }
    });
  }

  function nodeTitle(movement: CashMovement) {
    if (movement.kind === "Cambio") {
      const target = movement.acquiredAmount && movement.acquiredCurrency ? money(movement.acquiredAmount, movement.acquiredCurrency === "USD" ? "USD" : "ARS") : "—";
      return `Cambio → ${target}${movement.exchangeRate ? ` @ ${movement.exchangeRate.toLocaleString("es-AR")}` : ""}`;
    }
    if (movement.kind === "Reparto") return `Reparto · ${partnerName(movement.partnerId)}`;
    if (movement.kind === "Cheque") return `Cheque${movement.expectedReturnPercent ? ` · +${movement.expectedReturnPercent}%` : ""}`;
    if (movement.kind === "Plazo fijo") return `Plazo fijo${movement.expectedReturnPercent ? ` · ${movement.expectedReturnPercent}%` : ""}`;
    return movement.kind;
  }

  function renderStepForm(poolKey: string, paymentId: string, parentMovementId: string | null, poolCurrency: "ARS" | "USD", sourceProjectId: string | null) {
    if (openForm !== poolKey) return null;
    const isCambio = draft.kind === "Cambio";
    const isReparto = draft.kind === "Reparto";
    const isInvestment = draft.kind === "Cheque" || draft.kind === "Plazo fijo";
    const projectedReturn = isInvestment ? getProjectedReturn(Number(draft.amount), Number(draft.expectedReturnPercent), poolCurrency) : null;

    return (
      <div className="step-form">
        <div className="field-grid">
          <label className="field">
            <span>Paso</span>
            <select value={draft.kind} onChange={(event) => setDraft((current) => ({ ...current, kind: event.target.value as AllocationKind }))}>
              {allocationKinds.map((kind) => <option key={kind} value={kind}>{kind}</option>)}
            </select>
          </label>
          <label className="field">
            <span>Monto ({poolCurrency})</span>
            <input min="0" type="number" value={draft.amount} onChange={(event) => setDraft((current) => ({ ...current, amount: event.target.value }))} />
          </label>
          <label className="field">
            <span>Fecha</span>
            <input type="date" value={draft.date} onChange={(event) => setDraft((current) => ({ ...current, date: event.target.value }))} />
          </label>
        </div>

        {isCambio ? (
          <div className="field-grid">
            <label className="field">
              <span>Moneda destino</span>
              <select value={draft.targetCurrency} onChange={(event) => setDraft((current) => ({ ...current, targetCurrency: event.target.value as "ARS" | "USD" }))}>
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </label>
            <label className="field">
              <span>Tipo de cambio</span>
              <input min="0" placeholder="1500" type="number" value={draft.exchangeRate} onChange={(event) => setDraft((current) => ({ ...current, exchangeRate: event.target.value }))} />
            </label>
            <label className="field">
              <span>Resultado (opcional)</span>
              <input min="0" placeholder="se calcula solo" type="number" value={draft.targetAmount} onChange={(event) => setDraft((current) => ({ ...current, targetAmount: event.target.value }))} />
            </label>
          </div>
        ) : null}

        {isReparto ? (
          <label className="field">
            <span>Socio</span>
            <select value={draft.partnerId} onChange={(event) => setDraft((current) => ({ ...current, partnerId: event.target.value }))}>
              {partners.length === 0 ? <option value="">Sin socios cargados</option> : null}
              {partners.map((partner) => <option key={partner.id} value={partner.id}>{partner.name}</option>)}
            </select>
          </label>
        ) : null}

        {isInvestment ? (
          <div className="field-grid">
            <label className="field">
              <span>{draft.kind === "Cheque" ? "Interés del cheque %" : "Rendimiento esperado %"}</span>
              <input min="0" step="0.1" type="number" value={draft.expectedReturnPercent} onChange={(event) => setDraft((current) => ({ ...current, expectedReturnPercent: event.target.value }))} />
            </label>
            <label className="field">
              <span>Fecha esperada de cobro</span>
              <input type="date" value={draft.dueDate} onChange={(event) => setDraft((current) => ({ ...current, dueDate: event.target.value }))} />
            </label>
            <label className="field">
              <span>Interés real % (opcional)</span>
              <input min="0" step="0.1" type="number" value={draft.actualReturnPercent} onChange={(event) => setDraft((current) => ({ ...current, actualReturnPercent: event.target.value }))} />
            </label>
            {projectedReturn ? (
              <div className="investment-preview">
                <span>Resultado esperado</span>
                <strong>{money(projectedReturn.total, poolCurrency)}</strong>
                <small>Ganancia estimada: {money(projectedReturn.gain, poolCurrency)}</small>
              </div>
            ) : null}
          </div>
        ) : null}

        <label className="field">
          <span>Nota (opcional)</span>
          <input value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
        </label>

        <div className="quick-note-actions">
          <button className="command-primary" disabled={isPending} type="button" onClick={() => addStep(poolKey, paymentId, parentMovementId, poolCurrency, sourceProjectId)}>
            {isPending ? "Guardando…" : "Agregar paso"}
          </button>
          <button className="ghost-button" type="button" onClick={() => setOpenForm(null)}>Cancelar</button>
        </div>
      </div>
    );
  }

  function renderChildren(paymentId: string, parentMovementId: string | null, sourceProjectId: string | null) {
    return childrenOf(paymentId, parentMovementId).map((movement) => {
      const isPool = movement.kind === "Cambio";
      const poolCurrency: "ARS" | "USD" = movement.acquiredCurrency === "USD" ? "USD" : "ARS";
      const saldo = isPool ? Math.max(0, (movement.acquiredAmount ?? 0) - consumedUnder(paymentId, movement.id)) : 0;

      return (
        <div className={`flow-node kind-${movement.kind.toLowerCase().replace(" ", "-")}`} key={movement.id}>
          <div className="flow-node-row">
            <span className="flow-kind">{movement.kind}</span>
            <div className="flow-node-copy">
              <strong>{nodeTitle(movement)}</strong>
              <span>{[movement.concept, movement.notes].filter(Boolean).join(" · ")} · {dateLabel(movement.date)}</span>
              {movement.kind === "Cheque" || movement.kind === "Plazo fijo" ? (
                <span className="investment-result">
                  {investmentSummary(movement)}
                </span>
              ) : null}
            </div>
            <strong className="flow-amount">− {money(movement.amount, movement.currency)}</strong>
            <button
              className={confirmingDeleteId === movement.id ? "danger-confirm" : "flow-del"}
              disabled={isPending}
              type="button"
              onClick={() => deleteStep(movement)}
            >
              {confirmingDeleteId === movement.id ? "Confirmar" : "Borrar"}
            </button>
          </div>

          {isPool ? (
            <div className="flow-pool">
              <div className="flow-pool-head">
                <span className={saldo > 0.5 ? "flow-saldo has" : "flow-saldo"}>
                  {saldo > 0.5 ? `${money(saldo, poolCurrency)} sin asignar` : "Todo asignado"} · de {money(movement.acquiredAmount ?? 0, poolCurrency)}
                </span>
                {!readOnly && openForm !== movement.id ? (
                  <button className="flow-add" type="button" onClick={() => openStepForm(movement.id, poolCurrency, saldo)}>+ paso</button>
                ) : null}
              </div>
              {renderStepForm(movement.id, paymentId, movement.id, poolCurrency, sourceProjectId)}
              {renderChildren(paymentId, movement.id, sourceProjectId)}
            </div>
          ) : null}
        </div>
      );
    });
  }

  const sortedPayments = [...payments].sort((a, b) => b.date.localeCompare(a.date));

  return (
    <section className="executive-page finance-command">
      <header className="finance-command-head">
        <div>
          <h1>Flujo de Caja</h1>
          <p>Cada cobro y qué hiciste con esa plata, paso a paso.</p>
        </div>
        <span className={readOnly ? "readonly-badge" : "finance-feedback"}>{readOnly ? "Solo lectura" : feedback}</span>
      </header>

      <section className="finance-kpis">
        <FinanceKpi label="Cobrado" value={money(totals.collected)} tone="green" />
        <FinanceKpi label="Sin asignar" value={money(totals.unassigned)} tone="orange" />
        <FinanceKpi label="Repartido a socios" value={money(totals.distributed)} tone="blue" />
        <FinanceKpi label="En cheques / plazo / caja" value={money(totals.stored)} tone="neutral" />
        <FinanceKpi label="Rendimiento esperado" value={money(totals.expectedYield)} tone="green" />
      </section>

      <section className="finance-two-col">
        <div className="finance-flows">
          {sortedPayments.length === 0 ? (
            <div className="panel-empty">
              <strong>Todavia no hay cobros.</strong>
              <span>Registra pagos en los proyectos y aparecen aca como flujos para asignar.</span>
            </div>
          ) : null}

          {sortedPayments.map((payment) => {
            const poolKey = `cobro-${payment.id}`;
            const saldo = Math.max(0, payment.amount - consumedUnder(payment.id, null));
            const projectName = projectNames[payment.projectId] ?? "Proyecto";
            return (
              <article className="finance-flow" key={payment.id}>
                <header className="flow-cobro-head">
                  <div>
                    <span className="eyebrow">Cobro · {projectName}</span>
                    <strong>{money(payment.amount, payment.currency)}</strong>
                    <span className="flow-cobro-sub">{dateLabel(payment.date)} · {payment.method}{payment.note ? ` · ${payment.note}` : ""}</span>
                  </div>
                  <div className="flow-cobro-right">
                    <span className={saldo > 0.5 ? "flow-saldo has" : "flow-saldo"}>
                      {saldo > 0.5 ? `${money(saldo, payment.currency)} sin asignar` : "Todo asignado"}
                    </span>
                    {!readOnly && openForm !== poolKey ? (
                      <button className="flow-add" type="button" onClick={() => openStepForm(poolKey, payment.currency, saldo)}>+ paso</button>
                    ) : null}
                  </div>
                </header>
                {renderStepForm(poolKey, payment.id, null, payment.currency, payment.projectId)}
                <div className="flow-tree">{renderChildren(payment.id, null, payment.projectId)}</div>
              </article>
            );
          })}
        </div>

        <aside className="finance-side">
          <article className="socio-split">
            <h2>Repartido por socio</h2>
            {perPartner.length === 0 ? (
              <p className="settings-note">Sin socios cargados todavia.</p>
            ) : (
              perPartner.map((partner) => (
                <div className="socio-split-row" key={partner.name}>
                  <span>{partner.name.slice(0, 2).toUpperCase()}</span>
                  <strong>{partner.name}</strong>
                  <b>{money(partner.total)}</b>
                </div>
              ))
            )}
          </article>

          <article className="exchange-card">
            <span>Tipo de cambio de referencia</span>
            <strong>{referenceRate.toLocaleString("es-AR")} <small>ARS/USD (último cambio)</small></strong>
            <p className="settings-note">Los totales en pesos usan este valor para las partes en dólares.</p>
          </article>
        </aside>
      </section>
    </section>
  );
}

function getProjectedReturn(amount: number, percent: number, currency: "ARS" | "USD") {
  if (!amount || amount <= 0 || !percent || percent <= 0) return null;
  const gain = Math.round(amount * (percent / 100));
  return {
    gain,
    total: amount + gain,
    currency
  };
}

function investmentSummary(movement: CashMovement) {
  const percent = movement.actualReturnPercent ?? movement.expectedReturnPercent;
  if (!percent) {
    return movement.dueDate ? `Cobro esperado: ${dateLabel(movement.dueDate)}` : "Sin rendimiento cargado";
  }

  const gain = Math.round(movement.amount * (percent / 100));
  const total = movement.amount + gain;
  const label = movement.actualReturnPercent ? "Resultado real" : "Resultado esperado";
  const due = movement.dueDate ? ` · cobra ${dateLabel(movement.dueDate)}` : "";
  return `${label}: ${money(total, movement.currency)} (+${money(gain, movement.currency)})${due}`;
}

function FinanceKpi({ label, tone, value }: { label: string; tone: "blue" | "green" | "neutral" | "orange"; value: string }) {
  return (
    <article className={`finance-kpi ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </article>
  );
}

function defaultConcept(kind: AllocationKind) {
  if (kind === "Cambio") return "Cambio de moneda";
  if (kind === "Reparto") return "Reparto a socio";
  if (kind === "Cheque") return "Compra de cheque";
  if (kind === "Plazo fijo") return "Plazo fijo";
  if (kind === "Gasto") return "Gasto";
  return "Dejado en caja";
}
