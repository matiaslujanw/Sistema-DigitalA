create type project_status as enum ('Relevamiento', 'En desarrollo', 'MVP armado', 'MVP entregado', 'Correcciones', 'Implementacion', 'En uso');
create type payment_method as enum ('Transferencia', 'Efectivo', 'USD', 'Cheque', 'Mixto');
create type cash_destination as enum ('Reparto socios', 'Plazo fijo', 'Dolares', 'Cheques', 'Reinversion', 'Caja');

create table public.clients (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  contact text,
  industry text,
  created_at timestamptz not null default now()
);

create table public.projects (
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
  next_milestone text,
  margin_target numeric(5, 2) not null default 0,
  created_at timestamptz not null default now()
);

create table public.project_payments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  happened_on date not null,
  amount numeric(14, 2) not null,
  currency text not null check (currency in ('ARS', 'USD')),
  method payment_method not null,
  note text,
  created_at timestamptz not null default now()
);

create table public.partners (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text,
  created_at timestamptz not null default now()
);

create table public.project_partners (
  project_id uuid not null references public.projects(id) on delete cascade,
  partner_id uuid not null references public.partners(id) on delete cascade,
  role text,
  primary key (project_id, partner_id)
);

create table public.project_events (
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

create table public.project_notes (
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

create table public.costs (
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

create table public.cash_movements (
  id uuid primary key default gen_random_uuid(),
  source_project_id uuid references public.projects(id) on delete set null,
  happened_on date not null,
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

alter table public.clients enable row level security;
alter table public.projects enable row level security;
alter table public.partners enable row level security;
alter table public.project_partners enable row level security;
alter table public.project_events enable row level security;
alter table public.project_notes enable row level security;
alter table public.project_payments enable row level security;
alter table public.costs enable row level security;
alter table public.cash_movements enable row level security;
