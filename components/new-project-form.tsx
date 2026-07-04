"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PageHeader } from "@/components/ui";
import { partners } from "@/lib/mock-data";
import { localKeys } from "@/lib/local-keys";
import { projectStatuses } from "@/lib/project-statuses";
import type { Client, PaymentMethod, Project, ProjectStatus } from "@/lib/types";

const paymentMethods: PaymentMethod[] = ["Transferencia", "Efectivo", "USD", "Cheque", "Mixto"];

export function NewProjectForm() {
  const router = useRouter();
  const [draft, setDraft] = useState({
    clientContact: "",
    clientIndustry: "",
    clientName: "",
    contractSigned: false,
    currency: "ARS" as "ARS" | "USD",
    marginTarget: "60",
    name: "",
    nextMilestone: "Primer relevamiento",
    paymentMethod: "Transferencia" as PaymentMethod,
    salePrice: "",
    startDate: "2026-07-04",
    status: "Relevamiento" as ProjectStatus
  });

  function createProject() {
    if (!draft.name.trim() || !draft.clientName.trim()) return;

    const clientId = `local-client-${Date.now()}`;
    const projectId = `local-project-${Date.now()}`;
    const client: Client = {
      id: clientId,
      contact: draft.clientContact || "Sin contacto",
      industry: draft.clientIndustry || "Sin rubro",
      name: draft.clientName
    };
    const project: Project = {
      id: projectId,
      clientId,
      contractDate: draft.contractSigned ? draft.startDate : null,
      contractSigned: draft.contractSigned,
      currency: draft.currency,
      marginTarget: Number(draft.marginTarget) || 0,
      name: draft.name,
      nextMilestone: draft.nextMilestone,
      paidAmount: 0,
      partners,
      paymentMethod: draft.paymentMethod,
      salePrice: Number(draft.salePrice) || 0,
      startDate: draft.startDate,
      status: draft.status
    };

    writeList(localKeys.clients, client);
    writeList(localKeys.projects, project);
    window.localStorage.setItem(`da-project-${projectId}`, JSON.stringify({ ...project, notes: [], payments: [] }));
    router.push(`/proyectos/${projectId}`);
  }

  return (
    <>
      <PageHeader
        eyebrow="Nuevo proyecto"
        title="Crear una base simple y completarla de a poco."
        description="Este flujo queda guardado en el navegador hasta que conectemos Supabase."
      />

      <section className="panel-block form-shell">
        <div className="block-heading">
          <span className="eyebrow">Datos iniciales</span>
          <span>LocalStorage</span>
        </div>

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

        <button className="command-button form-submit" type="button" onClick={createProject}>Crear proyecto</button>
      </section>
    </>
  );
}

function writeList<T extends { id: string }>(key: string, item: T) {
  const current = readList<T>(key);
  window.localStorage.setItem(key, JSON.stringify([item, ...current.filter((currentItem) => currentItem.id !== item.id)]));
}

function readList<T>(key: string): T[] {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T[]) : [];
  } catch {
    return [];
  }
}
