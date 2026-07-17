"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { createSupabaseAuthServerClient, isSupabaseAuthConfigured, shouldRequireSupabaseAuth } from "@/lib/supabase/auth-server";
import type { CashMovement, Cost, PaymentMethod, Project, ProjectEvent, ProjectKind, ProjectNote, ProjectStatus } from "@/lib/types";

type CreateProjectInput = {
  kind: ProjectKind;
  clientContact: string;
  clientIndustry: string;
  clientName: string;
  vertical: string | null;
  summary: string | null;
  deployUrl: string | null;
  generatesRevenue: boolean;
  contractSigned: boolean;
  currency: "ARS" | "USD";
  dueDate: string | null;
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
  deployUrl?: string | null;
  dueDate?: string | null;
  generatesRevenue?: boolean;
  kind?: ProjectKind;
  nextMilestone?: string;
  paymentMethod?: PaymentMethod;
  salePrice?: number;
  status?: ProjectStatus;
  summary?: string | null;
  vertical?: string | null;
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

type AddEventInput = {
  date: string;
  hours: number;
  notes: string;
  owner: string;
  projectId: string;
  title: string;
  type: ProjectEvent["type"];
};

type AddCostInput = {
  amount: number;
  cadence: Cost["cadence"];
  category: Cost["category"];
  currency: "ARS" | "USD";
  name: string;
  projectId?: string | null;
  provider: string;
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
  await requireAuthenticatedAction();
  const supabase = createSupabaseServerClient();
  const partners = await getExistingPartners();

  // Los productos propios no tienen cliente: solo los proyectos de cliente
  // crean (o reusan) una fila en clients.
  let clientId: string | null = null;
  if (input.kind === "Cliente") {
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
    clientId = client.id;
  }

  const { data: project, error: projectError } = await supabase
    .from("projects")
    .insert({
      client_id: clientId,
      contract_date: input.contractSigned ? input.startDate : null,
      contract_signed: input.contractSigned,
      currency: input.currency,
      deploy_url: input.deployUrl,
      due_date: input.dueDate,
      generates_revenue: input.generatesRevenue,
      kind: input.kind,
      margin_target: input.marginTarget,
      name: input.name,
      next_milestone: input.nextMilestone || "Definir proximo hito",
      payment_method: input.paymentMethod,
      sale_price: input.salePrice,
      start_date: input.startDate,
      status: input.status,
      summary: input.summary,
      vertical: input.vertical
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
  await requireAuthenticatedAction();
  const supabase = createSupabaseServerClient();
  const payload: Record<string, unknown> = {};

  if (input.contractDate !== undefined) payload.contract_date = input.contractDate;
  if (input.contractSigned !== undefined) payload.contract_signed = input.contractSigned;
  if (input.currency !== undefined) payload.currency = input.currency;
  if (input.deployUrl !== undefined) payload.deploy_url = input.deployUrl;
  if (input.dueDate !== undefined) payload.due_date = input.dueDate;
  if (input.generatesRevenue !== undefined) payload.generates_revenue = input.generatesRevenue;
  if (input.kind !== undefined) payload.kind = input.kind;
  if (input.nextMilestone !== undefined) payload.next_milestone = input.nextMilestone;
  if (input.paymentMethod !== undefined) payload.payment_method = input.paymentMethod;
  if (input.salePrice !== undefined) payload.sale_price = input.salePrice;
  if (input.status !== undefined) payload.status = input.status;
  if (input.summary !== undefined) payload.summary = input.summary;
  if (input.vertical !== undefined) payload.vertical = input.vertical;

  const { error } = await supabase.from("projects").update(payload).eq("id", projectId);
  if (error) throw new Error(error.message);

  revalidateProjectPaths(projectId);
}

// Borra el proyecto entero. La FK hace el trabajo pesado:
// pagos, eventos, notas y project_partners caen por `on delete cascade`;
// costos, movimientos de caja e ideas quedan con project_id en null
// (se conservan, solo se desvinculan).
// El cliente se borra solo si se queda sin proyectos: createProjectAction
// inserta un cliente nuevo por cada proyecto, así que si no lo limpiamos
// /clientes se llena de clientes fantasma sin nada colgando.
export async function deleteProjectAction(projectId: string) {
  await requireAuthenticatedAction();
  const supabase = createSupabaseServerClient();

  const { data: project, error: fetchError } = await supabase
    .from("projects")
    .select("client_id,name")
    .eq("id", projectId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase.from("projects").delete().eq("id", projectId);
  if (error) throw new Error(error.message);

  // Un producto propio no tiene cliente: no hay nada que limpiar.
  let removedClient = false;
  if (project.client_id) {
    const { data: siblings, error: siblingsError } = await supabase
      .from("projects")
      .select("id")
      .eq("client_id", project.client_id)
      .limit(1);
    if (siblingsError) throw new Error(siblingsError.message);

    if (!siblings || siblings.length === 0) {
      const { error: clientError } = await supabase.from("clients").delete().eq("id", project.client_id);
      // El cliente huérfano no es fatal: el proyecto ya se borró y esa era la intención.
      if (!clientError) removedClient = true;
    }
  }

  revalidateProjectPaths(projectId);
  revalidatePath("/clientes");
  revalidatePath("/finanzas");
  revalidatePath("/costos");
  revalidatePath("/ideas");
  revalidatePath("/reuniones");

  return { name: project.name as string, removedClient };
}

export async function addProjectPaymentAction(input: AddPaymentInput) {
  await requireAuthenticatedAction();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("project_payments")
    .insert({
      amount: input.amount,
      currency: input.currency,
      happened_on: input.date,
      method: input.method,
      note: input.note || "Pago registrado",
      project_id: input.projectId
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  await syncProjectPaidAmount(input.projectId);
  revalidateProjectPaths(input.projectId);
  return data.id as string;
}

export async function addProjectNoteAction(input: AddNoteInput) {
  await requireAuthenticatedAction();
  const supabase = createSupabaseServerClient();
  const ownerId = await findOrCreatePartner(input.owner);

  const { data, error } = await supabase
    .from("project_notes")
    .insert({
      body: input.body,
      creates_task: input.createsTask,
      happened_on: input.date,
      owner_partner_id: ownerId,
      project_id: input.projectId,
      title: input.title,
      type: input.type
    })
    .select("id")
    .single();

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
  return data.id as string;
}

export async function addProjectEventAction(input: AddEventInput) {
  await requireAuthenticatedAction();
  const supabase = createSupabaseServerClient();
  const ownerId = await findOrCreatePartner(input.owner);

  const { data, error } = await supabase
    .from("project_events")
    .insert({
      happened_on: input.date,
      hours: input.hours,
      notes: input.notes,
      owner_partner_id: ownerId,
      project_id: input.projectId,
      title: input.title,
      type: input.type
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidateProjectPaths(input.projectId);
  revalidatePath("/reuniones");
  return data.id as string;
}

export async function addCostAction(input: AddCostInput) {
  await requireAuthenticatedAction();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("costs")
    .insert({
      amount: input.amount,
      cadence: input.cadence,
      category: input.category,
      currency: input.currency,
      name: input.name,
      project_id: input.projectId ?? null,
      provider: input.provider || "Sin proveedor"
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/costos");
  revalidatePath("/dashboard");
  return data.id as string;
}

export async function addCashMovementAction(input: AddCashMovementInput) {
  await requireAuthenticatedAction();
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase
    .from("cash_movements")
    .insert({
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
    })
    .select("id")
    .single();

  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/finanzas");
  return data.id as string;
}

export async function deleteProjectPaymentAction(paymentId: string) {
  await requireAuthenticatedAction();
  const supabase = createSupabaseServerClient();
  const { data: payment, error: fetchError } = await supabase.from("project_payments").select("project_id").eq("id", paymentId).single();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase.from("project_payments").delete().eq("id", paymentId);
  if (error) throw new Error(error.message);

  await syncProjectPaidAmount(payment.project_id as string);
  revalidateProjectPaths(payment.project_id as string);
}

export async function deleteProjectNoteAction(noteId: string) {
  await requireAuthenticatedAction();
  const supabase = createSupabaseServerClient();
  const { data: note, error: fetchError } = await supabase
    .from("project_notes")
    .select("body,happened_on,project_id,title,type")
    .eq("id", noteId)
    .single();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase.from("project_notes").delete().eq("id", noteId);
  if (error) throw new Error(error.message);

  await supabase
    .from("project_events")
    .delete()
    .match({
      happened_on: note.happened_on,
      notes: note.body,
      project_id: note.project_id,
      title: note.title,
      type: noteTypeToEventType(note.type as ProjectNote["type"])
    });

  revalidateProjectPaths(note.project_id as string);
  revalidatePath("/reuniones");
}

export async function deleteProjectEventAction(eventId: string) {
  await requireAuthenticatedAction();
  const supabase = createSupabaseServerClient();
  const { data: event, error: fetchError } = await supabase.from("project_events").select("project_id").eq("id", eventId).single();
  if (fetchError) throw new Error(fetchError.message);

  const { error } = await supabase.from("project_events").delete().eq("id", eventId);
  if (error) throw new Error(error.message);

  revalidateProjectPaths(event.project_id as string);
  revalidatePath("/reuniones");
}

export async function deleteCostAction(costId: string) {
  await requireAuthenticatedAction();
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("costs").delete().eq("id", costId);
  if (error) throw new Error(error.message);

  revalidatePath("/costos");
  revalidatePath("/dashboard");
}

export async function deleteCashMovementAction(movementId: string) {
  await requireAuthenticatedAction();
  const supabase = createSupabaseServerClient();
  const { error } = await supabase.from("cash_movements").delete().eq("id", movementId);
  if (error) throw new Error(error.message);

  revalidatePath("/dashboard");
  revalidatePath("/finanzas");
}

async function requireAuthenticatedAction() {
  if (!shouldRequireSupabaseAuth()) return;
  if (!isSupabaseAuthConfigured()) throw new Error("Supabase auth env vars are missing.");

  const supabase = await createSupabaseAuthServerClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autorizado");
}

// Trae los socios existentes para adjuntarlos a un proyecto nuevo.
// Antes sembraba 3 socios de ejemplo si no habia ninguno; se quito para que
// arrancar de una base vacia no reviva nombres placeholder. Los socios se
// crean solos cuando se asigna un responsable real (findOrCreatePartner).
async function getExistingPartners() {
  const supabase = createSupabaseServerClient();
  const { data, error } = await supabase.from("partners").select("id,name");
  if (error) throw new Error(error.message);
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
  if (type === "Reunion") return "Reunion";
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
