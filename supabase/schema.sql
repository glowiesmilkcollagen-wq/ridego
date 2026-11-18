-- RideGo database (Supabase / Postgres).
-- Run this whole file once in Supabase: Dashboard → SQL Editor → New query → paste → Run.
-- It is safe to re-run: it drops and recreates RideGo's functions and policies (tables are kept).

-- ───────────────────────────── Types ─────────────────────────────
do $$ begin
  create type public.user_role as enum ('customer', 'rider', 'admin');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.rider_status as enum ('pending', 'approved', 'suspended');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.order_kind as enum ('pabili', 'pasugo');
exception when duplicate_object then null; end $$;
do $$ begin
  -- searching → accepted → at_pickup → picked_up → delivered (or cancelled)
  create type public.order_status as enum ('searching', 'accepted', 'at_pickup', 'picked_up', 'delivered', 'cancelled');
exception when duplicate_object then null; end $$;
do $$ begin
  create type public.payment_method as enum ('cash', 'gcash', 'card');
exception when duplicate_object then null; end $$;

-- ───────────────────────────── Tables ─────────────────────────────
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'customer',
  full_name text not null default '',
  phone text not null default '',
  created_at timestamptz not null default now()
);

create table if not exists public.riders (
  id uuid primary key references public.profiles (id) on delete cascade,
  status public.rider_status not null default 'pending',
  vehicle text not null default 'moto' check (vehicle in ('moto', 'car')),
  plate text not null default '',
  license_no text not null default '',
  online boolean not null default false,
  lat double precision,
  lng double precision,
  location_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.stores (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  tagline text not null default '',
  category text not null default 'Food',
  emoji text not null default '🏪',
  tint text not null default '#F7F7F8',
  rating numeric(2, 1) not null default 4.5,
  wait_minutes int not null default 15,
  lat double precision not null,
  lng double precision not null,
  address text not null default '',
  favorites text[] not null default '{}',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

-- One row of prices and commission, edited from the admin dashboard.
create table if not exists public.settings (
  id int primary key default 1 check (id = 1),
  rider_share numeric not null default 0.7 check (rider_share between 0 and 1),
  booking_fee numeric not null default 15 check (booking_fee >= 0),  -- added to every order; goes to the company
  beta_waiver boolean not null default true,                           -- beta: no booking fee and no commission (riders keep 100%)
  pabili_base numeric not null default 49,
  pabili_base_km numeric not null default 2,
  pabili_per_km numeric not null default 10,
  pabili_per_store numeric not null default 20,   -- added for each store the rider buys from
  moto_base numeric not null default 40,
  moto_per_km numeric not null default 10,
  moto_per_min numeric not null default 1,
  moto_min numeric not null default 50,
  car_base numeric not null default 90,
  car_per_km numeric not null default 18,
  car_per_min numeric not null default 2,
  car_min numeric not null default 140,
  updated_at timestamptz not null default now()
);
-- Columns added after the first release (no-ops on a fresh database).
-- Motorcycles only: any rider registered with a car becomes a motorcycle rider.
update public.riders set vehicle = 'moto' where vehicle <> 'moto';
alter table public.settings add column if not exists booking_fee numeric not null default 15 check (booking_fee >= 0);
alter table public.settings add column if not exists beta_waiver boolean not null default true;
alter table public.settings alter column rider_share set default 0.7;
alter table public.settings add column if not exists pabili_per_store numeric not null default 20;
insert into public.settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.promotions (
  id uuid primary key default gen_random_uuid(),
  code text not null unique check (code = upper(code) and length(code) between 3 and 20),
  description text not null default '',
  discount_type text not null default 'percent' check (discount_type in ('percent', 'fixed')),
  value numeric not null check (value > 0),
  max_discount numeric,
  applies_to text not null default 'all' check (applies_to in ('all', 'pabili', 'pasugo')),
  once_per_customer boolean not null default true,
  max_uses int,
  starts_at timestamptz,
  ends_at timestamptz,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  code text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6)),
  kind public.order_kind not null,
  status public.order_status not null default 'searching',
  customer_id uuid not null references public.profiles (id),
  customer_name text not null default '',
  rider_id uuid references public.riders (id),
  pickup_name text not null,
  pickup_lat double precision not null,
  pickup_lng double precision not null,
  dropoff_name text not null,
  dropoff_lat double precision not null,
  dropoff_lng double precision not null,
  km numeric not null,
  path jsonb,
  vehicle text not null default 'moto' check (vehicle in ('moto', 'car')),
  base_fee numeric not null,
  discount numeric not null default 0,
  booking_fee numeric not null default 0,   -- company's fixed fee on this order (0 while the beta waiver is on)
  fee numeric not null,               -- what the customer pays the app: base_fee - discount + booking_fee
  promo_code text,
  rider_share numeric not null,       -- share of base_fee at the time of the order, e.g. 0.7 (1 during the beta waiver)
  rider_earning numeric not null,     -- rider's money for this order (from base_fee; promos are paid by the company)
  commission_waived boolean not null default false,  -- placed while the beta waiver was on
  payment public.payment_method not null default 'cash',
  -- pabili
  items jsonb,
  note text,
  budget numeric,
  receipt_amount numeric,
  store_id uuid references public.stores (id),   -- first store (kept for older apps; see stops)
  -- Pabili with several stores: [{name, lat, lng, store_id, items: [{id, name, qty}]}], visited in order.
  -- pickup_* is the first store; items is every store's items together.
  stops jsonb,
  store_count int not null default 1,
  -- pasugo
  cargo text check (cargo in ('document', 'parcel', 'person')),
  description text,
  sender jsonb,
  receiver jsonb,
  rating int check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  accepted_at timestamptz,
  at_pickup_at timestamptz,
  picked_up_at timestamptz,
  delivered_at timestamptz,
  cancelled_at timestamptz,
  cancelled_by text
);
alter table public.orders add column if not exists booking_fee numeric not null default 0;
alter table public.orders add column if not exists commission_waived boolean not null default false;
alter table public.orders add column if not exists stops jsonb;
alter table public.orders add column if not exists store_count int not null default 1;
create index if not exists orders_customer_idx on public.orders (customer_id, created_at desc);
create index if not exists orders_rider_idx on public.orders (rider_id, created_at desc);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_store_idx on public.orders (store_id);
-- Riders' open-job list: only the few orders still waiting for a rider.
create index if not exists orders_searching_idx on public.orders (created_at) where status = 'searching';

