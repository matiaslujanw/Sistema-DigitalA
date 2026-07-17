import "server-only";

import { unstable_noStore as noStore } from "next/cache";
import { cashMovements as mockCashMovements, clients as mockClients, costs as mockCosts, events as mockEvents, maintenanceContracts as mockMaintenanceContracts, partnerProfiles as mockPartnerProfiles, projectPayments as mockProjectPayments, projects as mockProjects } from "@/lib/mock-data";
import { createSupabaseServerClient, isSupabaseConfigured } from "@/lib/supabase/server";
import type { CashMovement, Client, Cost, Idea, MaintenanceContract, PartnerProfile, Project, ProjectEvent, ProjectNote, ProjectPayment } from "@/lib/types";

type AppData = {
  cashMovements: CashMovement[];
  clients: Client[];
  costs: Cost[];
  events: ProjectEvent[];
  ideas: Idea[];
  maintenanceContracts: MaintenanceContract[];
  notes: ProjectNote[];
  partnerProfiles: PartnerProfile[];
  payments: ProjectPayment[];
  projects: Project[];
  source: "mock" | "supabase";
};

type DbClient = {
  id: string;
  name: string;
  contact: string | null;
  industry: string | null;
};

type DbPartner = {
  id: string;
  name: string;
  email: string | null;
  role: string | null;
  focus: string | null;
  allocation: number | null;
  status: "Activo" | "Pausado" | null;
};

type DbProject = {
  id: string;
  client_id: string | null;
  kind: Project["kind"] | null;
  vertical: string | null;
  summary: string | null;
  deploy_url: string | null;
  generates_revenue: boolean | null;
  name: string;
  status: Project["status"];
  sale_price: number | string;
  currency: "ARS" | "USD";
  payment_method: Project["paymentMethod"];
  paid_amount: number | string;
  contract_signed: boolean;
  contract_date: string | null;
  start_date: string;
  due_date: string | null;
  next_milestone: string | null;
  margin_target: number | string;
};

type DbProjectPartner = {
  project_id: string;
  partner_id: string;
};

type DbPayment = {
  id: string;
  project_id: string;
  happened_on: string;
  amount: number | string;
  currency: "ARS" | "USD";
  method: ProjectPayment["method"];
  note: string | null;
};

type DbEvent = {
  id: string;
  project_id: string;
  type: ProjectEvent["type"];
  title: string;
  happened_on: string;
  hours: number | string;
  owner_partner_id: string | null;
  notes: string | null;
};

type DbNote = {
  id: string;
  project_id: string;
  happened_on: string;
  type: ProjectNote["type"];
  title: string;
  body: string;
  owner_partner_id: string | null;
  creates_task: boolean;
};

type DbCost = {
  id: string;
  project_id: string | null;
  name: string;
  provider: string | null;
  amount: number | string;
  currency: "ARS" | "USD";
  cadence: "Mensual" | "Unico";
  category: Cost["category"];
  due_day: number | null;
  last_paid_month: string | null;
};

type DbMaintenanceContract = {
  id: string;
  project_id: string;
  system_name: string;
  client_name: string | null;
  amount: number | string;
  currency: "ARS" | "USD";
  due_day: number | null;
  last_paid_month: string | null;
  active: boolean | null;
  notes: string | null;
};

type DbIdea = {
  id: string;
  project_id: string | null;
  title: string;
  kind: string;
  body: string;
  need: string;
  urgency: Idea["urgency"];
  created_at: string;
};

type DbCashMovement = {
  id: string;
  payment_id: string | null;
  parent_movement_id: string | null;
  partner_id: string | null;
  source_project_id: string | null;
  happened_on: string;
  due_date: string | null;
  concept: string;
  amount: number | string;
  currency: "ARS" | "USD";
  operation: CashMovement["kind"] | null;
  acquired_currency: CashMovement["acquiredCurrency"] | null;
  acquired_amount: number | string | null;
  exchange_rate: number | string | null;
  expected_return_percent: number | string | null;
  actual_return_percent: number | string | null;
  notes: string | null;
};

const fallbackData: AppData = {
  cashMovements: mockCashMovements,
  clients: mockClients,
  costs: mockCosts,
  events: mockEvents,
  ideas: [],
  maintenanceContracts: mockMaintenanceContracts,
  notes: [],
  partnerProfiles: mockPartnerProfiles,
  payments: mockProjectPayments,
  projects: mockProjects,
  source: "mock"
};

