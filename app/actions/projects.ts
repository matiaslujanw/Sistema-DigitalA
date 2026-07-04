"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { partnerProfiles } from "@/lib/mock-data";
import type { CashMovement, PaymentMethod, Project, ProjectNote, ProjectStatus } from "@/lib/types";

type CreateProjectInput = {
  clientContact: string;
  clientIndustry: string;
  clientName: string;
  contractSigned: boolean;
  currency: "ARS" | "USD";
  marginTarget: number;
  name: string;
  nextMilestone: string;
  paymentMethod: PaymentMethod;
  salePrice: number;
  startDate: string;
  status: ProjectStatus;
};

type UpdateProjectInput = {
  contractDate?: string | null;
  contractSigned?: boolean;
  currency?: "ARS" | "USD";
  nextMilestone?: string;
  paymentMethod?: PaymentMethod;
  salePrice?: number;
  status?: ProjectStatus;
};

type AddPaymentInput = {
  amount: number;
  currency: "ARS" | "USD";
  date: string;
  method: PaymentMethod;
  note: string;
  projectId: string;
};

type AddNoteInput = {
  body: string;
  createsTask: boolean;
  date: string;
  owner: string;
  projectId: string;
  title: string;
  type: ProjectNote["type"];
};

type AddCashMovementInput = {
  acquiredAmount?: number;
  acquiredCurrency?: CashMovement["acquiredCurrency"];
  actualReturnPercent?: number;
  amount: number;
  concept: string;
  currency: "ARS" | "USD";
  date: string;
  destination: CashMovement["destination"];
  exchangeRate?: number;
  expectedReturnPercent?: number;
  notes: string;
  operation: CashMovement["operation"];
  sourceProjectId?: string | null;
};

export async function createProjectAction(input: CreateProjectInput) {
  const supabase = createSupabaseServerClient();
  const partners = await ensureDefaultPartners();

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .insert({
      contact: input.clientContact || "Sin contacto",
      industry: input.clientIndustry || "Sin rubro",
      name: input.clientName
    })
    .select("id")
    .single();

  if (clientError) throw new Error(clientError.message);

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      client_id: client.id,
      contract_date: input.contractSigned ? input.startDate : null,
      contract_signed: input.contractSigned,
      currency: input.currency,
      margin_target: input.marginTarget,
      name: input.name,
      next_milestone: input.nextMilestone || "Definir proximo hito",
      payment_method: input.paymentMethod,
      sale_price: input.salePrice,
      start_date: input.startDate,
      status: input.status
    })
    .select("id")
    .single();

  if (projectError) throw new Error(projectError.message);

  if (partners.length > 0) {
    const { error: partnersError } = await supabase.from("project_partners").insert(
      partners.map((partner) => ({
        partner_id: partner.id,
        project_id: project.id,
        role: "Socio"
      }))
    );

    if (partnersError) throw new Error(partnersError.message);
  }

  revalidateProjectPaths(project.id);
  return project.id as string;
}

export async function updateProjectAction(projectId: string, input: UpdateProjectInput) {
  const supabase = createSupabaseServerClient();
  const payload: Record<string, unknown> = {};

  if (input.contractDate !== undefined) payload.contract_date = input.contractDate;
  if (input.contractSigned !== undefined) payload.contract_signed = input.contractSigned;
  if (input.currency !== undefined) payload.currency = input.currency;
  if (input.nextMilestone !== undefined) payload.next_milestone = input.nextMilestone;
  if (input.paymentMethod !== undefined) payload.payment_method = input.paymentMethod;
  if (input.salePrice !== undefined) payload.sale_price = input.salePrice;
  if (input.status !== undefined) payload.status = input.status;

  const { error } = await supabase.from("projects").update(payload).eq("id", projectId);
  if (error) throw new Error(error.message);

  revalidateProjectPaths(projectId);
}

export async function addProjectPaymentAction(input: AddPaymentInput) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("project_payments").insert({
    amount: input.amount,
    currency: input.currency,
    happened_on: input.date,
    method: input.method,
    note: input.note || "Pago registrado",
    project_id: input.projectId
  });

  if (error) throw new Error(error.message);

  await syncProjectPaidAmount(input.projectId);
  revalidateProjectPaths(input.projectId);
}

