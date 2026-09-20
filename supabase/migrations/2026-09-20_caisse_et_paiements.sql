-- ---------------------------------------------------------------------------
-- Belhotel — caisse par pôle et paiements (espèces / mobile money / mixte)
-- ---------------------------------------------------------------------------
-- À coller dans le SQL Editor de Supabase, puis Ctrl + Entrée.
-- Ré-exécutable sans danger : tout est en « if not exists ».
--
-- Ce que ça ajoute :
--   1. le type payment_method ('cash', 'mobile_money', 'mixed') ;
--   2. les colonnes de paiement sur orders, dont cash_amount et momo_amount ;
--   3. les sessions de caisse (une ouverte à la fois par pôle) ;
--   4. les sorties de caisse (dépenses en espèces, avec motif) ;
--   5. les RPC process_order_payment, get_cash_session_summary,
--      open_cash_session et close_cash_session ;
--   6. RLS : chaque responsable ne voit que la caisse de son pôle.
--
-- Une commande « à encaisser » n'est pas un nouveau statut : c'est une
-- commande livrée dont paid_at est encore nul. Le cycle existant
-- (reception → sent → preparing → delivered) n'est pas modifié.
-- ---------------------------------------------------------------------------


-- ===========================================================================
-- 1. Type de paiement
-- ===========================================================================
do $$
begin
  create type public.payment_method as enum ('cash', 'mobile_money', 'mixed');
exception
  when duplicate_object then null;
end $$;


-- ===========================================================================
-- 2. Pôle d'encaissement
-- ===========================================================================
-- L'argent est encaissé là où le client paie : une commande de chambre est
-- réglée à la réception, une commande de table au restaurant, une commande
-- de salon au bar.
create or replace function public.order_sector(p_origin_type text, p_target text)
returns text
language sql
immutable
as $$
  select case when p_origin_type = 'room' then 'hotel' else p_target end;
$$;


-- ===========================================================================
-- 3. Sessions de caisse
-- ===========================================================================
create table if not exists public.cash_sessions (
  id              uuid primary key default gen_random_uuid(),
  sector          text not null check (sector in ('resto', 'bar', 'hotel')),
  opening_float   bigint not null default 0 check (opening_float >= 0),
  opened_at       timestamptz not null default now(),
  opened_by       uuid references public.admins(id) on delete set null,
  closed_at       timestamptz,
  closed_by       uuid references public.admins(id) on delete set null,
  counted_cash    bigint,   -- espèces réellement comptées à la clôture
  expected_cash   bigint,   -- solde théorique figé au moment de la clôture
  difference      bigint,   -- écart = compté - théorique (négatif = manquant)
  note            text
);

-- Un seul fond de caisse ouvert à la fois par pôle.
create unique index if not exists cash_sessions_one_open_per_sector
  on public.cash_sessions (sector)
  where closed_at is null;

create index if not exists cash_sessions_sector_opened_idx
  on public.cash_sessions (sector, opened_at desc);


-- ===========================================================================
-- 4. Sorties de caisse
-- ===========================================================================
create table if not exists public.cash_movements (
  id          uuid primary key default gen_random_uuid(),
  session_id  uuid not null references public.cash_sessions(id) on delete cascade,
  amount      bigint not null check (amount > 0),
  reason      text not null check (length(trim(reason)) > 0),
  created_at  timestamptz not null default now(),
  created_by  uuid references public.admins(id) on delete set null
);

create index if not exists cash_movements_session_idx
  on public.cash_movements (session_id, created_at desc);


-- ===========================================================================
-- 5. Paiement sur les commandes
-- ===========================================================================
alter table public.orders
  add column if not exists payment_method  public.payment_method,
  add column if not exists cash_amount     bigint not null default 0,
  add column if not exists momo_amount     bigint not null default 0,
  add column if not exists paid_at         timestamptz,
  add column if not exists paid_by         uuid references public.admins(id) on delete set null,
  add column if not exists cash_session_id uuid references public.cash_sessions(id) on delete set null;

-- Retrouver vite les commandes à encaisser et celles d'une session.
create index if not exists orders_unpaid_idx
  on public.orders (created_at desc)
  where paid_at is null;

create index if not exists orders_cash_session_idx
  on public.orders (cash_session_id);

comment on column public.orders.cash_amount is
  'Part réglée en espèces. Pour un paiement mixte, cash_amount + momo_amount = total.';
comment on column public.orders.momo_amount is
  'Part réglée en mobile money.';


-- ===========================================================================
-- 6. Qui est connecté, et à quel pôle a-t-il droit
-- ===========================================================================
create or replace function public.staff_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select id from public.admins where email = auth.email() and is_active limit 1;
$$;

create or replace function public.staff_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.admins where email = auth.email() and is_active limit 1;
$$;