-- Cash a rider handed to the company (remittance), or money the company paid a rider (payout).
create table if not exists public.rider_transactions (
  id uuid primary key default gen_random_uuid(),
  rider_id uuid not null references public.riders (id) on delete cascade,
  type text not null check (type in ('remittance', 'payout')),
  amount numeric not null check (amount > 0),
  note text not null default '',
  created_by uuid references public.profiles (id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists rider_transactions_rider_idx on public.rider_transactions (rider_id, created_at desc);
create index if not exists rider_transactions_created_by_idx on public.rider_transactions (created_by);

-- ───────────────────────────── Helpers ─────────────────────────────
-- Internal helpers live in the `private` schema, which the Data API does not expose: the security rules can use
-- them, but apps cannot call them directly.
create schema if not exists private;
grant usage on schema private to authenticated;

create or replace function private.is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function private.my_rider() returns public.riders
language sql stable security definer set search_path = public as $$
  select * from public.riders where id = auth.uid();
$$;

create or replace function public.km_between(lat1 double precision, lng1 double precision, lat2 double precision, lng2 double precision)
returns numeric language sql immutable set search_path = '' as $$
  select (2 * 6371 * asin(sqrt(
    power(sin(radians(lat2 - lat1) / 2), 2) +
    cos(radians(lat1)) * cos(radians(lat2)) * power(sin(radians(lng2 - lng1) / 2), 2)
  )))::numeric;
$$;

-- Same formulas as src/lib/pricing.ts, with prices from the settings row.
-- (The earlier 3-argument version is dropped so calls are not ambiguous.)
drop function if exists public.compute_fee(public.order_kind, numeric, text);
create or replace function public.compute_fee(p_kind public.order_kind, p_km numeric, p_vehicle text default 'moto', p_stores int default 1)
returns numeric language plpgsql stable security definer set search_path = public as $$
declare
  s public.settings;
  eta numeric;
begin
  select * into s from public.settings where id = 1;
  if p_kind = 'pabili' then
    return round(s.pabili_base + greatest(0, p_km - s.pabili_base_km) * s.pabili_per_km + s.pabili_per_store * greatest(1, p_stores));
  end if;
  eta := greatest(3, round(p_km / (case when p_vehicle = 'car' then 16 else 24 end) * 60));
  if p_vehicle = 'car' then
    return round(greatest(s.car_min, s.car_base + s.car_per_km * p_km + s.car_per_min * eta));
  end if;
  return round(greatest(s.moto_min, s.moto_base + s.moto_per_km * p_km + s.moto_per_min * eta));
end $$;

-- Discount for a promo code, or an error explaining why it can't be used.
create or replace function public.promo_discount(p_code text, p_kind public.order_kind, p_base_fee numeric)
returns table (discount numeric, description text)
language plpgsql stable security definer set search_path = public as $$
declare
  p public.promotions;
  d numeric;
begin
  select * into p from public.promotions where code = upper(trim(p_code));
  if not found or not p.active then raise exception 'Promo code not found'; end if;
  if p.starts_at is not null and now() < p.starts_at then raise exception 'This promo has not started yet'; end if;
  if p.ends_at is not null and now() > p.ends_at then raise exception 'This promo has ended'; end if;
  if p.applies_to <> 'all' and p.applies_to <> p_kind::text then raise exception 'This promo is only for %', p.applies_to; end if;
  if p.max_uses is not null and (select count(*) from public.orders o where o.promo_code = p.code and o.status <> 'cancelled') >= p.max_uses then
    raise exception 'This promo has been fully used';
  end if;
  if p.once_per_customer and exists (
    select 1 from public.orders o where o.promo_code = p.code and o.customer_id = auth.uid() and o.status <> 'cancelled'
  ) then raise exception 'You have already used this promo'; end if;
  d := case when p.discount_type = 'percent' then round(p_base_fee * p.value / 100) else p.value end;
  if p.max_discount is not null then d := least(d, p.max_discount); end if;
  return query select least(d, p_base_fee), p.description;
end $$;

-- ───────────────────────────── New users ─────────────────────────────
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'full_name', ''), coalesce(new.raw_user_meta_data ->> 'phone', ''))
  on conflict (id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

-- Only admins (or RideGo's own functions) may change someone's role.
create or replace function public.protect_role() returns trigger
language plpgsql set search_path = public as $$
begin
  if new.role is distinct from old.role and current_user in ('authenticated', 'anon') and not private.is_admin() then
    raise exception 'You cannot change your role';
  end if;
  return new;
end $$;
drop trigger if exists protect_role on public.profiles;
create trigger protect_role before update on public.profiles for each row execute function public.protect_role();

-- ───────────────────────────── Customer actions ─────────────────────────────
create or replace function public.place_order(p jsonb) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  me public.profiles;
  k public.order_kind := (p ->> 'kind')::public.order_kind;
  veh text := coalesce(p ->> 'vehicle', 'moto');
  plat double precision := (p -> 'pickup' ->> 'lat')::double precision;
  plng double precision := (p -> 'pickup' ->> 'lng')::double precision;
  dlat double precision := (p -> 'dropoff' ->> 'lat')::double precision;
  dlng double precision := (p -> 'dropoff' ->> 'lng')::double precision;
  straight numeric;
  dist numeric := (p ->> 'km')::numeric;
  base numeric;
  disc numeric := 0;
  promo text := nullif(upper(trim(coalesce(p ->> 'promo_code', ''))), '');
  s public.settings;
  share numeric;
  booking numeric;
  stops jsonb := case when p ->> 'kind' = 'pabili' and jsonb_typeof(p -> 'stops') = 'array' then p -> 'stops' end;
  stop jsonb;
  all_items jsonb := '[]'::jsonb;
  prev_lat double precision;
  prev_lng double precision;
  n_stores int := 1;
  o public.orders;
begin
  select * into me from public.profiles where id = auth.uid();
  if not found then raise exception 'Please log in first'; end if;
  -- Passenger rides need LTFRB permits: pasugo carries documents and parcels only.
  if k = 'pasugo' and coalesce(p ->> 'cargo', 'parcel') not in ('document', 'parcel') then
    raise exception 'Pasugo carries documents and parcels only';
  end if;
  if stops is not null then
    -- Pabili from several stores: the first store is the pickup; check each store has a place and a list.
    n_stores := jsonb_array_length(stops);
    if n_stores < 1 then raise exception 'Add at least one store'; end if;
    if n_stores > 5 then raise exception 'A pabili order can include at most 5 stores'; end if;
    for stop in select * from jsonb_array_elements(stops) loop
      if (stop ->> 'lat') is null or (stop ->> 'lng') is null or coalesce(trim(stop ->> 'name'), '') = '' then raise exception 'Each store needs a name and location'; end if;
      if jsonb_array_length(coalesce(stop -> 'items', '[]'::jsonb)) = 0 then raise exception 'Add at least one item for %', stop ->> 'name'; end if;
      all_items := all_items || (stop -> 'items');
    end loop;
    plat := (stops -> 0 ->> 'lat')::double precision;
    plng := (stops -> 0 ->> 'lng')::double precision;
    p := jsonb_set(jsonb_set(p, '{pickup}', jsonb_build_object('name', stops -> 0 ->> 'name')), '{items}', all_items);
    if (stops -> 0 ->> 'store_id') is not null then p := jsonb_set(p, '{store_id}', stops -> 0 -> 'store_id'); end if;
  end if;
  if plat is null or plng is null or dlat is null or dlng is null then raise exception 'Pickup and drop-off are required'; end if;
  if k = 'pabili' and jsonb_array_length(coalesce(p -> 'items', '[]'::jsonb)) = 0 then raise exception 'Add at least one item to buy'; end if;
  if k = 'pasugo' and coalesce(trim(p ->> 'description'), '') = '' then raise exception 'Describe what the rider will pick up'; end if;
  -- RideGo uses motorcycles only (the vehicle column stays for older orders).
  veh := 'moto';

  -- The road distance comes from the app's routing; keep it within sane bounds of the straight-line distance.
  if stops is not null then
    -- Straight-line length of store 1 → store 2 → … → customer.
    straight := 0;
    prev_lat := plat; prev_lng := plng;
    for stop in select * from jsonb_array_elements(stops) loop
      straight := straight + public.km_between(prev_lat, prev_lng, (stop ->> 'lat')::double precision, (stop ->> 'lng')::double precision);
      prev_lat := (stop ->> 'lat')::double precision; prev_lng := (stop ->> 'lng')::double precision;
    end loop;
    straight := straight + public.km_between(prev_lat, prev_lng, dlat, dlng);
  else
    straight := public.km_between(plat, plng, dlat, dlng);
  end if;
  if dist is null or dist < straight then dist := straight * 1.3; end if;
  dist := round(least(dist, straight * 4 + 2), 2);
  -- A pasugo needs real distance; a pabili store can be right next to the customer (e.g. a sari-sari store next door).
  if dist < 0.3 then
    if k = 'pasugo' then raise exception 'Pickup and drop-off are too close'; end if;
    dist := 0.3;
  end if;

  base := public.compute_fee(k, dist, veh, n_stores);
  if promo is not null then
    select pd.discount into disc from public.promo_discount(promo, k, base) pd;
  end if;
  select * into s from public.settings where id = 1;
  -- Beta waiver: no booking fee and no commission, so the rider keeps the whole delivery/pasugo fee.
  share := case when s.beta_waiver then 1 else s.rider_share end;
  booking := case when s.beta_waiver then 0 else s.booking_fee end;

  insert into public.orders (
    kind, customer_id, customer_name, pickup_name, pickup_lat, pickup_lng, dropoff_name, dropoff_lat, dropoff_lng,
    km, path, vehicle, base_fee, discount, booking_fee, fee, promo_code, rider_share, rider_earning, commission_waived, payment,
    items, note, budget, store_id, stops, store_count, cargo, description, sender, receiver
  ) values (
    k, me.id, split_part(me.full_name, ' ', 1), p -> 'pickup' ->> 'name', plat, plng, p -> 'dropoff' ->> 'name', dlat, dlng,
    dist, p -> 'path', veh, base, disc, booking, base - disc + booking, promo, share, round(base * share), s.beta_waiver,
    coalesce((p ->> 'payment')::public.payment_method, 'cash'),
    p -> 'items', p ->> 'note', (p ->> 'budget')::numeric, (p ->> 'store_id')::uuid, stops, n_stores, p ->> 'cargo', p ->> 'description', p -> 'sender', p -> 'receiver'
  ) returning * into o;
  return o;
end $$;

create or replace function public.cancel_order(p_id uuid) returns public.orders
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_id for update;
  if not found then raise exception 'Order not found'; end if;
  if private.is_admin() then
    if o.status in ('delivered', 'cancelled') then raise exception 'This order is already finished'; end if;
  elsif o.customer_id = auth.uid() then
    if o.status not in ('searching', 'accepted') then raise exception 'The rider has already started — this order can no longer be cancelled'; end if;
  else
    raise exception 'Not your order';
  end if;
  update public.orders set status = 'cancelled', cancelled_at = now(), cancelled_by = case when private.is_admin() then 'admin' else 'customer' end
  where id = p_id returning * into o;
  return o;
end $$;

create or replace function public.rate_order(p_id uuid, p_rating int) returns public.orders
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  update public.orders set rating = p_rating
  where id = p_id and customer_id = auth.uid() and status = 'delivered' returning * into o;
  if not found then raise exception 'You can rate only your delivered orders'; end if;
  return o;
end $$;

-- ───────────────────────────── Rider actions ─────────────────────────────
create or replace function public.rider_register(p_full_name text, p_phone text, p_vehicle text, p_plate text, p_license_no text)
returns public.riders language plpgsql security definer set search_path = public as $$
declare r public.riders;
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  if coalesce(trim(p_plate), '') = '' or coalesce(trim(p_license_no), '') = '' then raise exception 'Plate and license number are required'; end if;
  update public.profiles set full_name = trim(p_full_name), phone = trim(p_phone),
    role = case when role = 'admin' then role else 'rider' end where id = auth.uid();
  -- Motorcycle riders only; p_vehicle is kept so older apps can still call this.
  insert into public.riders (id, vehicle, plate, license_no) values (auth.uid(), 'moto', upper(trim(p_plate)), upper(trim(p_license_no)))
  on conflict (id) do update set vehicle = excluded.vehicle, plate = excluded.plate, license_no = excluded.license_no
  returning * into r;
  return r;
end $$;

create or replace function public.rider_set_online(p_online boolean) returns public.riders
language plpgsql security definer set search_path = public as $$
declare r public.riders;
begin
  select * into r from public.riders where id = auth.uid();
  if not found then raise exception 'Register as a rider first'; end if;
  if p_online and r.status <> 'approved' then raise exception 'Your rider account is %', r.status; end if;
  if not p_online and exists (select 1 from public.orders where rider_id = auth.uid() and status in ('accepted', 'at_pickup', 'picked_up')) then
    raise exception 'Finish your current job first';
  end if;
  update public.riders set online = p_online where id = auth.uid() returning * into r;
  return r;
end $$;

create or replace function public.rider_update_location(p_lat double precision, p_lng double precision) returns void
language sql security definer set search_path = public as $$
  update public.riders set lat = p_lat, lng = p_lng, location_at = now() where id = auth.uid();
$$;

create or replace function public.accept_order(p_id uuid) returns public.orders
language plpgsql security definer set search_path = public as $$
declare
  r public.riders := private.my_rider();
  o public.orders;
begin
  if r.id is null or r.status <> 'approved' then raise exception 'Your rider account is not approved yet'; end if;
  if not r.online then raise exception 'Go online to accept jobs'; end if;
  if exists (select 1 from public.orders where rider_id = r.id and status in ('accepted', 'at_pickup', 'picked_up')) then
    raise exception 'Finish your current job first';
  end if;
  update public.orders set rider_id = r.id, status = 'accepted', accepted_at = now()
  where id = p_id and status = 'searching' and (vehicle = r.vehicle or kind = 'pabili')
  returning * into o;
  if not found then raise exception 'This job was already taken or cancelled'; end if;
  return o;
end $$;

-- Rider steps: accepted → at_pickup → picked_up (pabili: with the receipt total) → delivered.
create or replace function public.advance_order(p_id uuid, p_receipt numeric default null) returns public.orders
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  select * into o from public.orders where id = p_id for update;
  if not found or o.rider_id is distinct from auth.uid() then raise exception 'This is not your job'; end if;
  if o.status = 'accepted' then
    update public.orders set status = 'at_pickup', at_pickup_at = now() where id = p_id returning * into o;
  elsif o.status = 'at_pickup' then
    if o.kind = 'pabili' and coalesce(p_receipt, 0) <= 0 then raise exception 'Enter the receipt total'; end if;
    update public.orders set status = 'picked_up', picked_up_at = now(),
      receipt_amount = case when o.kind = 'pabili' then p_receipt end where id = p_id returning * into o;
  elsif o.status = 'picked_up' then
    update public.orders set status = 'delivered', delivered_at = now() where id = p_id returning * into o;
  else
    raise exception 'This job is already finished';
  end if;
  return o;
end $$;

-- A rider can hand back a job they accepted but have not started.
create or replace function public.release_order(p_id uuid) returns public.orders
language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  update public.orders set status = 'searching', rider_id = null, accepted_at = null
  where id = p_id and rider_id = auth.uid() and status = 'accepted' returning * into o;
  if not found then raise exception 'You can only drop a job before arriving at the pickup'; end if;
  return o;
end $$;

-- Money between a rider and the company. Positive: the rider owes the company; negative: the company owes the rider.
create or replace function public.rider_balance(p_rider uuid) returns numeric
language sql stable security definer set search_path = public as $$
  select coalesce((select sum(case when payment = 'cash' then fee - rider_earning else -rider_earning end)
                   from public.orders where rider_id = p_rider and status = 'delivered'), 0)
       - coalesce((select sum(amount) from public.rider_transactions where rider_id = p_rider and type = 'remittance'), 0)
       + coalesce((select sum(amount) from public.rider_transactions where rider_id = p_rider and type = 'payout'), 0)
  where p_rider = auth.uid() or private.is_admin();
$$;

-- ───────────────────────────── Row-level security ─────────────────────────────
alter table public.profiles enable row level security;
alter table public.riders enable row level security;
alter table public.stores enable row level security;
alter table public.settings enable row level security;
alter table public.promotions enable row level security;
alter table public.orders enable row level security;
alter table public.rider_transactions enable row level security;

do $$ declare pol record; begin
  for pol in select policyname, tablename from pg_policies where schemaname = 'public'
    and tablename in ('profiles', 'riders', 'stores', 'settings', 'promotions', 'orders', 'rider_transactions')
  loop execute format('drop policy %I on public.%I', pol.policyname, pol.tablename); end loop;
end $$;

-- One policy per table and action (Postgres checks every permissive policy, so overlapping ones cost time), and
-- auth.uid() / is_admin() wrapped in (select …) so they are evaluated once per query, not once per row.

-- Profiles: yourself, the other person on an order you share (customer ↔ rider), and admins.
create policy profiles_select on public.profiles for select to authenticated using (
  id = (select auth.uid())
  or (select private.is_admin())
  or exists (select 1 from public.orders o
             where (o.customer_id = (select auth.uid()) and o.rider_id = profiles.id)
                or (o.rider_id = (select auth.uid()) and o.customer_id = profiles.id))
);
create policy profiles_update on public.profiles for update to authenticated
  using (id = (select auth.uid()) or (select private.is_admin()))
  with check (id = (select auth.uid()) or (select private.is_admin()));
create policy profiles_insert on public.profiles for insert to authenticated with check ((select private.is_admin()));
create policy profiles_delete on public.profiles for delete to authenticated using ((select private.is_admin()));

-- Riders: yourself, customers see the rider (vehicle, plate, live location) on their open orders, and admins.
create policy riders_select on public.riders for select to authenticated using (
  id = (select auth.uid())
  or (select private.is_admin())
  or exists (select 1 from public.orders o where o.rider_id = riders.id and o.customer_id = (select auth.uid())
             and o.status in ('accepted', 'at_pickup', 'picked_up'))
);
create policy riders_insert on public.riders for insert to authenticated with check ((select private.is_admin()));
create policy riders_update on public.riders for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy riders_delete on public.riders for delete to authenticated using ((select private.is_admin()));

-- Stores and prices: everyone signed in reads (active stores only, unless admin); admins write.
create policy stores_select on public.stores for select to authenticated using (active or (select private.is_admin()));
create policy stores_insert on public.stores for insert to authenticated with check ((select private.is_admin()));
create policy stores_update on public.stores for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy stores_delete on public.stores for delete to authenticated using ((select private.is_admin()));
create policy settings_select on public.settings for select to authenticated using (true);
create policy settings_insert on public.settings for insert to authenticated with check ((select private.is_admin()));
create policy settings_update on public.settings for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy settings_delete on public.settings for delete to authenticated using ((select private.is_admin()));

-- Promotions: admins only (customers check codes through promo_discount()).
create policy promotions_admin on public.promotions for all to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));