export async function getAppData(): Promise<AppData> {
  noStore();

  if (!isSupabaseConfigured()) {
    return fallbackData;
  }

  try {
    return await getSupabaseData();
  } catch {
    return fallbackData;
  }
}

export async function getProjectDetail(projectId: string) {
  const data = await getAppData();
  const project = data.projects.find((item) => item.id === projectId) ?? null;
  const client = project ? data.clients.find((item) => item.id === project.clientId) ?? null : null;

  return {
    client,
    costs: data.costs.filter((cost) => cost.projectId === projectId),
    events: data.events.filter((event) => event.projectId === projectId),
    ideas: data.ideas.filter((idea) => idea.projectId === projectId),
    notes: data.notes.filter((note) => note.projectId === projectId),
    partnerNames: data.partnerProfiles.filter((partner) => partner.status === "Activo").map((partner) => partner.name),
    payments: data.payments.filter((payment) => payment.projectId === projectId),
    project,
    source: data.source
  };
}

async function getSupabaseData(): Promise<AppData> {
  const supabase = createSupabaseServerClient();
  const [
    clientsResult,
    partnersResult,
    projectsResult,
    projectPartnersResult,
    paymentsResult,
    eventsResult,
    notesResult,
    costsResult,
    cashMovementsResult,
    ideasResult,
    maintenanceContractsResult
  ] = await Promise.all([
    supabase.from("clients").select("*").order("created_at", { ascending: true }),
    supabase.from("partners").select("*").order("created_at", { ascending: true }),
    supabase.from("projects").select("*").order("created_at", { ascending: false }),
    supabase.from("project_partners").select("*"),
    supabase.from("project_payments").select("*").order("happened_on", { ascending: false }),
    supabase.from("project_events").select("*").order("happened_on", { ascending: false }),
    supabase.from("project_notes").select("*").order("happened_on", { ascending: false }),
    supabase.from("costs").select("*").order("created_at", { ascending: false }),
    supabase.from("cash_movements").select("*").order("happened_on", { ascending: false }),
    supabase.from("ideas").select("*").order("created_at", { ascending: false }),
    supabase.from("maintenance_contracts").select("*").order("created_at", { ascending: false })
  ]);

  const results = [
    clientsResult,
    partnersResult,
    projectsResult,
    projectPartnersResult,
    paymentsResult,
    eventsResult,
    notesResult,
    costsResult,
    cashMovementsResult
  ];
  const firstError = results.find((result) => result.error)?.error;
  if (firstError) {
    throw firstError;
  }

  const dbClients = (clientsResult.data ?? []) as DbClient[];
  const dbPartners = (partnersResult.data ?? []) as DbPartner[];
  const dbProjects = (projectsResult.data ?? []) as DbProject[];
  const dbProjectPartners = (projectPartnersResult.data ?? []) as DbProjectPartner[];
  const dbPayments = (paymentsResult.data ?? []) as DbPayment[];
  const dbEvents = (eventsResult.data ?? []) as DbEvent[];
  const dbNotes = (notesResult.data ?? []) as DbNote[];
  const dbCosts = (costsResult.data ?? []) as DbCost[];
  const dbCashMovements = (cashMovementsResult.data ?? []) as DbCashMovement[];
  // La tabla ideas puede no existir todavia (SQL pendiente de aplicar); no bloquea el resto.
  const dbIdeas = (ideasResult.error ? [] : (ideasResult.data ?? [])) as DbIdea[];
  // Idem mantenimientos: si la tabla todavia no fue aplicada, el resto del sistema sigue levantando.
  const dbMaintenanceContracts = (maintenanceContractsResult.error ? [] : (maintenanceContractsResult.data ?? [])) as DbMaintenanceContract[];
  const partnerNameById = new Map(dbPartners.map((partner) => [partner.id, partner.name]));

  const clients = dbClients.map<Client>((client) => ({
    id: client.id,
    contact: client.contact ?? "Sin contacto",
    industry: client.industry ?? "Sin rubro",
    name: client.name
  }));

  const payments = dbPayments.map<ProjectPayment>((payment) => ({
    id: payment.id,
    amount: toNumber(payment.amount),
    currency: payment.currency,
    date: payment.happened_on,
    method: payment.method,
    note: payment.note ?? "Pago registrado",
    projectId: payment.project_id
  }));

  const projects = dbProjects.map<Project>((project) => {
    const assignedPartnerNames = dbProjectPartners
      .filter((item) => item.project_id === project.id)
      .map((item) => partnerNameById.get(item.partner_id))
      .filter((name): name is string => Boolean(name));
    const paidAmount = payments
      .filter((payment) => payment.projectId === project.id && payment.currency === project.currency)
      .reduce((sum, payment) => sum + payment.amount, 0);

    return {
      id: project.id,
      clientId: project.client_id,
      contractDate: project.contract_date,
      contractSigned: project.contract_signed,
      currency: project.currency,
      deployUrl: project.deploy_url,
      dueDate: project.due_date,
      generatesRevenue: project.generates_revenue ?? false,
      kind: project.kind ?? "Cliente",
      marginTarget: toNumber(project.margin_target),
      name: project.name,
      nextMilestone: project.next_milestone ?? "Definir proximo hito",
      paidAmount: paidAmount || toNumber(project.paid_amount),
      partners: assignedPartnerNames,
      paymentMethod: project.payment_method,
      salePrice: toNumber(project.sale_price),
      startDate: project.start_date,
      status: project.status,
      summary: project.summary,
      vertical: project.vertical
    };
  });

  return {
    cashMovements: dbCashMovements.map<CashMovement>((movement) => ({
      id: movement.id,
      paymentId: movement.payment_id,
      parentMovementId: movement.parent_movement_id,
      partnerId: movement.partner_id,
      sourceProjectId: movement.source_project_id,
      kind: (movement.operation ?? "Gasto") as CashMovement["kind"],
      date: movement.happened_on,
      dueDate: movement.due_date,
      concept: movement.concept,
      amount: toNumber(movement.amount),
      currency: movement.currency,
      acquiredAmount: toOptionalNumber(movement.acquired_amount),
      acquiredCurrency: movement.acquired_currency ?? undefined,
      exchangeRate: toOptionalNumber(movement.exchange_rate),
      expectedReturnPercent: toOptionalNumber(movement.expected_return_percent),
      actualReturnPercent: toOptionalNumber(movement.actual_return_percent),
      notes: movement.notes ?? ""
    })),
    clients,
    costs: dbCosts.map<Cost>((cost) => ({
      id: cost.id,
      amount: toNumber(cost.amount),
      cadence: cost.cadence,
      category: cost.category,
      currency: cost.currency,
      dueDay: cost.due_day,
      lastPaidMonth: cost.last_paid_month,
      name: cost.name,
      projectId: cost.project_id,
      provider: cost.provider ?? "Sin proveedor"
    })),
    events: dbEvents.map<ProjectEvent>((event) => ({
      id: event.id,
      date: event.happened_on,
      hours: toNumber(event.hours),
      notes: event.notes ?? "",
      owner: event.owner_partner_id ? partnerNameById.get(event.owner_partner_id) ?? "Sin responsable" : "Sin responsable",
      projectId: event.project_id,
      title: event.title,
      type: event.type
    })),
    ideas: dbIdeas.map<Idea>((idea) => ({
      id: idea.id,
      body: idea.body,
      createdAt: idea.created_at.slice(0, 10),
      kind: idea.kind,
      need: idea.need,
      projectId: idea.project_id,
      title: idea.title,
      urgency: idea.urgency
    })),
    maintenanceContracts: dbMaintenanceContracts.map<MaintenanceContract>((maintenance) => ({
      id: maintenance.id,
      active: maintenance.active ?? true,
      amount: toNumber(maintenance.amount),
      clientName: maintenance.client_name ?? "Cliente",
      currency: maintenance.currency,
      dueDay: maintenance.due_day ?? 10,
      lastPaidMonth: maintenance.last_paid_month,
      notes: maintenance.notes ?? "",
      projectId: maintenance.project_id,
      systemName: maintenance.system_name
    })),
    notes: dbNotes.map<ProjectNote>((note) => ({
      id: note.id,
      body: note.body,
      createsTask: note.creates_task,
      date: note.happened_on,
      owner: note.owner_partner_id ? partnerNameById.get(note.owner_partner_id) ?? "Sin responsable" : "Sin responsable",
      projectId: note.project_id,
      title: note.title,
      type: note.type
    })),
    partnerProfiles: dbPartners.map<PartnerProfile>((partner) => ({
      id: partner.id,
      allocation: partner.allocation ?? 0,
      email: partner.email ?? "",
      focus: partner.focus ?? "Operacion y delivery",
      name: partner.name,
      role: partner.role ?? "Socio",
      status: partner.status ?? "Activo"
    })),
    payments,
    projects,
    source: "supabase"
  };
}

function toNumber(value: number | string | null) {
  return Number(value ?? 0);
}

function toOptionalNumber(value: number | string | null) {
  if (value === null || value === undefined || value === "") return undefined;
  return Number(value);
}