-- Le responsable d'un pôle n'a accès qu'à la caisse de son pôle.
-- La direction a accès à tout. Les serveurs n'encaissent pas.
create or replace function public.can_access_sector(p_sector text)
returns boolean
language sql
stable
as $$
  select case public.staff_role()
    when 'superadmin' then true
    when 'resto'      then p_sector = 'resto'
    when 'bar'        then p_sector = 'bar'
    when 'reception'  then p_sector = 'hotel'
    else false
  end;
$$;


-- ===========================================================================
-- 7. RLS
-- ===========================================================================
alter table public.cash_sessions  enable row level security;
alter table public.cash_movements enable row level security;

drop policy if exists cash_sessions_read  on public.cash_sessions;
drop policy if exists cash_sessions_write on public.cash_sessions;
drop policy if exists cash_movements_read  on public.cash_movements;
drop policy if exists cash_movements_write on public.cash_movements;

create policy cash_sessions_read on public.cash_sessions
  for select to authenticated
  using (public.can_access_sector(sector));

create policy cash_sessions_write on public.cash_sessions
  for all to authenticated
  using (public.can_access_sector(sector))
  with check (public.can_access_sector(sector));

create policy cash_movements_read on public.cash_movements
  for select to authenticated
  using (exists (
    select 1 from public.cash_sessions s
    where s.id = session_id and public.can_access_sector(s.sector)
  ));

create policy cash_movements_write on public.cash_movements
  for all to authenticated
  using (exists (
    select 1 from public.cash_sessions s
    where s.id = session_id and public.can_access_sector(s.sector)
  ))
  with check (exists (
    select 1 from public.cash_sessions s
    where s.id = session_id and s.closed_at is null and public.can_access_sector(s.sector)
  ));


-- ===========================================================================
-- 8. Ouvrir une session
-- ===========================================================================
create or replace function public.open_cash_session(
  p_sector        text,
  p_opening_float bigint
)
returns public.cash_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session public.cash_sessions;
begin
  if not public.can_access_sector(p_sector) then
    raise exception 'ACCES_REFUSE: vous ne gérez pas la caisse de ce pôle.';
  end if;

  if p_opening_float is null or p_opening_float < 0 then
    raise exception 'FOND_INVALIDE: le fond de caisse doit être positif ou nul.';
  end if;

  if exists (select 1 from public.cash_sessions where sector = p_sector and closed_at is null) then
    raise exception 'SESSION_DEJA_OUVERTE: clôturez la caisse en cours avant d''en ouvrir une nouvelle.';
  end if;

  insert into public.cash_sessions (sector, opening_float, opened_by)
  values (p_sector, p_opening_float, public.staff_id())
  returning * into v_session;

  return v_session;
end $$;


-- ===========================================================================
-- 9. Résumé d'une session  (RPC demandée : get_cash_session_summary)
-- ===========================================================================
-- Le solde théorique = fond de caisse + espèces encaissées - sorties.
-- Un paiement mixte est ventilé : sa part cash compte dans les espèces,
-- sa part momo dans le mobile money.
create or replace function public.get_cash_session_summary(p_session_id uuid)
returns json
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_session   public.cash_sessions;
  v_cash      bigint := 0;
  v_momo      bigint := 0;
  v_orders    integer := 0;
  v_movements bigint := 0;
begin
  select * into v_session from public.cash_sessions where id = p_session_id;
  if v_session.id is null then
    raise exception 'SESSION_INTROUVABLE';
  end if;
  if not public.can_access_sector(v_session.sector) then
    raise exception 'ACCES_REFUSE';
  end if;

  select
    coalesce(sum(o.cash_amount), 0),
    coalesce(sum(o.momo_amount), 0),
    count(*)
  into v_cash, v_momo, v_orders
  from public.orders o
  where o.cash_session_id = p_session_id
    and o.paid_at is not null;

  select coalesce(sum(m.amount), 0)
  into v_movements
  from public.cash_movements m
  where m.session_id = p_session_id;

  return json_build_object(
    'session_id',      v_session.id,
    'sector',          v_session.sector,
    'opening_float',   v_session.opening_float,
    'cash_collected',  v_cash,
    'momo_collected',  v_momo,
    'orders_count',    v_orders,
    'movements_total', v_movements,
    'expected_cash',   v_session.opening_float + v_cash - v_movements,
    'total_collected', v_cash + v_momo,
    'opened_at',       v_session.opened_at,
    'closed_at',       v_session.closed_at,
    'counted_cash',    v_session.counted_cash,
    'difference',      v_session.difference
  );
end $$;