-- Orders: customers see theirs; riders see theirs, and open jobs while approved and online; admins see all.
-- Customers and riders change orders only through the functions above.
create policy orders_select on public.orders for select to authenticated using (
  customer_id = (select auth.uid())
  or rider_id = (select auth.uid())
  or (select private.is_admin())
  or (status = 'searching' and exists (
        select 1 from private.my_rider() r where r.status = 'approved' and r.online and (r.vehicle = orders.vehicle or orders.kind = 'pabili')))
);
create policy orders_insert on public.orders for insert to authenticated with check ((select private.is_admin()));
create policy orders_update on public.orders for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy orders_delete on public.orders for delete to authenticated using ((select private.is_admin()));

-- Rider cash records: the rider reads their own; admins read and write.
create policy rider_transactions_select on public.rider_transactions for select to authenticated
  using (rider_id = (select auth.uid()) or (select private.is_admin()));
create policy rider_transactions_insert on public.rider_transactions for insert to authenticated with check ((select private.is_admin()));
create policy rider_transactions_update on public.rider_transactions for update to authenticated using ((select private.is_admin())) with check ((select private.is_admin()));
create policy rider_transactions_delete on public.rider_transactions for delete to authenticated using ((select private.is_admin()));

-- ───────────────────────────── Permissions ─────────────────────────────
-- Writes from the apps go through the functions above; only admins write tables directly (checked by RLS).
revoke all on all tables in schema public from anon;
revoke all on all functions in schema public from anon, public;
grant select, insert, update, delete on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
revoke all on all functions in schema private from anon, public;
grant execute on all functions in schema private to authenticated;
-- Used only inside the database (triggers, and fee calculation inside place_order), never called by apps.
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.protect_role() from authenticated;
revoke execute on function public.compute_fee(public.order_kind, numeric, text, int) from authenticated;
-- Earlier versions kept these helpers in public; remove them (the policies above now use private.*).
drop function if exists public.is_admin();
drop function if exists public.my_rider();