export async function addProjectNoteAction(input: AddNoteInput) {
  const supabase = createSupabaseServerClient();
  const ownerId = await findOrCreatePartner(input.owner);

  const { error } = await supabase.from("project_notes").insert({
    body: input.body,
    creates_task: input.createsTask,
    happened_on: input.date,
    owner_partner_id: ownerId,
    project_id: input.projectId,
    title: input.title,
    type: input.type
  });

  if (error) throw new Error(error.message);

  const { error: eventError } = await supabase.from("project_events").insert({
    happened_on: input.date,
    hours: 0,
    notes: input.body,
    owner_partner_id: ownerId,
    project_id: input.projectId,
    title: input.title,
    type: noteTypeToEventType(input.type)
  });

  if (eventError) throw new Error(eventError.message);

  revalidateProjectPaths(input.projectId);
}

export async function addCashMovementAction(input: AddCashMovementInput) {
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("cash_movements").insert({
    acquired_amount: input.acquiredAmount,
    acquired_currency: input.acquiredCurrency,
    actual_return_percent: input.actualReturnPercent,
    amount: input.amount,
    concept: input.concept,
    currency: input.currency,
    destination: input.destination,
    exchange_rate: input.exchangeRate,
    expected_return_percent: input.expectedReturnPercent,
    happened_on: input.date,
    notes: input.notes,
    operation: input.operation,
    source_project_id: input.sourceProjectId ?? null
  });

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/finanzas");
}

async function ensureDefaultPartners() {
  const supabase = createSupabaseServerClient();
  const { data: existing, error } = await supabase.from("partners").select("id,name");
  if (error) throw new Error(error.message);
  if (existing && existing.length > 0) return existing as Array<{ id: string; name: string }>;

  const { data, error: insertError } = await supabase
    .from("partners")
    .insert(
      partnerProfiles.map((partner) => ({
        allocation: partner.allocation,
        email: partner.email,
        focus: partner.focus,
        name: partner.name,
        role: partner.role,
        status: partner.status
      }))
    )
    .select("id,name");

  if (insertError) throw new Error(insertError.message);
  return (data ?? []) as Array<{ id: string; name: string }>;
}

async function findOrCreatePartner(name: string) {
  const supabase = createSupabaseServerClient();
  const cleanName = name.trim() || "Sin responsable";
  const { data: existing, error } = await supabase.from("partners").select("id").eq("name", cleanName).maybeSingle();
  if (error) throw new Error(error.message);
  if (existing?.id) return existing.id as string;

  const { data, error: insertError } = await supabase
    .from("partners")
    .insert({ name: cleanName, role: "Colaborador", focus: "Operacion y delivery" })
    .select("id")
    .single();

  if (insertError) throw new Error(insertError.message);
  return data.id as string;
}

async function syncProjectPaidAmount(projectId: string) {
  const supabase = createSupabaseServerClient();
  const { data: project, error: projectError } = await supabase.from("projects").select("currency").eq("id", projectId).single();
  if (projectError) throw new Error(projectError.message);

  const { data: payments, error: paymentsError } = await supabase.from("project_payments").select("amount,currency").eq("project_id", projectId);
  if (paymentsError) throw new Error(paymentsError.message);

  const paidAmount = (payments ?? [])
    .filter((payment) => payment.currency === project.currency)
    .reduce((sum, payment) => sum + Number(payment.amount), 0);

  const { error: updateError } = await supabase.from("projects").update({ paid_amount: paidAmount }).eq("id", projectId);
  if (updateError) throw new Error(updateError.message);
}

function noteTypeToEventType(type: ProjectNote["type"]) {
  if (type === "Relevamiento") return "Relevamiento";
  if (type === "Decision") return "Decision";
  if (type === "Pedido cliente") return "Pedido cliente";
  if (type === "Bloqueo") return "Bloqueo";
  if (type === "Cambio de alcance") return "Cambio de alcance";
  return "Nota";
}

function revalidateProjectPaths(projectId: string) {
  revalidatePath("/dashboard");
  revalidatePath("/proyectos");
  revalidatePath(`/proyectos/${projectId}`);
  revalidatePath("/cronograma");
  revalidatePath("/socios");
}
