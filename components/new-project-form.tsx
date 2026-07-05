"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createProjectAction } from "@/app/actions/projects";
import { projectStatuses } from "@/lib/project-statuses";
import type { PaymentMethod, ProjectStatus } from "@/lib/types";

const paymentMethods: PaymentMethod[] = ["Transferencia", "Efectivo", "USD", "Cheque", "Mixto"];

export function NewProjectForm({ initialDetail = "", initialName = "" }: { initialDetail?: string; initialName?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState(
    initialName ? "Datos precargados desde una idea del tablero." : "Se guarda en Supabase si las tablas ya estan creadas."
  );
  const [draft, setDraft] = useState({
    clientContact: "",
    clientIndustry: "",
    clientName: "",
    contractSigned: false,
    currency: "ARS" as "ARS" | "USD",
    marginTarget: "60",
    name: initialName,
    nextMilestone: initialDetail ? `Validar: ${initialDetail.slice(0, 80)}` : "Primer relevamiento",
    paymentMethod: "Transferencia" as PaymentMethod,
    salePrice: "",
    startDate: new Date().toISOString().slice(0, 10),
    status: "Relevamiento" as ProjectStatus
  });

  function createProject() {
    if (!draft.name.trim() || !draft.clientName.trim()) return;

    startTransition(async () => {
      try {
        const projectId = await createProjectAction({
          clientContact: draft.clientContact,
          clientIndustry: draft.clientIndustry,
          clientName: draft.clientName,
          contractSigned: draft.contractSigned,
          currency: draft.currency,
          marginTarget: Number(draft.marginTarget) || 0,
          name: draft.name,
          nextMilestone: draft.nextMilestone,
          paymentMethod: draft.paymentMethod,
          salePrice: Number(draft.salePrice) || 0,
          startDate: draft.startDate,
          status: draft.status
        });

        router.push(`/proyectos/${projectId}`);
        router.refresh();
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No se pudo crear el proyecto");
      }
    });
  }

  return (
    <section className="executive-page new-project-command">
      <header className="command-header">
        <div>
          <h1>Nuevo Proyecto</h1>
          <p>Crear una base simple con cliente y datos comerciales, y completarla de a poco desde el detalle.</p>
        </div>
      </header>

      <article className="finance-drawer">
        <header>
          <span className="eyebrow">Datos iniciales</span>
          <strong>{feedback}</strong>
        </header>
        <div className="finance-form compact">
        <div className="field-grid form-grid-wide">
          <label className="field">
            <span>Nombre del proyecto</span>
            <input value={draft.name} onChange={(event) => setDraft((current) => ({ ...current, name: event.target.value }))} />
          </label>
          <label className="field">
            <span>Cliente</span>
            <input value={draft.clientName} onChange={(event) => setDraft((current) => ({ ...current, clientName: event.target.value }))} />
          </label>
          <label className="field">
            <span>Contacto</span>
            <input value={draft.clientContact} onChange={(event) => setDraft((current) => ({ ...current, clientContact: event.target.value }))} />
          </label>
          <label className="field">
            <span>Rubro</span>
            <input value={draft.clientIndustry} onChange={(event) => setDraft((current) => ({ ...current, clientIndustry: event.target.value }))} />
          </label>
          <label className="field">
            <span>Estado inicial</span>
            <select value={draft.status} onChange={(event) => setDraft((current) => ({ ...current, status: event.target.value as ProjectStatus }))}>
              {projectStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Proximo hito</span>
            <input value={draft.nextMilestone} onChange={(event) => setDraft((current) => ({ ...current, nextMilestone: event.target.value }))} />
          </label>
          <label className="field">
            <span>Total pactado / estimado</span>
            <input min="0" type="number" value={draft.salePrice} onChange={(event) => setDraft((current) => ({ ...current, salePrice: event.target.value }))} />
          </label>
          <label className="field">
            <span>Moneda</span>
            <select value={draft.currency} onChange={(event) => setDraft((current) => ({ ...current, currency: event.target.value as "ARS" | "USD" }))}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label className="field">
            <span>Forma de pago</span>
            <select value={draft.paymentMethod} onChange={(event) => setDraft((current) => ({ ...current, paymentMethod: event.target.value as PaymentMethod }))}>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Fecha de inicio</span>
            <input type="date" value={draft.startDate} onChange={(event) => setDraft((current) => ({ ...current, startDate: event.target.value }))} />
          </label>
          <label className="field checkbox-field">
            <input
              checked={draft.contractSigned}
              type="checkbox"
              onChange={(event) => setDraft((current) => ({ ...current, contractSigned: event.target.checked }))}
            />
            <span>Contrato firmado</span>
          </label>
        </div>

        <div className="quick-note-actions">
          <button className="command-primary" disabled={isPending} type="button" onClick={createProject}>
            {isPending ? "Creando…" : "Crear proyecto"}
          </button>
        </div>
        </div>
      </article>
    </section>
  );
}