-- Live updates for tracking and new jobs.
do $$ begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin alter publication supabase_realtime add table public.orders; exception when duplicate_object then null; end;
    begin alter publication supabase_realtime add table public.riders; exception when duplicate_object then null; end;
  end if;
end $$;

-- ============================================================================
-- Route cache (used only by the `route` Edge Function with the secret key).
-- RLS on with no policies: the apps can't read or write it directly.
-- ============================================================================
create table if not exists public.route_cache (
  key text primary key,
  km double precision not null,
  path jsonb,
  source text not null,
  created_at timestamptz not null default now()
);
alter table public.route_cache enable row level security;
revoke all on public.route_cache from anon, authenticated;
create index if not exists route_cache_created_idx on public.route_cache (created_at);

-- ============================================================================
-- Account deletion (required by the App Store and Google Play).
-- The login and profile are deleted. Orders and money records stay for accounting,
-- but lose the link to the person and their names, phone numbers and exact addresses.
-- ============================================================================
alter table public.orders alter column customer_id drop not null;
alter table public.orders drop constraint if exists orders_customer_id_fkey;
alter table public.orders add constraint orders_customer_id_fkey foreign key (customer_id) references public.profiles (id) on delete set null;
alter table public.orders drop constraint if exists orders_rider_id_fkey;
alter table public.orders add constraint orders_rider_id_fkey foreign key (rider_id) references public.riders (id) on delete set null;
alter table public.rider_transactions alter column rider_id drop not null;
alter table public.rider_transactions drop constraint if exists rider_transactions_rider_id_fkey;
alter table public.rider_transactions add constraint rider_transactions_rider_id_fkey foreign key (rider_id) references public.riders (id) on delete set null;
alter table public.rider_transactions drop constraint if exists rider_transactions_created_by_fkey;
alter table public.rider_transactions add constraint rider_transactions_created_by_fkey foreign key (created_by) references public.profiles (id) on delete set null;

