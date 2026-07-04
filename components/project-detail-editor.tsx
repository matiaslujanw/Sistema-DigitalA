"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { Client, PaymentMethod, Project, ProjectEvent, ProjectNote, ProjectPayment, ProjectStatus } from "@/lib/types";
import { projectStatuses } from "@/lib/project-statuses";
import { dateLabel, daysBetween, money } from "@/lib/format";
import { StatusPill } from "./ui";

type EditableProject = Project & {
  notes: ProjectNote[];
  payments: ProjectPayment[];
};

const paymentMethods: PaymentMethod[] = ["Transferencia", "Efectivo", "USD", "Cheque", "Mixto"];
const noteTypes: ProjectNote["type"][] = ["Reunion", "Relevamiento", "Decision", "Pedido cliente", "Nota interna", "Bloqueo", "Alcance", "Cambio de alcance"];

export function ProjectDetailEditor({
  client,
  events,
  initialNotes,
  initialProject,
  initialPayments
}: {
  client: Client;
  events: ProjectEvent[];
  initialNotes: ProjectNote[];
  initialProject: Project;
  initialPayments: ProjectPayment[];
}) {
  const storageKey = `da-project-${initialProject.id}`;
  const [project, setProject] = useState<EditableProject>({ ...initialProject, notes: initialNotes, payments: initialPayments });
  const [paymentDraft, setPaymentDraft] = useState({
    amount: "",
    currency: initialProject.currency,
    date: "2026-07-03",
    method: initialProject.paymentMethod,
    note: ""
  });
  const [noteDraft, setNoteDraft] = useState({
    body: "",
    createsTask: false,
    date: "2026-07-04",
    owner: "Matias",
    title: "",
    type: "Relevamiento" as ProjectNote["type"]
  });

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);
    if (saved) {
      const parsed = JSON.parse(saved) as Partial<EditableProject>;
      setProject({
        ...initialProject,
        ...parsed,
        notes: parsed.notes ?? initialNotes,
        payments: parsed.payments ?? initialPayments
      });
    }
  }, [initialNotes, initialPayments, initialProject, storageKey]);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(project));
  }, [project, storageKey]);

  const paidAmount = useMemo(
    () => project.payments.filter((payment) => payment.currency === project.currency).reduce((sum, payment) => sum + payment.amount, 0),
    [project.currency, project.payments]
  );
  const balance = Math.max(0, project.salePrice - paidAmount);
  const paidPercent = project.salePrice > 0 ? Math.min(100, Math.round((paidAmount / project.salePrice) * 100)) : 0;
  const sortedEvents = [...events].sort((a, b) => a.date.localeCompare(b.date));
  const firstEvent = sortedEvents[0];
  const lastEvent = sortedEvents[sortedEvents.length - 1];
  const elapsedDays = firstEvent && lastEvent ? daysBetween(firstEvent.date, lastEvent.date) : 0;

  function updateProject<T extends keyof EditableProject>(key: T, value: EditableProject[T]) {
    setProject((current) => ({ ...current, [key]: value }));
  }

  function addPayment() {
    const amount = Number(paymentDraft.amount);
    if (!amount || amount <= 0) return;

    const payment: ProjectPayment = {
      id: `local-${Date.now()}`,
      projectId: project.id,
      amount,
      currency: paymentDraft.currency,
      date: paymentDraft.date,
      method: paymentDraft.method,
      note: paymentDraft.note || "Pago cargado manualmente"
    };

    setProject((current) => ({ ...current, payments: [payment, ...current.payments] }));
    setPaymentDraft((current) => ({ ...current, amount: "", note: "" }));
  }

  function addNote() {
    if (!noteDraft.title.trim() || !noteDraft.body.trim()) return;

    const note: ProjectNote = {
      id: `local-note-${Date.now()}`,
      projectId: project.id,
      body: noteDraft.body,
      createsTask: noteDraft.createsTask,
      date: noteDraft.date,
      owner: noteDraft.owner,
      title: noteDraft.title,
      type: noteDraft.type
    };

    setProject((current) => ({ ...current, notes: [note, ...current.notes] }));
    setNoteDraft((current) => ({ ...current, body: "", createsTask: false, title: "" }));
  }

  function resetLocalChanges() {
    window.localStorage.removeItem(storageKey);
    setProject({ ...initialProject, notes: initialNotes, payments: initialPayments });
  }

  return (
    <section className="project-detail-page">
      <header className="detail-hero">
        <div>
          <Link href="/proyectos" className="back-link">← Proyectos</Link>
          <span className="eyebrow">{client.name} · {client.industry}</span>
          <h1>{project.name}</h1>
          <div className="detail-meta">
            <StatusPill status={project.status} />
            <span>{project.contractSigned ? "Contrato firmado" : "Contrato pendiente"}</span>
            <span>{elapsedDays} dias trazados</span>
          </div>
        </div>
        <button className="ghost-button" type="button" onClick={resetLocalChanges}>Reset local</button>
      </header>

      <section className="detail-grid">
        <article className="panel-block edit-panel">
          <div className="block-heading">
            <span className="eyebrow">Estado y contrato</span>
            <span>Editable local</span>
          </div>

          <label className="field">
            <span>Estado del proyecto</span>
            <select value={project.status} onChange={(event) => updateProject("status", event.target.value as ProjectStatus)}>
              {projectStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>

          <label className="field">
            <span>Proximo hito</span>
            <input value={project.nextMilestone} onChange={(event) => updateProject("nextMilestone", event.target.value)} />
          </label>

          <div className="field-grid">
            <label className="field checkbox-field">
              <input
                checked={project.contractSigned}
                type="checkbox"
                onChange={(event) => updateProject("contractSigned", event.target.checked)}
              />
              <span>Contrato firmado</span>
            </label>

            <label className="field">
              <span>Fecha contrato</span>
              <input
                disabled={!project.contractSigned}
                type="date"
                value={project.contractDate ?? ""}
                onChange={(event) => updateProject("contractDate", event.target.value || null)}
              />
            </label>
          </div>

          <div className="field-grid">
            <label className="field">
              <span>Total pactado</span>
              <input
                min="0"
                type="number"
                value={project.salePrice}
                onChange={(event) => updateProject("salePrice", Number(event.target.value))}
              />
            </label>

            <label className="field">
              <span>Moneda</span>
              <select value={project.currency} onChange={(event) => updateProject("currency", event.target.value as "ARS" | "USD")}>
                <option value="ARS">ARS</option>
                <option value="USD">USD</option>
              </select>
            </label>
          </div>
        </article>

        <article className="panel-block finance-summary-card">
          <span className="eyebrow">Cobranza</span>
          <strong>{money(paidAmount, project.currency)}</strong>
          <small>cobrado de {money(project.salePrice, project.currency)}</small>
          <div className="progress-track">
            <span style={{ width: `${paidPercent}%` }} />
          </div>
          <div className="money-split">
            <div>
              <span>Cobrado</span>
              <strong>{paidPercent}%</strong>
            </div>
            <div>
              <span>Pendiente</span>
              <strong>{money(balance, project.currency)}</strong>
            </div>
          </div>
        </article>

        <article className="panel-block payment-panel">
          <div className="block-heading">
            <span className="eyebrow">Pagos por fecha</span>
            <span>{project.payments.length} registros</span>
          </div>

          <div className="payment-form">
            <input
              min="0"
              placeholder="Monto"
              type="number"
              value={paymentDraft.amount}
              onChange={(event) => setPaymentDraft((current) => ({ ...current, amount: event.target.value }))}
            />
            <input
              type="date"
              value={paymentDraft.date}
              onChange={(event) => setPaymentDraft((current) => ({ ...current, date: event.target.value }))}
            />
            <select
              value={paymentDraft.currency}
              onChange={(event) => setPaymentDraft((current) => ({ ...current, currency: event.target.value as "ARS" | "USD" }))}
            >
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
            <select
              value={paymentDraft.method}
              onChange={(event) => setPaymentDraft((current) => ({ ...current, method: event.target.value as PaymentMethod }))}
            >
              {paymentMethods.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
            <input
              placeholder="Nota"
              value={paymentDraft.note}
              onChange={(event) => setPaymentDraft((current) => ({ ...current, note: event.target.value }))}
            />
            <button type="button" onClick={addPayment}>Agregar pago</button>
          </div>

          <div className="data-list">
            {project.payments.map((payment) => (
              <article className="data-row" key={payment.id}>
                <div>
                  <strong>{payment.note}</strong>
                  <span>{dateLabel(payment.date)} · {payment.method}</span>
                </div>
                <div>
                  <strong>{money(payment.amount, payment.currency)}</strong>
                  <span>{payment.currency}</span>
                </div>
              </article>
            ))}
          </div>
        </article>

        <article className="panel-block trace-board detail-trace">
          <div className="block-heading">
            <span className="eyebrow">Trazabilidad</span>
            <span>{sortedEvents.length} eventos</span>
          </div>
          <div className="event-stack">
            {sortedEvents.map((event) => (
              <article className="event-line expanded" key={event.id}>
                <span>{event.type} · {dateLabel(event.date)}</span>
                <strong>{event.title}</strong>
                <p>{event.notes}</p>
                <small>{event.owner} · {event.hours} h</small>
              </article>
            ))}
          </div>
        </article>

        <article className="panel-block notes-panel">
          <div className="block-heading">
            <span className="eyebrow">Notas / Relevamientos</span>
            <span>{project.notes.length} notas</span>
          </div>

          <div className="note-form">
            <div className="field-grid">
              <label className="field">
                <span>Tipo</span>
                <select value={noteDraft.type} onChange={(event) => setNoteDraft((current) => ({ ...current, type: event.target.value as ProjectNote["type"] }))}>
                  {noteTypes.map((type) => (
                    <option key={type} value={type}>{type}</option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Fecha</span>
                <input type="date" value={noteDraft.date} onChange={(event) => setNoteDraft((current) => ({ ...current, date: event.target.value }))} />
              </label>
              <label className="field">
                <span>Responsable</span>
                <input value={noteDraft.owner} onChange={(event) => setNoteDraft((current) => ({ ...current, owner: event.target.value }))} />
              </label>
              <label className="field checkbox-field">
                <input
                  checked={noteDraft.createsTask}
                  type="checkbox"
                  onChange={(event) => setNoteDraft((current) => ({ ...current, createsTask: event.target.checked }))}
                />
                <span>Genera tarea/feature</span>
              </label>
            </div>
            <label className="field">
              <span>Titulo</span>
              <input value={noteDraft.title} onChange={(event) => setNoteDraft((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="field">
              <span>Texto del relevamiento</span>
              <textarea value={noteDraft.body} onChange={(event) => setNoteDraft((current) => ({ ...current, body: event.target.value }))} />
            </label>
            <button className="command-button note-submit" type="button" onClick={addNote}>Agregar nota</button>
          </div>

          <div className="notes-list">
            {project.notes.map((note) => (
              <article className="note-card" key={note.id}>
                <span>{note.type} · {dateLabel(note.date)} · {note.owner}</span>
                <strong>{note.title}</strong>
                <p>{note.body}</p>
                {note.createsTask ? <small>Genera tarea o feature</small> : null}
              </article>
            ))}
          </div>
        </article>
      </section>
    </section>
  );
}
