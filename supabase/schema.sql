create extension if not exists pgcrypto;

do $$
begin
  create type project_status as enum ('Relevamiento', 'En desarrollo', 'MVP armado', 'MVP entregado', 'Correcciones', 'Implementacion', 'En uso');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type payment_method as enum ('Transferencia', 'Efectivo', 'USD', 'Cheque', 'Mixto');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type cash_destination as enum ('Reparto socios', 'Plazo fijo', 'Dolares', 'Cheques', 'Reinversion', 'Caja');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  industry text,
  created_at timestamptz not null default now()
);

create table if not exists public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  role text not null default 'Socio',
  focus text not null default 'Operacion y delivery',
  allocation integer not null default 0 check (allocation >= 0 and allocation <= 100),
  status text not null default 'Activo' check (status in ('Activo', 'Pausado')),
  created_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  client_id uuid not null references public.clients(id) on delete restrict,
  name text not null,
  status project_status not null default 'Relevamiento',
  sale_price numeric(14, 2) not null default 0,
  currency text not null check (currency in ('ARS', 'USD')),
  payment_method payment_method not null default 'Transferencia',
  paid_amount numeric(14, 2) not null default 0,
  contract_signed boolean not null default false,
  contract_date date,
  start_date date not null default current_date,
  due_date date,
  next_milestone text not null default 'Definir proximo hito',
  margin_target numeric(5, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.project_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  happened_on date not null,
  amount numeric(14, 2) not null,
  currency text not null check (currency in ('ARS', 'USD')),
  method payment_method not null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.project_partners (
  project_id uuid not null references public.projects(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  role text,
  primary key (project_id, partner_id)
);

create table if not exists public.project_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  type text not null check (type in ('Reunion', 'Entrega', 'Feature', 'Implementacion', 'Decision', 'Relevamiento', 'Nota', 'Pedido cliente', 'Bloqueo', 'Cambio de alcance')),
  title text not null,
  happened_on date not null,
  hours numeric(8, 2) not null default 0,
  owner_partner_id uuid references public.partners(id) on delete set null,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.project_notes (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  happened_on date not null,
  type text not null check (type in ('Reunion', 'Relevamiento', 'Decision', 'Pedido cliente', 'Nota interna', 'Bloqueo', 'Alcance', 'Cambio de alcance')),
  title text not null,
  body text not null,
  owner_partner_id uuid references public.partners(id) on delete set null,
  creates_task boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.costs (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  name text not null,
  provider text,
  amount numeric(14, 2) not null,
  currency text not null check (currency in ('ARS', 'USD')),
  cadence text not null check (cadence in ('Mensual', 'Unico')),
  category text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.maintenance_contracts (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  system_name text not null,
  client_name text,
  amount numeric(14, 2) not null default 0,
  currency text not null check (currency in ('ARS', 'USD')),
  due_day integer not null default 10 check (due_day >= 1 and due_day <= 31),
  last_paid_month text,
  active boolean not null default true,
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  source_project_id uuid references public.projects(id) on delete set null,
  happened_on date not null,
  due_date date,
  concept text not null,
  amount numeric(14, 2) not null,
  currency text not null check (currency in ('ARS', 'USD')),
  destination cash_destination not null,
  operation text not null default 'Cobro',
  acquired_currency text,
  acquired_amount numeric(14, 2),
  exchange_rate numeric(14, 4),
  expected_return_percent numeric(8, 4),
  actual_return_percent numeric(8, 4),
  notes text,
  created_at timestamptz not null default now()
);

create table if not exists public.ideas (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete set null,
  title text not null,
  kind text not null default 'Idea',
  body text not null default '',
  need text not null default '',
  urgency text not null default 'media' check (urgency in ('baja', 'media', 'alta', 'urgente')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Si la tabla ideas ya existia sin vinculo a proyecto, agregarlo.
alter table public.ideas add column if not exists project_id uuid references public.projects(id) on delete set null;

-- Fecha comprometida de entrega/fin del proyecto (definida por los socios).
alter table public.projects add column if not exists due_date date;

-- Proyectos propios (productos de Digital Amenities) vs. de clientes.
alter table public.projects add column if not exists kind text not null default 'Cliente' check (kind in ('Propio', 'Cliente'));
-- Amenity / vertical del producto (Hoteles, Financieras, Countries...). Texto libre: se crean nuevas a mano.
alter table public.projects add column if not exists vertical text;
-- De que es el producto (descripcion corta).
alter table public.projects add column if not exists summary text;
-- Donde esta deployado (URL publica).
alter table public.projects add column if not exists deploy_url text;
-- Si el producto ya genera ingresos.
alter table public.projects add column if not exists generates_revenue boolean not null default false;
-- Los proyectos propios no tienen cliente: client_id deja de ser obligatorio.
alter table public.projects alter column client_id drop not null;
create index if not exists projects_kind_idx on public.projects(kind);
create index if not exists projects_vertical_idx on public.projects(vertical);

-- Finanzas como flujo trazable: cada movimiento es un paso de asignacion que
-- cuelga de un cobro (payment_id = el pago del proyecto) y, opcional, de otro
-- paso (parent_movement_id). partner_id es para los repartos a socios.
alter table public.cash_movements add column if not exists payment_id uuid references public.project_payments(id) on delete cascade;
alter table public.cash_movements add column if not exists parent_movement_id uuid references public.cash_movements(id) on delete cascade;
alter table public.cash_movements add column if not exists partner_id uuid references public.partners(id) on delete set null;
alter table public.cash_movements add column if not exists due_date date;
-- El destino dejo de usarse (lo reemplaza el tipo de paso en `operation`).
alter table public.cash_movements alter column destination drop not null;
create index if not exists cash_movements_payment_id_idx on public.cash_movements(payment_id);
create index if not exists cash_movements_parent_movement_id_idx on public.cash_movements(parent_movement_id);
create index if not exists cash_movements_partner_id_idx on public.cash_movements(partner_id);

-- Vencimiento y pago mensual de gastos fijos.
alter table public.costs add column if not exists due_day integer check (due_day >= 1 and due_day <= 31);
alter table public.costs add column if not exists last_paid_month text;

-- Cobros recurrentes por mantenimiento de sistemas.
create index if not exists maintenance_contracts_project_id_idx on public.maintenance_contracts(project_id);
create index if not exists maintenance_contracts_due_day_idx on public.maintenance_contracts(due_day);

create index if not exists ideas_project_id_idx on public.ideas(project_id);
create index if not exists projects_client_id_idx on public.projects(client_id);
create index if not exists project_payments_project_id_idx on public.project_payments(project_id);
create index if not exists project_events_project_id_idx on public.project_events(project_id);
create index if not exists project_notes_project_id_idx on public.project_notes(project_id);
create index if not exists project_partners_partner_id_idx on public.project_partners(partner_id);
create index if not exists costs_project_id_idx on public.costs(project_id);
create index if not exists cash_movements_source_project_id_idx on public.cash_movements(source_project_id);

alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.partners enable row level security;
alter table public.project_partners enable row level security;
alter table public.project_events enable row level security;
alter table public.project_notes enable row level security;
alter table public.project_payments enable row level security;
alter table public.costs enable row level security;
alter table public.cash_movements enable row level security;
alter table public.ideas enable row level security;
alter table public.maintenance_contracts enable row level security;