create or replace function public.delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  me public.profiles;
  bal numeric;
begin
  select * into me from public.profiles where id = uid;
  if not found then raise exception 'Please log in first'; end if;
  if me.role = 'admin' then raise exception 'Admin accounts can''t be deleted from the app. Remove the admin role first.'; end if;
  if exists (select 1 from public.orders where (customer_id = uid or rider_id = uid) and status in ('searching', 'accepted', 'at_pickup', 'picked_up')) then
    raise exception 'Finish or cancel your current order first';
  end if;
  if exists (select 1 from public.riders where id = uid) then
    bal := public.rider_balance(uid);
    if abs(coalesce(bal, 0)) >= 1 then
      raise exception 'Settle your cash balance with RideGo first (₱%). Contact ridegopabiliapp@gmail.com.', round(abs(bal));
    end if;
  end if;

  -- Keep the order for accounting; remove what identifies the customer.
  update public.orders set
    customer_name = 'Deleted user', dropoff_name = 'Removed', note = null, sender = null, receiver = null, path = null,
    dropoff_lat = round(dropoff_lat::numeric, 2), dropoff_lng = round(dropoff_lng::numeric, 2)
  where customer_id = uid;

  delete from auth.users where id = uid;  -- removes the profile and rider record too
end $$;
revoke execute on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;

