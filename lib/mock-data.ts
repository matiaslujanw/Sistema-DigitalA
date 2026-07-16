import type { CashMovement, Client, Cost, PartnerProfile, Project, ProjectEvent, ProjectPayment } from "./types";

export const partners = ["Matias", "Socio 2", "Socio 3"];

export const partnerProfiles: PartnerProfile[] = [
  {
    id: "u1",
    name: "Matias",
    role: "Producto y desarrollo",
    focus: "Arquitectura, discovery, IA y seguimiento de clientes",
    allocation: 82,
    email: "matias@digitalamenities.com.ar",
    status: "Activo"
  },
  {
    id: "u2",
    name: "Socio 2",
    role: "Frontend y delivery",
    focus: "UI, integraciones web, QA funcional y entregas",
    allocation: 74,
    email: "socio2@digitalamenities.com.ar",
    status: "Activo"
  },
  {
    id: "u3",
    name: "Socio 3",
    role: "Backend y operaciones",
    focus: "Supabase, automatizaciones, costos y soporte",
    allocation: 68,
    email: "socio3@digitalamenities.com.ar",
    status: "Activo"
  }
];

export const clients: Client[] = [
  { id: "c1", name: "Malala", contact: "Camila Ruiz", industry: "Salon de belleza" },
  { id: "c2", name: "La Vieja Escuela", contact: "Martin Paz", industry: "Bar cafe" },
  { id: "c3", name: "Bonivibe", contact: "Florencia Vega", industry: "Marca de ropa" },
  { id: "c4", name: "Countrify", contact: "Equipo interno", industry: "Producto propio" }
];

export const projects: Project[] = [
  {
    id: "p1",
    name: "Sistema integral Malala",
    clientId: "c1",
    status: "En desarrollo",
    salePrice: 1850000,
    currency: "ARS",
    paymentMethod: "Transferencia",
    paidAmount: 950000,
    contractSigned: true,
    contractDate: "2026-05-05",
    startDate: "2026-05-06",
    dueDate: "2026-08-15",
    nextMilestone: "Modulo de stock y empleados",
    marginTarget: 62,
    partners
  },
  {
    id: "p2",
    name: "IA operativa La Vieja Escuela",
    clientId: "c2",
    status: "Implementacion",
    salePrice: 1200000,
    currency: "ARS",
    paymentMethod: "Mixto",
    paidAmount: 1200000,
    contractSigned: true,
    contractDate: "2026-04-10",
    startDate: "2026-04-11",
    dueDate: "2026-07-30",
    nextMilestone: "Capacitacion del equipo",
    marginTarget: 70,
    partners: ["Matias", "Socio 2"]
  },
  {
    id: "p3",
    name: "Tienda sincronizada Bonivibe",
    clientId: "c3",
    status: "En uso",
    salePrice: 2400,
    currency: "USD",
    paymentMethod: "USD",
    paidAmount: 1800,
    contractSigned: true,
    contractDate: "2026-03-17",
    startDate: "2026-03-18",
    dueDate: "2026-07-10",
    nextMilestone: "Ajustes de checkout",
    marginTarget: 66,
    partners: ["Socio 2", "Socio 3"]
  },
  {
    id: "p4",
    name: "Backoffice Countrify",
    clientId: "c4",
    status: "Relevamiento",
    salePrice: 0,
    currency: "ARS",
    paymentMethod: "Transferencia",
    paidAmount: 0,
    contractSigned: false,
    contractDate: null,
    startDate: "2026-07-01",
    dueDate: "2026-09-30",
    nextMilestone: "Definir alcance MVP",
    marginTarget: 0,
    partners
  }
];

export const projectPayments: ProjectPayment[] = [
  {
    id: "pay1",
    projectId: "p1",
    date: "2026-05-06",
    amount: 500000,
    currency: "ARS",
    method: "Transferencia",
    note: "Anticipo para iniciar desarrollo."
  },
  {
    id: "pay2",
    projectId: "p1",
    date: "2026-06-05",
    amount: 450000,
    currency: "ARS",
    method: "Transferencia",
    note: "Pago contra primera entrega validada."
  },
  {
    id: "pay3",
    projectId: "p2",
    date: "2026-04-11",
    amount: 600000,
    currency: "ARS",
    method: "Mixto",
    note: "Anticipo kickoff."
  },
  {
    id: "pay4",
    projectId: "p2",
    date: "2026-05-15",
    amount: 600000,
    currency: "ARS",
    method: "Transferencia",
    note: "Cobro final."
  },
  {
    id: "pay5",
    projectId: "p3",
    date: "2026-03-18",
    amount: 900,
    currency: "USD",
    method: "USD",
    note: "Anticipo."
  },
  {
    id: "pay6",
    projectId: "p3",
    date: "2026-06-12",
    amount: 900,
    currency: "USD",
    method: "USD",
    note: "Segundo pago."
  }
];