-- ===========================================================================
-- 10. Encaisser une commande  (RPC demandée : process_order_payment)
-- ===========================================================================
create or replace function public.process_order_payment(
  p_order_id uuid,
  p_method   public.payment_method,
  p_cash     bigint default 0,
  p_momo     bigint default 0
)
returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order   public.orders;
  v_sector  text;
  v_session public.cash_sessions;
  v_cash    bigint := coalesce(p_cash, 0);
  v_momo    bigint := coalesce(p_momo, 0);
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if v_order.id is null then
    raise exception 'COMMANDE_INTROUVABLE';
  end if;
  if v_order.status = 'cancelled' then
    raise exception 'COMMANDE_ANNULEE: une commande annulée ne s''encaisse pas.';
  end if;
  if v_order.paid_at is not null then
    raise exception 'DEJA_PAYEE: cette commande a déjà été encaissée.';
  end if;

  v_sector := public.order_sector(v_order.origin_type, v_order.target);

  if not public.can_access_sector(v_sector) then
    raise exception 'ACCES_REFUSE: cette commande relève d''un autre pôle.';
  end if;

  -- Normalisation : pour un paiement simple, tout va sur le bon moyen.
  if p_method = 'cash' then
    v_cash := v_order.total;
    v_momo := 0;
  elsif p_method = 'mobile_money' then
    v_cash := 0;
    v_momo := v_order.total;
  else
    if v_cash < 0 or v_momo < 0 then
      raise exception 'MONTANT_NEGATIF';
    end if;
    -- On stocke la PART espèces due, pas ce que le client a tendu :
    -- la monnaie rendue ne doit pas gonfler la caisse.
    if v_cash + v_momo <> v_order.total then
      raise exception 'SPLIT_INVALIDE: la somme des parts (%) doit être égale au total (%).',
        v_cash + v_momo, v_order.total;
    end if;
  end if;

  select * into v_session
  from public.cash_sessions
  where sector = v_sector and closed_at is null
  limit 1;

  if v_session.id is null then
    raise exception 'CAISSE_FERMEE: ouvrez la caisse du pôle avant d''encaisser.';
  end if;

  update public.orders
  set payment_method  = p_method,
      cash_amount     = v_cash,
      momo_amount     = v_momo,
      paid_at         = now(),
      paid_by         = public.staff_id(),
      cash_session_id = v_session.id
  where id = p_order_id
  returning * into v_order;

  return v_order;
end $$;


-- ===========================================================================
-- 11. Clôturer une session
-- ===========================================================================
create or replace function public.close_cash_session(
  p_session_id   uuid,
  p_counted_cash bigint,
  p_note         text default null
)
returns public.cash_sessions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_session  public.cash_sessions;
  v_summary  json;
  v_expected bigint;
begin
  select * into v_session from public.cash_sessions where id = p_session_id for update;
  if v_session.id is null then
    raise exception 'SESSION_INTROUVABLE';
  end if;
  if not public.can_access_sector(v_session.sector) then
    raise exception 'ACCES_REFUSE';
  end if;
  if v_session.closed_at is not null then
    raise exception 'DEJA_CLOTUREE';
  end if;
  if p_counted_cash is null or p_counted_cash < 0 then
    raise exception 'COMPTAGE_INVALIDE: saisissez le montant réellement compté.';
  end if;

  v_summary := public.get_cash_session_summary(p_session_id);
  v_expected := (v_summary ->> 'expected_cash')::bigint;

  update public.cash_sessions
  set closed_at     = now(),
      closed_by     = public.staff_id(),
      counted_cash  = p_counted_cash,
      expected_cash = v_expected,
      difference    = p_counted_cash - v_expected,
      note          = nullif(trim(coalesce(p_note, '')), '')
  where id = p_session_id
  returning * into v_session;

  return v_session;
end $$;


-- ===========================================================================
-- 12. Droits d'exécution
-- ===========================================================================
revoke all on function public.open_cash_session(text, bigint) from public, anon;
revoke all on function public.close_cash_session(uuid, bigint, text) from public, anon;
revoke all on function public.process_order_payment(uuid, public.payment_method, bigint, bigint) from public, anon;
revoke all on function public.get_cash_session_summary(uuid) from public, anon;

grant execute on function public.open_cash_session(text, bigint) to authenticated;
grant execute on function public.close_cash_session(uuid, bigint, text) to authenticated;
grant execute on function public.process_order_payment(uuid, public.payment_method, bigint, bigint) to authenticated;
grant execute on function public.get_cash_session_summary(uuid) to authenticated;


-- ===========================================================================
-- 13. Contrôle
-- ===========================================================================
select
  (select count(*) from information_schema.columns
    where table_schema = 'public' and table_name = 'orders'
      and column_name in ('payment_method','cash_amount','momo_amount','paid_at','paid_by','cash_session_id')
  ) || ' / 6 colonnes de paiement sur orders' as colonnes,
  (select count(*) from information_schema.tables
    where table_schema = 'public' and table_name in ('cash_sessions','cash_movements')
  ) || ' / 2 tables de caisse' as tables,
  (select count(*) from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.proname in ('process_order_payment','get_cash_session_summary','open_cash_session','close_cash_session')
  ) || ' / 4 fonctions' as fonctions;