-- ============================================================================
-- Push notifications (Expo push service). The apps register their device token;
-- triggers on orders and riders send the alerts through pg_net (asynchronous web requests).
-- ============================================================================
do $$ begin
  if exists (select 1 from pg_available_extensions where name = 'pg_net') then
    create extension if not exists pg_net with schema extensions;
  end if;
end $$;

create table if not exists public.push_tokens (
  token text primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  app text not null check (app in ('customer', 'rider')),
  updated_at timestamptz not null default now()
);
create index if not exists push_tokens_user_idx on public.push_tokens (user_id, app);
alter table public.push_tokens enable row level security;  -- no policies: only the functions below touch it
revoke all on public.push_tokens from anon, authenticated;

create or replace function public.register_push_token(p_token text, p_app text) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please log in first'; end if;
  if p_token !~ '^Expo(nent)?PushToken\[[A-Za-z0-9_-]+\]$' then raise exception 'Invalid push token'; end if;
  if p_app not in ('customer', 'rider') then raise exception 'Invalid app'; end if;
  insert into public.push_tokens (token, user_id, app) values (p_token, auth.uid(), p_app)
  on conflict (token) do update set user_id = excluded.user_id, app = excluded.app, updated_at = now();
end $$;

create or replace function public.unregister_push_token(p_token text) returns void
language sql security definer set search_path = public as $$
  delete from public.push_tokens where token = p_token and user_id = auth.uid();
