export type ProjectStatus =
  | "Relevamiento"
  | "En desarrollo"
  | "MVP armado"
  | "MVP entregado"
  | "Correcciones"
  | "Implementacion"
  | "En uso";

export type PaymentMethod = "Transferencia" | "Efectivo" | "USD" | "Cheque" | "Mixto";

export type CashDestination = "Reparto socios" | "Plazo fijo" | "Dolares" | "Cheques" | "Reinversion" | "Caja";

export type FinanceOperation = "Cobro" | "Reparto socios" | "Compra divisa" | "Inversion" | "Gasto" | "Reserva";

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
  clientId: string;
  status: ProjectStatus;
  salePrice: number;
  currency: "ARS" | "USD";
  paymentMethod: PaymentMethod;
  paidAmount: number;
  contractSigned: boolean;
  contractDate: string | null;
  startDate: string;
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
};

export type CashMovement = {
  id: string;
  sourceProjectId: string | null;
  date: string;
  concept: string;
  amount: number;
  currency: "ARS" | "USD";
  destination: CashDestination;
  operation: FinanceOperation;
  acquiredCurrency?: "USD" | "EUR" | "USDT" | "ARS";
  acquiredAmount?: number;
  exchangeRate?: number;
  expectedReturnPercent?: number;
  actualReturnPercent?: number;
  notes: string;
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
