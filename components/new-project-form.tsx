"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { createProjectAction } from "@/app/actions/projects";
import { projectStatuses } from "@/lib/project-statuses";
import { projectVerticals } from "@/lib/verticals";
import type { PaymentMethod, ProjectKind, ProjectStatus } from "@/lib/types";

const paymentMethods: PaymentMethod[] = ["Transferencia", "Efectivo", "USD", "Cheque", "Mixto"];

export function NewProjectForm({ initialDetail = "", initialName = "" }: { initialDetail?: string; initialName?: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [feedback, setFeedback] = useState(
    initialName ? "Datos precargados desde una idea del tablero." : "Se guarda en Supabase si las tablas ya estan creadas."
  );
  const [draft, setDraft] = useState({
    kind: "Propio" as ProjectKind,
    name: initialName,
    vertical: "",
    summary: initialDetail,
    deployUrl: "",
    generatesRevenue: false,
    clientContact: "",
    clientIndustry: "",
    clientName: "",
    contractSigned: false,
    currency: "ARS" as "ARS" | "USD",
    dueDate: "",
    marginTarget: "60",
    nextMilestone: initialDetail ? `Validar: ${initialDetail.slice(0, 80)}` : "Primer relevamiento",
    paymentMethod: "Transferencia" as PaymentMethod,
    salePrice: "",
    startDate: new Date().toISOString().slice(0, 10),
    status: "Relevamiento" as ProjectStatus
  });

  const isClient = draft.kind === "Cliente";

  function setField<T extends keyof typeof draft>(key: T, value: (typeof draft)[T]) {
    setDraft((current) => ({ ...current, [key]: value }));
  }

  function createProject() {
    if (!draft.name.trim()) return;
    if (isClient && !draft.clientName.trim()) {
      setFeedback("Un proyecto de cliente necesita el nombre del cliente.");
      return;
    }

    startTransition(async () => {
      try {
        const projectId = await createProjectAction({
          kind: draft.kind,
          name: draft.name,
          vertical: draft.vertical.trim() || null,
          summary: draft.summary.trim() || null,
          deployUrl: draft.deployUrl.trim() || null,
          generatesRevenue: isClient ? true : draft.generatesRevenue,
          clientContact: draft.clientContact,
          clientIndustry: draft.clientIndustry,
          clientName: draft.clientName,
          contractSigned: isClient ? draft.contractSigned : false,
          currency: draft.currency,
          dueDate: draft.dueDate || null,
          marginTarget: Number(draft.marginTarget) || 0,
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
          <p>Cargá un producto propio o un proyecto de cliente. Podés completar el resto de a poco desde el detalle.</p>
        </div>
      </header>

      <article className="finance-drawer">
        <header>
          <span className="eyebrow">Datos iniciales</span>
          <strong>{feedback}</strong>
        </header>
        <div className="finance-form compact">
        <div className="kind-switch" role="group" aria-label="Tipo de proyecto">
          <button
            type="button"
            className={draft.kind === "Propio" ? "active" : ""}
            aria-pressed={draft.kind === "Propio"}
            onClick={() => setField("kind", "Propio")}
          >
            Producto propio
          </button>
          <button
            type="button"
            className={isClient ? "active" : ""}
            aria-pressed={isClient}
            onClick={() => setField("kind", "Cliente")}
          >
            De un cliente
          </button>
        </div>

        <div className="field-grid form-grid-wide">
          <label className="field">
            <span>Nombre del proyecto</span>
            <input value={draft.name} onChange={(event) => setField("name", event.target.value)} />
          </label>
          <label className="field">
            <span>Amenity / vertical</span>
            <input
              list="project-verticals"
              placeholder="Hoteles, Financieras, Countries…"
              value={draft.vertical}
              onChange={(event) => setField("vertical", event.target.value)}
            />
            <datalist id="project-verticals">
              {projectVerticals.map((vertical) => <option key={vertical} value={vertical} />)}
            </datalist>
          </label>

          {isClient ? (
            <>
              <label className="field">
                <span>Cliente</span>
                <input value={draft.clientName} onChange={(event) => setField("clientName", event.target.value)} />
              </label>
              <label className="field">
                <span>Contacto</span>
                <input value={draft.clientContact} onChange={(event) => setField("clientContact", event.target.value)} />
              </label>
              <label className="field">
                <span>Rubro del cliente</span>
                <input value={draft.clientIndustry} onChange={(event) => setField("clientIndustry", event.target.value)} />
              </label>
            </>
          ) : null}

          <label className="field form-grid-span">
            <span>De qué es</span>
            <textarea
              placeholder="Qué resuelve, para quién, en pocas líneas."
              value={draft.summary}
              onChange={(event) => setField("summary", event.target.value)}
            />
          </label>
          <label className="field form-grid-span">
            <span>Dónde está deployado</span>
            <input
              placeholder="https://…"
              value={draft.deployUrl}
              onChange={(event) => setField("deployUrl", event.target.value)}
            />
          </label>

          <label className="field">
            <span>Estado inicial</span>
            <select value={draft.status} onChange={(event) => setField("status", event.target.value as ProjectStatus)}>
              {projectStatuses.map((status) => (
                <option key={status} value={status}>{status}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Próximo hito</span>
            <input value={draft.nextMilestone} onChange={(event) => setField("nextMilestone", event.target.value)} />
          </label>
          <label className="field">
            <span>{isClient ? "Total pactado" : "Ingreso estimado (opcional)"}</span>
            <input min="0" type="number" value={draft.salePrice} onChange={(event) => setField("salePrice", event.target.value)} />
          </label>
          <label className="field">
            <span>Moneda</span>
            <select value={draft.currency} onChange={(event) => setField("currency", event.target.value as "ARS" | "USD")}>
              <option value="ARS">ARS</option>
              <option value="USD">USD</option>
            </select>
          </label>
          <label className="field">
            <span>Forma de pago</span>
            <select value={draft.paymentMethod} onChange={(event) => setField("paymentMethod", event.target.value as PaymentMethod)}>
              {paymentMethods.map((method) => (
                <option key={method} value={method}>{method}</option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Fecha de inicio</span>
            <input type="date" value={draft.startDate} onChange={(event) => setField("startDate", event.target.value)} />
          </label>
          <label className="field">
            <span>Entrega comprometida</span>
            <input type="date" value={draft.dueDate} onChange={(event) => setField("dueDate", event.target.value)} />
          </label>

          {isClient ? (
            <label className="field checkbox-field">
              <input
                checked={draft.contractSigned}
                type="checkbox"
                onChange={(event) => setField("contractSigned", event.target.checked)}
              />
              <span>Contrato firmado</span>
            </label>
          ) : (
            <label className="field checkbox-field">
              <input
                checked={draft.generatesRevenue}
                type="checkbox"
                onChange={(event) => setField("generatesRevenue", event.target.checked)}
              />
              <span>Ya genera ingresos</span>
            </label>
          )}
        </div>

        <div className="quick-note-actions">
          <button className="command-primary" disabled={isPending} type="button" onClick={createProject}>
            {isPending ? "Creando…" : draft.kind === "Propio" ? "Crear producto" : "Crear proyecto"}
          </button>
        </div>
        </div>
      </article>
    </section>
  );
}