$$;
revoke execute on function public.register_push_token(text, text), public.unregister_push_token(text) from public, anon;
grant execute on function public.register_push_token(text, text), public.unregister_push_token(text) to authenticated;

-- Sends messages to Expo in batches of 100. Never raises: a push problem must not block an order.
create or replace function private.send_push(messages jsonb) returns void
language plpgsql security definer set search_path = public as $$
declare i int := 0; n int := coalesce(jsonb_array_length(messages), 0);
begin
  while i < n loop
    perform net.http_post(
      url := 'https://exp.host/--/api/v2/push/send',
      body := (select jsonb_agg(m) from (select m from jsonb_array_elements(messages) with ordinality t(m, k) where k > i and k <= i + 100) s),
      headers := '{"Content-Type": "application/json", "Accept": "application/json"}'::jsonb
    );
    i := i + 100;
  end loop;
exception when others then
  raise warning 'push not sent: %', sqlerrm;
end $$;

-- One message per device of a user in one app.
create or replace function private.push_to(p_user uuid, p_app text, p_title text, p_body text, p_data jsonb, p_channel text default 'orders')
returns jsonb language sql stable security definer set search_path = public as $$
  select coalesce(jsonb_agg(jsonb_build_object('to', token, 'title', p_title, 'body', p_body, 'data', p_data,
    'sound', 'default', 'priority', 'high', 'channelId', p_channel)), '[]'::jsonb)
  from public.push_tokens where user_id = p_user and app = p_app;