export const events: ProjectEvent[] = [
  {
    id: "e1",
    projectId: "p1",
    type: "Reunion",
    title: "Kickoff y mapa operativo",
    date: "2026-05-06",
    hours: 1.5,
    owner: "Matias",
    notes: "Se relevaron turnos, stock, roles y comunicacion por WhatsApp."
  },
  {
    id: "e2",
    projectId: "p1",
    type: "Entrega",
    title: "Turnos + clientes",
    date: "2026-05-28",
    hours: 34,
    owner: "Socio 2",
    notes: "Primera entrega validada por el cliente."
  },
  {
    id: "e3",
    projectId: "p1",
    type: "Feature",
    title: "Stock inicial",
    date: "2026-06-21",
    hours: 22,
    owner: "Socio 3",
    notes: "Pendiente ajuste de alertas por bajo stock."
  },
  {
    id: "e4",
    projectId: "p2",
    type: "Implementacion",
    title: "Modelo IA de carga rapida",
    date: "2026-05-03",
    hours: 18,
    owner: "Matias",
    notes: "Se conecto el flujo principal y quedo en prueba con usuarios reales."
  },
  {
    id: "e5",
    projectId: "p3",
    type: "Decision",
    title: "Mantener Shopify + centralizar stock",
    date: "2026-04-09",
    hours: 2,
    owner: "Socio 2",
    notes: "Se decidio no migrar tienda para reducir riesgo."
  }
];

export const costs: Cost[] = [
  { id: "co1", projectId: null, name: "Supabase Pro", provider: "Supabase", amount: 20, currency: "USD", cadence: "Mensual", category: "Infra" },
  { id: "co2", projectId: null, name: "Hosting landing", provider: "Hostinger", amount: 10, currency: "USD", cadence: "Mensual", category: "Infra" },
  { id: "co3", projectId: "p1", name: "WhatsApp API", provider: "Meta", amount: 32000, currency: "ARS", cadence: "Mensual", category: "Software" },
  { id: "co4", projectId: "p3", name: "Dominio cliente", provider: "NIC", amount: 18000, currency: "ARS", cadence: "Unico", category: "Dominio" },
  { id: "co5", projectId: null, name: "Vercel", provider: "Vercel", amount: 20, currency: "USD", cadence: "Mensual", category: "Infra" }
];

export const cashMovements: CashMovement[] = [
  {
    id: "m1",
    sourceProjectId: "p2",
    date: "2026-05-15",
    concept: "Cobro final La Vieja Escuela",
    amount: 600000,
    currency: "ARS",
    destination: "Reparto socios",
    operation: "Reparto socios",
    notes: "Se dividio en partes iguales."
  },
  {
    id: "m2",
    sourceProjectId: "p1",
    date: "2026-06-05",
    concept: "Anticipo Malala",
    amount: 450000,
    currency: "ARS",
    destination: "Plazo fijo",
    operation: "Inversion",
    expectedReturnPercent: 6.8,
    actualReturnPercent: 6.4,
    notes: "Se deja inmovilizado hasta segunda entrega."
  },
  {
    id: "m3",
    sourceProjectId: "p3",
    date: "2026-06-12",
    concept: "Pago Bonivibe",
    amount: 900,
    currency: "USD",
    destination: "Caja",
    operation: "Reserva",
    notes: "Reserva para costos dolarizados."
  },
  {
    id: "m4",
    sourceProjectId: null,
    date: "2026-06-20",
    concept: "Compra de dolares",
    amount: 300,
    currency: "USD",
    destination: "Dolares",
    operation: "Compra divisa",
    acquiredCurrency: "USD",
    acquiredAmount: 300,
    exchangeRate: 1210,
    notes: "Cobertura de caja."
  }
];
