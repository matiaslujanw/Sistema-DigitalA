"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addCashMovementAction } from "@/app/actions/projects";
import type { CashMovement, FinanceOperation } from "@/lib/types";
import { dateLabel, money } from "@/lib/format";

const operationOptions: FinanceOperation[] = ["Cobro", "Reparto socios", "Compra divisa", "Inversion", "Gasto", "Reserva"];

export function FinanceWorkspace({
  initialMovements,
  projectNames,
  source
}: {
  initialMovements: CashMovement[];
  projectNames: Record<string, string>;
  source: "mock" | "supabase";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [movements, setMovements] = useState<CashMovement[]>(initialMovements);
  const [feedback, setFeedback] = useState(source === "supabase" ? "Conectado a Supabase" : "Fallback mock");
  const [draft, setDraft] = useState({
    concept: "",
    amount: "",
    currency: "ARS" as "ARS" | "USD",
    date: "2026-07-03",
    operation: "Reparto socios" as FinanceOperation,
    acquiredCurrency: "USD" as "USD" | "EUR" | "USDT" | "ARS",
    acquiredAmount: "",
    exchangeRate: "",
    expectedReturnPercent: "",
    actualReturnPercent: "",
    notes: ""
  });

  const destinationTotals = useMemo(() => {
    return movements.reduce<Record<string, number>>((acc, movement) => {
      acc[movement.destination] = (acc[movement.destination] ?? 0) + movement.amount;
      return acc;
    }, {});
  }, [movements]);

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
      setDraft((current) => ({ ...current, concept: "", amount: "", acquiredAmount: "", exchangeRate: "", notes: "" }));
      return;
    }

    startTransition(async () => {
      try {
        await addCashMovementAction(movement);
        setMovements((current) => [movement, ...current]);
        setDraft((current) => ({ ...current, concept: "", amount: "", acquiredAmount: "", exchangeRate: "", notes: "" }));
        setFeedback("Movimiento guardado en Supabase");
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo guardar el movimiento");
      }
    });
  }

  return (
    <section className="route-grid finance-layout">
      <article className="panel-block finance-form-panel">
        <div className="block-heading">
          <span className="eyebrow">Nueva decision de caja</span>
          <span>{source === "supabase" ? "Supabase" : "Mock"}</span>
        </div>
        <p className="form-feedback">{feedback}</p>

        <div className="finance-form">
          <label className="field">
            <span>Operacion</span>
            <select value={draft.operation} onChange={(event) => setDraft((current) => ({ ...current, operation: event.target.value as FinanceOperation }))}>
              {operationOptions.map((operation) => (
                <option key={operation} value={operation}>{operation}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Concepto</span>
            <input value={draft.concept} onChange={(event) => setDraft((current) => ({ ...current, concept: event.target.value }))} />
          </label>

          <div className="field-grid">
            <label className="field">
              <span>Monto origen</span>
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
                <span>Divisa comprada</span>
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

          {draft.operation === "Inversion" ? (
            <div className="field-grid">
              <label className="field">
                <span>Rendimiento esperado %</span>
                <input type="number" value={draft.expectedReturnPercent} onChange={(event) => setDraft((current) => ({ ...current, expectedReturnPercent: event.target.value }))} />
              </label>
              <label className="field">
                <span>Rendimiento real %</span>
                <input type="number" value={draft.actualReturnPercent} onChange={(event) => setDraft((current) => ({ ...current, actualReturnPercent: event.target.value }))} />
              </label>
            </div>
          ) : null}

          <label className="field">
            <span>Notas</span>
            <input value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
          </label>

          <button className="command-button" disabled={isPending} type="button" onClick={addMovement}>
            {isPending ? "Guardando" : "Agregar movimiento"}
          </button>
        </div>
      </article>

      <article className="panel-block">
        <div className="block-heading">
          <span className="eyebrow">Asignacion</span>
          <span>Destino</span>
        </div>
        <div className="cash-grid vertical">
          {Object.entries(destinationTotals).map(([destination, value]) => (
            <div key={destination}>
              <span>{destination}</span>
              <strong>{money(value)}</strong>
            </div>
          ))}
        </div>
      </article>

      <article className="panel-block movements-panel">
        <div className="block-heading">
          <span className="eyebrow">Libro de movimientos</span>
          <span>{movements.length} registros</span>
        </div>
        <div className="data-list">
          {movements.map((movement) => (
            <article className="data-row" key={movement.id}>
              <div>
                <strong>{movement.concept}</strong>
                <span>{projectNames[movement.sourceProjectId ?? ""] ?? "Movimiento general"} · {dateLabel(movement.date)} · {movement.operation}</span>
              </div>
              <div>
                <strong>{money(movement.amount, movement.currency)}</strong>
                <span>{movement.destination}</span>
              </div>
              <p>{movementDetails(movement)}</p>
            </article>
          ))}
        </div>
      </article>
    </section>
  );
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
  if (movement.exchangeRate) {
    pieces.push(`TC ${movement.exchangeRate}`);
  }
  if (movement.expectedReturnPercent) {
    pieces.push(`Rend. esperado ${movement.expectedReturnPercent}%`);
  }
  if (movement.actualReturnPercent) {
    pieces.push(`Rend. real ${movement.actualReturnPercent}%`);
  }
  return pieces.filter(Boolean).join(" · ");
}