$$;

create or replace function private.orders_push() returns trigger
language plpgsql security definer set search_path = public as $$
declare
  msgs jsonb := '[]'::jsonb;
  d jsonb := jsonb_build_object('orderId', new.id, 'status', new.status);
  rider_name text;
  what text := case when new.kind = 'pabili' then 'pabili' else 'pasugo' end;
begin
  if tg_op = 'INSERT' then
    if new.status = 'searching' then
      -- New job: approved riders who are online, near the pickup (or whose location we don't know yet).
      select coalesce(jsonb_agg(jsonb_build_object('to', t.token,
          'title', format('New %s job · ₱%s', what, round(new.rider_earning)),
          'body', format('%s → %s · %s km', new.pickup_name, new.dropoff_name, round(new.km, 1)),
          'data', d || '{"type":"job"}', 'sound', 'default', 'priority', 'high', 'channelId', 'jobs')), '[]'::jsonb)
        into msgs
      from public.riders r join public.push_tokens t on t.user_id = r.id and t.app = 'rider'
      where r.status = 'approved' and r.online
        and (r.lat is null or public.km_between(r.lat, r.lng, new.pickup_lat, new.pickup_lng) <= 15);
    end if;
  elsif new.status is distinct from old.status then
    select split_part(full_name, ' ', 1) into rider_name from public.profiles where id = new.rider_id;
    rider_name := coalesce(nullif(rider_name, ''), 'Your rider');
    msgs := case new.status
      when 'accepted' then private.push_to(new.customer_id, 'customer', 'Rider found 🛵', format('%s is heading to %s.', rider_name, new.pickup_name), d)
      when 'at_pickup' then private.push_to(new.customer_id, 'customer', format('%s is at %s', rider_name, new.pickup_name),
        case when new.kind = 'pabili' then 'Buying your items now. Keep your phone handy.' else 'Collecting the item now.' end, d)
      when 'picked_up' then private.push_to(new.customer_id, 'customer', 'On the way to you',
        case when new.kind = 'pabili' then 'Prepare the cash for the items (receipt) and the delivery fee.' else 'Heading to the drop-off point.' end, d)
      when 'delivered' then private.push_to(new.customer_id, 'customer', 'Delivered ✅', 'Thanks for using RideGo! Tap to rate your rider.', d)
      when 'searching' then private.push_to(new.customer_id, 'customer', 'Finding another rider', 'Your rider couldn''t take this order. We''re matching you with another rider.', d)
      else '[]'::jsonb
    end;
    if new.status = 'cancelled' then
      if new.cancelled_by = 'admin' then
        msgs := msgs || private.push_to(new.customer_id, 'customer', 'Order cancelled', 'RideGo support cancelled your order. No charge was made.', d);
      end if;
      if old.rider_id is not null then
        msgs := msgs || private.push_to(old.rider_id, 'rider', 'Job cancelled',
          format('Order %s was cancelled by the %s. You can stop this job.', new.code, case when new.cancelled_by = 'admin' then 'RideGo team' else 'customer' end), d);
      end if;
    end if;
  end if;
  perform private.send_push(msgs);
  return new;
exception when others then
  raise warning 'orders_push failed: %', sqlerrm;
  return new;
end $$;
drop trigger if exists orders_push on public.orders;
create trigger orders_push after insert or update of status on public.orders
  for each row execute function private.orders_push();

create or replace function private.riders_push() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status then
    perform private.send_push(case new.status
      when 'approved' then private.push_to(new.id, 'rider', 'You''re approved! 🎉', 'Go online in RideGo Rider to start receiving jobs.', '{"type":"approved"}')
      when 'suspended' then private.push_to(new.id, 'rider', 'Account suspended', 'Your rider account was suspended. Contact ridegopabiliapp@gmail.com.', '{"type":"suspended"}')
      else '[]'::jsonb end);
  end if;
  return new;
exception when others then
  raise warning 'riders_push failed: %', sqlerrm;
  return new;
end $$;
drop trigger if exists riders_push on public.riders;
create trigger riders_push after update of status on public.riders
  for each row execute function private.riders_push();
revoke execute on function private.send_push(jsonb), private.push_to(uuid, text, text, text, jsonb, text) from public, anon, authenticated;
