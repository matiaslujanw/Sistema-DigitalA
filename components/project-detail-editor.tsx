"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { addProjectEventAction, addProjectNoteAction, addProjectPaymentAction, deleteProjectAction, deleteProjectEventAction, deleteProjectNoteAction, deleteProjectPaymentAction, updateProjectAction } from "@/app/actions/projects";
import type { Client, Cost, Idea, PaymentMethod, Project, ProjectEvent, ProjectNote, ProjectPayment, ProjectStatus } from "@/lib/types";
import { projectStatuses } from "@/lib/project-statuses";
import { projectVerticals } from "@/lib/verticals";
import { dateLabel, daysBetween, money } from "@/lib/format";
import { StatusPill } from "./ui";

type EditableProject = Project & {
  notes: ProjectNote[];
  payments: ProjectPayment[];
};

const paymentMethods: PaymentMethod[] = ["Transferencia", "Efectivo", "USD", "Cheque", "Mixto"];
const noteTypes: ProjectNote["type"][] = ["Reunion", "Relevamiento", "Decision", "Pedido cliente", "Nota interna", "Bloqueo", "Alcance", "Cambio de alcance"];
const eventTypes: ProjectEvent["type"][] = ["Reunion", "Entrega", "Feature", "Implementacion", "Decision", "Relevamiento", "Nota", "Pedido cliente", "Bloqueo", "Cambio de alcance"];

