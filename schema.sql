-- =====================================================================
--  FINANÇAS DA FAMÍLIA — Schema (Supabase / PostgreSQL)
--  Modelo: um "household" (casal) com 2 membros, ambos ADMIN.
--  Tudo é isolado por household_id via Row Level Security (RLS).
-- =====================================================================

create extension if not exists "pgcrypto";

-- ---------- ENUMS ----------
create type member_role     as enum ('husband', 'wife');
create type income_kind     as enum ('fixed', 'variable');
create type expense_type    as enum ('recurring', 'extraordinary');
create type payment_status  as enum ('pending', 'paid');
create type income_status   as enum ('expected', 'received');
create type invest_kind     as enum ('cdb', 'fixed_income');

-- ---------- HOUSEHOLD & MEMBROS ----------
create table households (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default 'Nossa Família',
  created_at timestamptz not null default now()
);

-- Cada membro = 1 usuário do Supabase Auth. Ambos são admin (acesso total).
create table members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  role         member_role not null,
  display_name text not null,
  is_admin     boolean not null default true,
  created_at   timestamptz not null default now(),
  unique (household_id, role)            -- 1 marido + 1 esposa
);

-- ---------- CONTAS BANCÁRIAS ----------
create table accounts (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references households(id) on delete cascade,
  owner_member_id uuid not null references members(id),
  name            text not null,                       -- "Nubank Marido"
  bank            text,
  initial_balance numeric(14,2) not null default 0,
  archived        boolean not null default false,
  created_at      timestamptz not null default now()
);

-- ---------- RECEITAS ----------
create table incomes (
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  description   text not null,                         -- "Salário CLT", "Uber - semana 12"
  kind          income_kind not null,                  -- fixa | variável
  origin_tag    text,                                  -- "CLT", "Uber", "99", "Freela"
  amount        numeric(14,2) not null check (amount > 0),
  account_id    uuid not null references accounts(id), -- conta onde o dinheiro caiu
  received_by   uuid not null references members(id),
  date          date not null,                         -- data programada / recebida
  status        income_status not null default 'received',
  series_id     uuid,                                  -- agrupa lançamentos repetidos (salário mensal)
  created_at    timestamptz not null default now()
);
create index on incomes (household_id, date);

-- ---------- DESPESAS ----------
create table expenses (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid not null references households(id) on delete cascade,
  description  text not null,
  category     text not null,                          -- Moradia, Transporte, Lazer...
  amount       numeric(14,2) not null check (amount > 0),
  type         expense_type not null,                  -- recorrente | extraordinária
  paid_by      uuid not null references members(id),   -- quem pagou
  account_id   uuid not null references accounts(id),  -- conta de origem
  due_date     date not null,
  status       payment_status not null default 'pending',
  paid_date    date,                                   -- data efetiva do pagamento
  series_id    uuid,
  created_at   timestamptz not null default now(),
  constraint paid_requires_date check (status = 'pending' or paid_date is not null)
);
create index on expenses (household_id, due_date);
create index on expenses (household_id, status);

-- ---------- INVESTIMENTOS (CDB / Renda Fixa) ----------
create table investments (
  id              uuid primary key default gen_random_uuid(),
  household_id    uuid not null references households(id) on delete cascade,
  owner_member_id uuid not null references members(id),
  name            text not null,                       -- "CDB 110% CDI Inter"
  kind            invest_kind not null default 'cdb',
  institution     text,
  initial_balance numeric(14,2) not null default 0,    -- saldo acumulado ao cadastrar
  created_at      timestamptz not null default now()
);

create table investment_contributions (                -- aportes adicionais
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  investment_id uuid not null references investments(id) on delete cascade,
  date          date not null,
  amount        numeric(14,2) not null check (amount > 0),
  from_account  uuid references accounts(id),          -- (opcional) debita da conta
  note          text
);

create table investment_yields (                       -- rendimento mensal líquido
  id            uuid primary key default gen_random_uuid(),
  household_id  uuid not null references households(id) on delete cascade,
  investment_id uuid not null references investments(id) on delete cascade,
  month         date not null,                         -- sempre dia 01 do mês
  amount        numeric(14,2) not null,                -- R$ líquido
  percent       numeric(8,4) not null,                 -- % sobre saldo do início do mês
  unique (investment_id, month)
);

-- =====================================================================
--  VIEW: saldo atual por conta
--  saldo = inicial + receitas recebidas − despesas pagas − aportes debitados
-- =====================================================================
create or replace view account_balances as
select
  a.id as account_id,
  a.household_id,
  a.name,
  a.owner_member_id,
  a.initial_balance
    + coalesce((select sum(i.amount) from incomes i
                where i.account_id = a.id and i.status = 'received'), 0)
    - coalesce((select sum(e.amount) from expenses e
                where e.account_id = a.id and e.status = 'paid'), 0)
    - coalesce((select sum(c.amount) from investment_contributions c
                where c.from_account = a.id), 0)        as balance
from accounts a
where not a.archived;

-- =====================================================================
--  ROW LEVEL SECURITY — só enxerga/edita quem é membro do household
-- =====================================================================
create or replace function my_household() returns uuid
language sql stable security definer set search_path = public as $$
  select household_id from members where auth_user_id = auth.uid() limit 1
$$;

alter table households                enable row level security;
alter table members                   enable row level security;
alter table accounts                  enable row level security;
alter table incomes                   enable row level security;
alter table expenses                  enable row level security;
alter table investments               enable row level security;
alter table investment_contributions  enable row level security;
alter table investment_yields         enable row level security;

create policy "household: ver o meu" on households
  for select using (id = my_household());

create policy "members: ver do meu household" on members
  for select using (household_id = my_household());
create policy "members: editar o próprio nome" on members
  for update using (auth_user_id = auth.uid());

-- Ambos são admin: CRUD total nas tabelas do próprio household
do $$
declare t text;
begin
  foreach t in array array['accounts','incomes','expenses','investments',
                           'investment_contributions','investment_yields']
  loop
    execute format(
      'create policy "%1$s: crud household" on %1$I
         for all using (household_id = my_household())
         with check (household_id = my_household())', t);
  end loop;
end $$;

-- Realtime (sincroniza celular do marido e da esposa)
alter publication supabase_realtime add table accounts, incomes, expenses,
  investments, investment_contributions, investment_yields;
