"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addMaintenanceAction, markMaintenancePaidAction } from "@/app/actions/projects";
import { getBillingState } from "@/lib/billing";
import { money } from "@/lib/format";
import type { Client, MaintenanceContract, Project } from "@/lib/types";

export function MaintenanceWorkspace({
  clients,
  contracts: initialContracts,
  projects,
  source
}: {
  clients: Client[];
  contracts: MaintenanceContract[];
  projects: Project[];
  source: "mock" | "supabase";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [contracts, setContracts] = useState<MaintenanceContract[]>(initialContracts);
  const [showForm, setShowForm] = useState(false);
  const [feedback, setFeedback] = useState(source === "supabase" ? "Conectado a Supabase" : "Modo local: los cambios quedan solo en esta sesion.");
  const [draft, setDraft] = useState({
    amount: "",
    currency: "ARS" as "ARS" | "USD",
    dueDay: "10",
    notes: "",
    projectId: projects.find((project) => project.kind === "Cliente")?.id ?? projects[0]?.id ?? "",
    systemName: ""
  });

  const activeContracts = contracts.filter((contract) => contract.active);
  const enriched = useMemo(
    () =>
      activeContracts
        .map((contract) => ({
          contract,
          project: projects.find((project) => project.id === contract.projectId) ?? null,
          state: getBillingState({ dueDay: contract.dueDay, lastPaidMonth: contract.lastPaidMonth })
        }))
        .sort((a, b) => {
          if (a.state.isPaid !== b.state.isPaid) return a.state.isPaid ? 1 : -1;
          return a.state.daysUntil - b.state.daysUntil;
        }),
    [activeContracts, projects]
  );
  const pending = enriched.filter((item) => !item.state.isPaid);
  const overdue = pending.filter((item) => item.state.isOverdue);
  const dueSoon = pending.filter((item) => !item.state.isOverdue && item.state.daysUntil <= 7);
  const arsMonthly = activeContracts.filter((contract) => contract.currency === "ARS").reduce((sum, contract) => sum + contract.amount, 0);
  const usdMonthly = activeContracts.filter((contract) => contract.currency === "USD").reduce((sum, contract) => sum + contract.amount, 0);

  function selectedClientName(projectId: string) {
    const project = projects.find((item) => item.id === projectId);
    const client = project?.clientId ? clients.find((item) => item.id === project.clientId) : null;
    return client?.name ?? project?.name ?? "Cliente";
  }

  function saveMaintenance() {
    const amount = Number(draft.amount);
    if (!draft.projectId || !draft.systemName.trim() || !amount || amount <= 0) return;

    const next: MaintenanceContract = {
      id: `local-maint-${Date.now()}`,
      active: true,
      amount,
      clientName: selectedClientName(draft.projectId),
      currency: draft.currency,
      dueDay: Math.min(31, Math.max(1, Number(draft.dueDay) || 10)),
      lastPaidMonth: null,
      notes: draft.notes.trim(),
      projectId: draft.projectId,
      systemName: draft.systemName.trim()
    };

    if (source !== "supabase") {
      setContracts((current) => [next, ...current]);
      resetDraft();
      return;
    }

    startTransition(async () => {
      try {
        const newId = await addMaintenanceAction({
          amount: next.amount,
          clientName: next.clientName,
          currency: next.currency,
          dueDay: next.dueDay,
          notes: next.notes,
          projectId: next.projectId,
          systemName: next.systemName
        });
        setContracts((current) => [{ ...next, id: newId }, ...current]);
        resetDraft();
        setFeedback("Mantenimiento creado");
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo crear el mantenimiento");
      }
    });
  }

  function resetDraft() {
    setDraft((current) => ({ ...current, amount: "", notes: "", systemName: "" }));
    setShowForm(false);
  }

  function markPaid(contract: MaintenanceContract, monthKey: string) {
    const applyLocal = () => {
      setContracts((current) => current.map((item) => (item.id === contract.id ? { ...item, lastPaidMonth: monthKey } : item)));
    };

    if (source !== "supabase") {
      applyLocal();
      return;
    }

    startTransition(async () => {
      try {
        await markMaintenancePaidAction(contract.id, monthKey);
        applyLocal();
        setFeedback(`${contract.systemName} marcado como cobrado`);
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo marcar como cobrado");
      }
    });
  }

  return (
    <section className="executive-page maintenance-command">
      <header className="maintenance-head">
        <div>
          <span>Operación / Cobros recurrentes</span>
          <h1>Mantenimientos</h1>
          <p>Sistemas activos con mantenimiento mensual, vencimientos y cobros del mes.</p>
        </div>
        <button className="command-primary" type="button" onClick={() => setShowForm((current) => !current)}>
          + Nuevo mantenimiento
        </button>
      </header>

      {showForm ? (
        <article className="maintenance-drawer">
          <header>
            <span className="eyebrow">Nuevo cobro mensual</span>
            <strong>{feedback}</strong>
          </header>
          <div className="finance-form compact">
            <div className="field-grid">
              <label className="field">
                <span>Proyecto / sistema</span>
                <select value={draft.projectId} onChange={(event) => setDraft((current) => ({ ...current, projectId: event.target.value }))}>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{project.name}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Nombre del mantenimiento</span>
                <input value={draft.systemName} onChange={(event) => setDraft((current) => ({ ...current, systemName: event.target.value }))} />
              </label>
              <label className="field">
                <span>Día de cobro</span>
                <input min="1" max="31" type="number" value={draft.dueDay} onChange={(event) => setDraft((current) => ({ ...current, dueDay: event.target.value }))} />
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
                <span>Nota</span>
                <input value={draft.notes} onChange={(event) => setDraft((current) => ({ ...current, notes: event.target.value }))} />
              </label>
            </div>
            <div className="quick-note-actions">
              <button className="command-primary" disabled={isPending} type="button" onClick={saveMaintenance}>
                {isPending ? "Guardando..." : "Guardar mantenimiento"}
              </button>
              <button className="ghost-button" type="button" onClick={() => setShowForm(false)}>Cancelar</button>
            </div>
          </div>
        </article>
      ) : null}

      <section className="maintenance-kpis">
        <MaintenanceKpi label="Cobros del mes" value={String(pending.length)} note={`${overdue.length} vencidos`} tone={overdue.length > 0 ? "red" : "blue"} />
        <MaintenanceKpi label="Vencen en 7 dias" value={String(dueSoon.length)} note="Prioridad operativa" tone="orange" />
        <MaintenanceKpi label="Mensual ARS" value={money(arsMonthly)} note="Mantenimientos activos" tone="green" />
        <MaintenanceKpi label="Mensual USD" value={money(usdMonthly, "USD")} note="Mantenimientos activos" tone="neutral" />
      </section>

      <section className="maintenance-board">
        <div className="maintenance-list">
          {enriched.map(({ contract, project, state }) => (
            <article className={`maintenance-row ${state.tone}`} key={contract.id}>
              <div className="maintenance-main">
                <span>{contract.clientName}</span>
                <strong>{contract.systemName}</strong>
                <small>{project ? <Link href={`/proyectos/${project.id}`}>{project.name}</Link> : "Proyecto no encontrado"}{contract.notes ? ` · ${contract.notes}` : ""}</small>
              </div>
              <div>
                <span>Monto</span>
                <strong>{money(contract.amount, contract.currency)}</strong>
              </div>
              <div>
                <span>Vencimiento</span>
                <strong>{state.label}</strong>
                <small>Día {contract.dueDay}</small>
              </div>
              <button disabled={isPending || state.isPaid} type="button" onClick={() => markPaid(contract, state.monthKey)}>
                {state.isPaid ? "Cobrado" : "Marcar cobrado"}
              </button>
            </article>
          ))}
          {enriched.length === 0 ? (
            <div className="panel-empty">
              <strong>Todavía no hay mantenimientos.</strong>
              <span>Cargá los sistemas que cobran soporte mensual.</span>
            </div>
          ) : null}
        </div>

        <aside className="maintenance-alerts">
          <h2>Alertas de cobro</h2>
          {pending.slice(0, 5).map(({ contract, state }) => (
            <div className={`billing-alert ${state.tone}`} key={contract.id}>
              <strong>{contract.systemName}</strong>
              <span>{state.label} · {money(contract.amount, contract.currency)}</span>
            </div>
          ))}
          {pending.length === 0 ? (
            <div className="billing-alert paid">
              <strong>Mes al día</strong>
              <span>Todos los mantenimientos activos están cobrados.</span>
            </div>
          ) : null}
        </aside>
      </section>
    </section>
  );
}

function MaintenanceKpi({ label, note, tone, value }: { label: string; note: string; tone: "blue" | "green" | "neutral" | "orange" | "red"; value: string }) {
  return (
    <article className={`maintenance-kpi ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <small>{note}</small>
    </article>
  );
}