export function ProjectDetailEditor({
  client,
  costs,
  events: initialEvents,
  ideas,
  initialNotes,
  initialProject,
  initialPayments,
  partnerNames,
  source
}: {
  client: Client | null;
  costs: Cost[];
  events: ProjectEvent[];
  ideas: Idea[];
  initialNotes: ProjectNote[];
  initialProject: Project;
  initialPayments: ProjectPayment[];
  partnerNames: string[];
  source: "mock" | "supabase";
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [project, setProject] = useState<EditableProject>({ ...initialProject, notes: initialNotes, payments: initialPayments });
  const [events, setEvents] = useState<ProjectEvent[]>(initialEvents);
  const [confirmingDeleteId, setConfirmingDeleteId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState(
    source === "supabase"
      ? "Conectado a Supabase"
      : "Estas viendo datos de ejemplo, no tu base: guardar y borrar estan desactivados porque no habria donde persistirlos."
  );
  // Un boton gris sin motivo es peor que un boton que no esta.
  const readOnly = source !== "supabase";
  const readOnlyReason = readOnly ? "Desactivado: la app esta con datos de ejemplo, sin conexion a Supabase" : undefined;
  const [showDeleteProject, setShowDeleteProject] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const today = new Date().toISOString().slice(0, 10);
  const [paymentDraft, setPaymentDraft] = useState({
    amount: "",
    currency: initialProject.currency,
    date: today,
    method: initialProject.paymentMethod,
    note: ""
  });
  const [noteDraft, setNoteDraft] = useState({
    body: "",
    createsTask: false,
    date: today,
    owner: partnerNames[0] ?? "",
    title: "",
    type: "Relevamiento" as ProjectNote["type"]
  });
  const [eventDraft, setEventDraft] = useState({
    date: today,
    hours: "1",
    notes: "",
    owner: partnerNames[0] ?? "",
    title: "",
    type: "Reunion" as ProjectEvent["type"]
  });

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
  const totalHours = events.reduce((sum, event) => sum + event.hours, 0);

  // Rentabilidad: cobrado menos costos asociados, normalizado a la moneda del proyecto (TC referencia 1210).
  const referenceRate = 1210;
  const projectCosts = costs.reduce((sum, cost) => {
    if (cost.currency === project.currency) return sum + cost.amount;
    return sum + (cost.currency === "USD" ? cost.amount * referenceRate : cost.amount / referenceRate);
  }, 0);
  const profit = paidAmount - projectCosts;
  const realMargin = paidAmount > 0 ? Math.round((profit / paidAmount) * 100) : null;

  function updateProject<T extends keyof EditableProject>(key: T, value: EditableProject[T]) {
    setProject((current) => ({ ...current, [key]: value }));
  }

  function saveProjectChanges() {
    if (source !== "supabase") return;

    startTransition(async () => {
      try {
        await updateProjectAction(project.id, {
          contractDate: project.contractDate,
          contractSigned: project.contractSigned,
          currency: project.currency,
          deployUrl: project.deployUrl,
          dueDate: project.dueDate,
          generatesRevenue: project.generatesRevenue,
          kind: project.kind,
          nextMilestone: project.nextMilestone,
          paymentMethod: project.paymentMethod,
          salePrice: project.salePrice,
          status: project.status,
          summary: project.summary,
          vertical: project.vertical
        });
        setFeedback("Cambios guardados en Supabase");
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo guardar el proyecto");
      }
    });
  }

  // Borrar un proyecto se lleva puestos pagos, notas y eventos y no tiene
  // vuelta atras, asi que pedimos el nombre escrito en vez de un doble click.
  const deleteArmed = deleteConfirmText.trim() === project.name.trim();

  function deleteProject() {
    if (!deleteArmed || source !== "supabase") return;

    startTransition(async () => {
      try {
        const result = await deleteProjectAction(project.id);
        router.push("/proyectos");
        router.refresh();
        if (result.removedClient) {
          setFeedback(`Proyecto y cliente ${client?.name ?? ""} eliminados`);
        }
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo borrar el proyecto");
        setShowDeleteProject(false);
      }
    });
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

    if (source !== "supabase") {
      setProject((current) => ({ ...current, payments: [payment, ...current.payments] }));
      setPaymentDraft((current) => ({ ...current, amount: "", note: "" }));
      return;
    }

    startTransition(async () => {
      try {
        const newId = await addProjectPaymentAction({
          amount,
          currency: paymentDraft.currency,
          date: paymentDraft.date,
          method: paymentDraft.method,
          note: payment.note,
          projectId: project.id
        });
        setProject((current) => ({ ...current, payments: [{ ...payment, id: newId }, ...current.payments] }));
        setPaymentDraft((current) => ({ ...current, amount: "", note: "" }));
        setFeedback("Pago guardado en Supabase");
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo guardar el pago");
      }
    });
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

    if (source !== "supabase") {
      setProject((current) => ({ ...current, notes: [note, ...current.notes] }));
      setNoteDraft((current) => ({ ...current, body: "", createsTask: false, title: "" }));
      return;
    }

    startTransition(async () => {
      try {
        const newId = await addProjectNoteAction({
          body: note.body,
          createsTask: note.createsTask,
          date: note.date,
          owner: note.owner,
          projectId: project.id,
          title: note.title,
          type: note.type
        });
        setProject((current) => ({ ...current, notes: [{ ...note, id: newId }, ...current.notes] }));
        setNoteDraft((current) => ({ ...current, body: "", createsTask: false, title: "" }));
        setFeedback("Nota guardada en Supabase");
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo guardar la nota");
      }
    });
  }

  function addEvent() {
    if (!eventDraft.title.trim()) return;

    const event: ProjectEvent = {
      id: `local-event-${Date.now()}`,
      projectId: project.id,
      type: eventDraft.type,
      title: eventDraft.title.trim(),
      date: eventDraft.date,
      hours: Number(eventDraft.hours) || 0,
      owner: eventDraft.owner.trim() || "Sin responsable",
      notes: eventDraft.notes.trim()
    };

    const resetEventDraft = () => setEventDraft((current) => ({ ...current, hours: "1", notes: "", title: "" }));

    if (source !== "supabase") {
      setEvents((current) => [event, ...current]);
      resetEventDraft();
      return;
    }

    startTransition(async () => {
      try {
        const newId = await addProjectEventAction({
          date: event.date,
          hours: event.hours,
          notes: event.notes,
          owner: event.owner,
          projectId: project.id,
          title: event.title,
          type: event.type
        });
        setEvents((current) => [{ ...event, id: newId }, ...current]);
        resetEventDraft();
        setFeedback(`${event.type} registrada en Supabase`);
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo guardar la actividad");
      }
    });
  }

  function deleteEvent(event: ProjectEvent) {
    const confirmId = `event-${event.id}`;
    if (confirmingDeleteId !== confirmId) {
      setConfirmingDeleteId(confirmId);
      return;
    }

    const removeLocally = () => {
      setEvents((current) => current.filter((item) => item.id !== event.id));
      setConfirmingDeleteId(null);
    };

    if (source !== "supabase") {
      removeLocally();
      return;
    }

    startTransition(async () => {
      try {
        await deleteProjectEventAction(event.id);
        removeLocally();
        setFeedback("Actividad eliminada");
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo borrar la actividad");
      }
    });
  }

  function deletePayment(payment: ProjectPayment) {
    const confirmId = `payment-${payment.id}`;
    if (confirmingDeleteId !== confirmId) {
      setConfirmingDeleteId(confirmId);
      return;
    }

    const removeLocally = () => {
      setProject((current) => ({ ...current, payments: current.payments.filter((item) => item.id !== payment.id) }));
      setConfirmingDeleteId(null);
    };

    if (source !== "supabase") {
      removeLocally();
      return;
    }

    startTransition(async () => {
      try {
        await deleteProjectPaymentAction(payment.id);
        removeLocally();
        setFeedback("Pago eliminado");
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo borrar el pago");
      }
    });
  }

  function deleteNote(note: ProjectNote) {
    const confirmId = `note-${note.id}`;
    if (confirmingDeleteId !== confirmId) {
      setConfirmingDeleteId(confirmId);
      return;
    }

    const removeLocally = () => {
      setProject((current) => ({ ...current, notes: current.notes.filter((item) => item.id !== note.id) }));
      setConfirmingDeleteId(null);
    };

    if (source !== "supabase") {
      removeLocally();
      return;
    }

    startTransition(async () => {
      try {
        await deleteProjectNoteAction(note.id);
        removeLocally();
        setFeedback("Nota eliminada");
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo borrar la nota");
      }
    });
  }

  return (
    <section className="project-detail-page">
      <header className="detail-hero">
        <div>
          <Link href="/proyectos" className="back-link">← Proyectos</Link>
          <span className="eyebrow">
            {client ? (
              <>
                <Link className="inline-link" href={`/clientes/${client.id}`}>{client.name}</Link> · {client.industry}
              </>
            ) : (
              <>Producto propio{project.vertical ? ` · ${project.vertical}` : ""}</>
            )}
          </span>
          <h1>{project.name}</h1>
          <div className="detail-meta">
            <StatusPill status={project.status} />
            <span>{project.contractSigned ? "Contrato firmado" : "Contrato pendiente"}</span>
            <span>{elapsedDays} dias trazados</span>
            {project.dueDate ? <DueBadge dueDate={project.dueDate} status={project.status} /> : <span className="muted-text">Entrega sin definir — cargala abajo</span>}
          </div>
        </div>
        <div className="detail-hero-actions">
          <button className="primary-button" disabled={isPending || readOnly} title={readOnlyReason} type="button" onClick={saveProjectChanges}>
            {isPending ? "Guardando…" : "Guardar cambios"}
          </button>
          <button
            className="danger-button"
            disabled={isPending || readOnly}
            title={readOnlyReason}
            type="button"
            onClick={() => {
              setShowDeleteProject((current) => !current);
              setDeleteConfirmText("");
            }}
          >
            Borrar proyecto
          </button>
          {readOnly ? <span className="readonly-badge" title={readOnlyReason}>Solo lectura</span> : null}
        </div>
      </header>

      {showDeleteProject ? (
        <section className="danger-zone" role="group" aria-label="Borrar proyecto">
          <div>
            <strong>Borrar “{project.name}” definitivamente</strong>
            <p>
              Se borran tambien sus {project.payments.length} pagos, {project.notes.length} notas y {events.length} eventos.
              Los costos, movimientos de caja e ideas se conservan, pero quedan sin proyecto asignado.
              {" "}Esto no se puede deshacer.
            </p>
          </div>
          <div className="danger-zone-confirm">
            <label className="field">
              <span>Escribi <code>{project.name}</code> para confirmar</span>
              <input
                aria-label={`Escribi ${project.name} para confirmar el borrado`}
                autoComplete="off"
                placeholder={project.name}
                value={deleteConfirmText}
                onChange={(event) => setDeleteConfirmText(event.target.value)}
              />
            </label>
            <div className="danger-zone-buttons">
              <button className="danger-button" disabled={!deleteArmed || isPending} type="button" onClick={deleteProject}>
                {isPending ? "Borrando…" : "Borrar para siempre"}
              </button>
              <button className="ghost-button" disabled={isPending} type="button" onClick={() => setShowDeleteProject(false)}>
                Cancelar
              </button>
            </div>
          </div>
        </section>
      ) : null}

      <p className="detail-feedback">{feedback}</p>

      <section className="detail-grid">
        <article className="panel-block edit-panel">
          <div className="block-heading">
            <span className="eyebrow">Ficha del producto</span>
            <span>{project.kind}</span>
          </div>

          <div className="kind-switch" role="group" aria-label="Tipo de proyecto">
            <button
              type="button"
              className={project.kind === "Propio" ? "active" : ""}
              aria-pressed={project.kind === "Propio"}
              onClick={() => updateProject("kind", "Propio")}
            >
              Producto propio
            </button>
            <button
              type="button"
              className={project.kind === "Cliente" ? "active" : ""}
              aria-pressed={project.kind === "Cliente"}
              onClick={() => updateProject("kind", "Cliente")}
            >
              De un cliente
            </button>
          </div>

          <label className="field">
            <span>Amenity / vertical</span>
            <input
              list="detail-verticals"
              placeholder="Hoteles, Financieras, Countries…"
              value={project.vertical ?? ""}
              onChange={(event) => updateProject("vertical", event.target.value || null)}
            />
            <datalist id="detail-verticals">
              {projectVerticals.map((vertical) => <option key={vertical} value={vertical} />)}
            </datalist>
          </label>

          <label className="field">
            <span>De qué es</span>
            <textarea
              placeholder="Qué resuelve, para quién."
              value={project.summary ?? ""}
              onChange={(event) => updateProject("summary", event.target.value || null)}
            />
          </label>

          <label className="field">
            <span>Dónde está deployado</span>
            <input
              placeholder="https://…"
              value={project.deployUrl ?? ""}
              onChange={(event) => updateProject("deployUrl", event.target.value || null)}
            />
            {project.deployUrl ? (
              <a className="inline-link" href={project.deployUrl} target="_blank" rel="noreferrer">Abrir deploy ↗</a>
            ) : null}
          </label>

          <label className="field checkbox-field">
            <input
              checked={project.generatesRevenue}
              type="checkbox"
              onChange={(event) => updateProject("generatesRevenue", event.target.checked)}
            />
            <span>Ya genera ingresos</span>
          </label>
        </article>

        <article className="panel-block edit-panel">
          <div className="block-heading">
            <span className="eyebrow">Estado y contrato</span>
            <span>{source === "supabase" ? "Editable Supabase" : "Mock"}</span>
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

          <label className="field">
            <span>Entrega comprometida</span>
            <input
              type="date"
              value={project.dueDate ?? ""}
              onChange={(event) => updateProject("dueDate", event.target.value || null)}
            />
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
              <small className="money-field-preview">{money(project.salePrice, project.currency)}</small>
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
          <div className="profit-block">
            <span className="eyebrow">Rentabilidad</span>
            <div className="money-split">
              <div>
                <span>Costos asociados</span>
                <strong>{projectCosts > 0 ? money(Math.round(projectCosts), project.currency) : "—"}</strong>
              </div>
              <div>
                <span>Resultado</span>
                <strong className={profit >= 0 ? "" : "danger-text"}>{money(Math.round(profit), project.currency)}</strong>
              </div>
            </div>
            <div className="money-split">
              <div>
                <span>Margen real</span>
                <strong className={realMargin !== null && realMargin < project.marginTarget ? "warn-text" : ""}>
                  {realMargin !== null ? `${realMargin}%` : "Sin cobros"}
                </strong>
              </div>
              <div>
                <span>Objetivo · Horas</span>
                <strong>{project.marginTarget}% · {Math.round(totalHours)} hs</strong>
              </div>
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
            <button disabled={isPending} type="button" onClick={addPayment}>Agregar pago</button>
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
                <div className="row-actions">
                  <button className={confirmingDeleteId === `payment-${payment.id}` ? "danger-confirm" : ""} disabled={isPending} type="button" onClick={() => deletePayment(payment)}>
                    {confirmingDeleteId === `payment-${payment.id}` ? "Confirmar" : "Borrar"}
                  </button>
                  {confirmingDeleteId === `payment-${payment.id}` ? <button type="button" onClick={() => setConfirmingDeleteId(null)}>Cancelar</button> : null}
                </div>
              </article>
            ))}
            {project.payments.length === 0 ? (
              <div className="panel-empty">
                <strong>Sin pagos registrados.</strong>
                <span>Carga el primero con el formulario de arriba.</span>
              </div>
            ) : null}
          </div>
        </article>

        <article className="panel-block trace-board detail-trace">
          <div className="block-heading">
            <span className="eyebrow">Reuniones y actividad</span>
            <span>{sortedEvents.length} en la trazabilidad</span>
          </div>

          <div className="note-form">
            <div className="field-grid">
              <label className="field">
                <span>Tipo</span>
                <select value={eventDraft.type} onChange={(event) => setEventDraft((current) => ({ ...current, type: event.target.value as ProjectEvent["type"] }))}>
                  {eventTypes.map((type) => <option key={type} value={type}>{type}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Fecha</span>
                <input type="date" value={eventDraft.date} onChange={(event) => setEventDraft((current) => ({ ...current, date: event.target.value }))} />
              </label>
              <label className="field">
                <span>Horas</span>
                <input min="0" step="0.5" type="number" value={eventDraft.hours} onChange={(event) => setEventDraft((current) => ({ ...current, hours: event.target.value }))} />
              </label>
              <label className="field">
                <span>Responsable</span>
                <input
                  list="detail-event-partners"
                  value={eventDraft.owner}
                  onChange={(event) => setEventDraft((current) => ({ ...current, owner: event.target.value }))}
                />
                <datalist id="detail-event-partners">
                  {partnerNames.map((name) => <option key={name} value={name} />)}
                </datalist>
              </label>
            </div>
            <label className="field">
              <span>Titulo</span>
              <input placeholder="Ej: reunion de kickoff, entrega del modulo de stock" value={eventDraft.title} onChange={(event) => setEventDraft((current) => ({ ...current, title: event.target.value }))} />
            </label>
            <label className="field">
              <span>Detalle / minuta</span>
              <textarea value={eventDraft.notes} onChange={(event) => setEventDraft((current) => ({ ...current, notes: event.target.value }))} />
            </label>
            <button className="command-button note-submit" disabled={isPending} type="button" onClick={addEvent}>Registrar actividad</button>
          </div>

          <div className="event-stack">
            {sortedEvents.map((event) => (
              <article className="event-line expanded" key={event.id}>
                <span>{event.type} · {dateLabel(event.date)}</span>
                <strong>{event.title}</strong>
                <p>{event.notes}</p>
                <small>{event.owner} · {event.hours} h</small>
                <div className="row-actions">
                  <button className={confirmingDeleteId === `event-${event.id}` ? "danger-confirm" : ""} disabled={isPending} type="button" onClick={() => deleteEvent(event)}>
                    {confirmingDeleteId === `event-${event.id}` ? "Confirmar" : "Borrar"}
                  </button>
                  {confirmingDeleteId === `event-${event.id}` ? <button type="button" onClick={() => setConfirmingDeleteId(null)}>Cancelar</button> : null}
                </div>
              </article>
            ))}
            {sortedEvents.length === 0 ? (
              <div className="panel-empty">
                <strong>Sin reuniones ni actividad todavia.</strong>
                <span>Registra la primera con el formulario de arriba.</span>
              </div>
            ) : null}
          </div>
        </article>

        {ideas.length > 0 ? (
          <article className="panel-block linked-ideas-panel">
            <div className="block-heading">
              <span className="eyebrow">Ideas vinculadas</span>
              <span>{ideas.length} {ideas.length === 1 ? "idea" : "ideas"} · <Link className="inline-link" href="/ideas">Ver tablero</Link></span>
            </div>
            <div className="notes-list">
              {ideas.map((idea) => (
                <article className="note-card" key={idea.id}>
                  <span>{idea.kind} · {idea.createdAt} · urgencia {idea.urgency}</span>
                  <strong>{idea.title}</strong>
                  <p>{idea.body || "Sin detalle todavia."}</p>
                  {idea.need ? <small>Necesita: {idea.need}</small> : null}
                </article>
              ))}
            </div>
          </article>
        ) : null}

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
                <input
                  list="detail-note-partners"
                  value={noteDraft.owner}
                  onChange={(event) => setNoteDraft((current) => ({ ...current, owner: event.target.value }))}
                />
                <datalist id="detail-note-partners">
                  {partnerNames.map((name) => <option key={name} value={name} />)}
                </datalist>
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
            <button className="command-button note-submit" disabled={isPending} type="button" onClick={addNote}>Agregar nota</button>
          </div>

          <div className="notes-list">
            {project.notes.map((note) => (
              <article className="note-card" key={note.id}>
                <span>{note.type} · {dateLabel(note.date)} · {note.owner}</span>
                <strong>{note.title}</strong>
                <p>{note.body}</p>
                {note.createsTask ? <small>Genera tarea o feature</small> : null}
                <div className="row-actions">
                  <button className={confirmingDeleteId === `note-${note.id}` ? "danger-confirm" : ""} disabled={isPending} type="button" onClick={() => deleteNote(note)}>
                    {confirmingDeleteId === `note-${note.id}` ? "Confirmar" : "Borrar"}
                  </button>
                  {confirmingDeleteId === `note-${note.id}` ? <button type="button" onClick={() => setConfirmingDeleteId(null)}>Cancelar</button> : null}
                </div>
              </article>
            ))}
            {project.notes.length === 0 ? (
              <div className="panel-empty">
                <strong>Sin notas ni relevamientos.</strong>
                <span>Anota lo hablado en reuniones para no perder contexto.</span>
              </div>
            ) : null}
          </div>
        </article>
      </section>
    </section>
  );
}

function DueBadge({ dueDate, status }: { dueDate: string; status: ProjectStatus }) {
  const today = new Date().toISOString().slice(0, 10);
  if (status === "En uso") {
    return <span className="due-badge due-ok">Entregado · comprometido {dateLabel(dueDate)}</span>;
  }
  if (dueDate < today) {
    return <span className="due-badge due-late">Vencido hace {daysBetween(dueDate, today)} dias ({dateLabel(dueDate)})</span>;
  }
  const remaining = daysBetween(today, dueDate);
  return (
    <span className={`due-badge ${remaining <= 7 ? "due-soon" : "due-ok"}`}>
      Entrega en {remaining} dias ({dateLabel(dueDate)})
    </span>
  );
}
