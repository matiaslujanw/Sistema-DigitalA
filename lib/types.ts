export type ProjectStatus =
  | "Relevamiento"
  | "En desarrollo"
  | "MVP armado"
  | "MVP entregado"
  | "Correcciones"
  | "Implementacion"
  | "En uso";

export type ProjectKind = "Propio" | "Cliente";

export type PaymentMethod = "Transferencia" | "Efectivo" | "USD" | "Cheque" | "Mixto";

// Pasos con los que se asigna un cobro: cambio de moneda, compra de cheque,
// plazo fijo, reparto a un socio, gasto o dejar en caja. Solo Cambio genera
// un "pool" nuevo (la plata resultante) del que pueden colgar mas pasos.
export type AllocationKind = "Cambio" | "Cheque" | "Plazo fijo" | "Reparto" | "Gasto" | "Caja";

export type Client = {
  id: string;
  name: string;
  contact: string;
  industry: string;
};

export type ProjectEvent = {
  id: string;
  projectId: string;
  type:
    | "Reunion"
    | "Entrega"
    | "Feature"
    | "Implementacion"
    | "Decision"
    | "Relevamiento"
    | "Nota"
    | "Pedido cliente"
    | "Bloqueo"
    | "Cambio de alcance";
  title: string;
  date: string;
  hours: number;
  owner: string;
  notes: string;
};

export type ProjectNote = {
  id: string;
  projectId: string;
  date: string;
  type: "Reunion" | "Relevamiento" | "Decision" | "Pedido cliente" | "Nota interna" | "Bloqueo" | "Alcance" | "Cambio de alcance";
  title: string;
  body: string;
  owner: string;
  createsTask: boolean;
};

export type ProjectPayment = {
  id: string;
  projectId: string;
  date: string;
  amount: number;
  currency: "ARS" | "USD";
  method: PaymentMethod;
  note: string;
};

export type Project = {
  id: string;
  name: string;
  kind: ProjectKind;
  clientId: string | null;
  vertical: string | null;
  summary: string | null;
  deployUrl: string | null;
  generatesRevenue: boolean;
  status: ProjectStatus;
  salePrice: number;
  currency: "ARS" | "USD";
  paymentMethod: PaymentMethod;
  paidAmount: number;
  contractSigned: boolean;
  contractDate: string | null;
  startDate: string;
  dueDate: string | null;
  nextMilestone: string;
  marginTarget: number;
  partners: string[];
};

export type Cost = {
  id: string;
  projectId: string | null;
  name: string;
  provider: string;
  amount: number;
  currency: "ARS" | "USD";
  cadence: "Mensual" | "Unico";
  category: "Infra" | "Software" | "Dominio" | "Marketing" | "Operativo";
  dueDay?: number | null;
  lastPaidMonth?: string | null;
};

export type MaintenanceContract = {
  id: string;
  projectId: string;
  systemName: string;
  clientName: string;
  amount: number;
  currency: "ARS" | "USD";
  dueDay: number;
  lastPaidMonth: string | null;
  active: boolean;
  notes: string;
};

// Un paso de asignacion de plata. Cuelga siempre de un cobro (paymentId = el
// pago del proyecto que origina el flujo) y, opcionalmente, de otro paso
// (parentMovementId: p.ej. un reparto que sale del ARS de un cambio).
export type CashMovement = {
  id: string;
  paymentId: string | null;
  parentMovementId: string | null;
  sourceProjectId: string | null;
  kind: AllocationKind;
  date: string;
  dueDate?: string | null; // para cheques/plazos: cuando se espera cobrar
  concept: string;
  amount: number; // monto que consume del pool padre, en la moneda de ese pool
  currency: "ARS" | "USD";
  partnerId: string | null; // para Reparto: a que socio
  acquiredCurrency?: "USD" | "EUR" | "USDT" | "ARS"; // para Cambio: moneda resultante
  acquiredAmount?: number; // para Cambio: monto resultante
  exchangeRate?: number; // para Cambio: tipo de cambio
  expectedReturnPercent?: number; // para Plazo fijo
  actualReturnPercent?: number;
  notes: string;
};

export type IdeaUrgency = "baja" | "media" | "alta" | "urgente";

export type Idea = {
  id: string;
  projectId: string | null;
  title: string;
  kind: string;
  body: string;
  need: string;
  urgency: IdeaUrgency;
  createdAt: string;
};

export type PartnerProfile = {
  id: string;
  name: string;
  role: string;
  focus: string;
  allocation: number;
  email: string;
  status: "Activo" | "Pausado";
};
