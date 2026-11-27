-- Awelen Community: Phase 5 setup (admin portal and promo offers).
-- Run AFTER the Phase 2, Phase 3, courses_usd and Phase 4 scripts.
-- Paste this whole file into Supabase > SQL Editor and press Run. Safe to run again.
-- Supabase may warn about "destructive operations": that is only the "drop ... if exists" lines that
-- refresh functions, triggers and security rules. No table or data is deleted.

-- ---------------------------------------------------------------------------
-- 1. Event places always match the bookings, whoever changes them (a member, or the team in the portal)
-- ---------------------------------------------------------------------------
create or replace function public.events_recount() returns trigger
language plpgsql security definer set search_path = public as $$
declare v_event text := coalesce(new.event_id, old.event_id);
begin
  update public.events set taken = (select count(*) from public.event_bookings b where b.event_id = v_event and b.status <> 'cancelled')
  where id = v_event;
  if tg_op = 'UPDATE' and old.event_id <> new.event_id then
    update public.events set taken = (select count(*) from public.event_bookings b where b.event_id = old.event_id and b.status <> 'cancelled') where id = old.event_id;
  end if;
  return null;
end $$;
drop trigger if exists event_bookings_recount on public.event_bookings;
create trigger event_bookings_recount after insert or update or delete on public.event_bookings for each row execute function public.events_recount();

create or replace function public.book_event(p_event text)
returns text language plpgsql security definer set search_path = public as $$
declare ev public.events; v_status text; v_now text;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  select * into ev from public.events where id = p_event for update;
  if not found then raise exception 'This event no longer exists'; end if;
  if ev.starts_at < now() then raise exception 'This event has already taken place'; end if;
  select status into v_now from public.event_bookings where event_id = p_event and user_id = auth.uid();
  if v_now is not null and v_now <> 'cancelled' then return v_now; end if;
  if ev.taken >= ev.seats then raise exception 'Sorry, this event is fully booked'; end if;
  v_status := case when ev.price > 0 then 'awaiting payment' else 'booked' end;
  insert into public.event_bookings (event_id, user_id, status) values (p_event, auth.uid(), v_status)
  on conflict (event_id, user_id) do update set status = excluded.status, created_at = now();
  return v_status;
end $$;
revoke all on function public.book_event(text) from public, anon;
grant execute on function public.book_event(text) to authenticated;

create or replace function public.cancel_event_booking(p_event text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  update public.event_bookings set status = 'cancelled' where event_id = p_event and user_id = auth.uid() and status <> 'cancelled';
end $$;
revoke all on function public.cancel_event_booking(text) from public, anon;
grant execute on function public.cancel_event_booking(text) to authenticated;

-- Bring every event's count up to date once
update public.events e set taken = (select count(*) from public.event_bookings b where b.event_id = e.id and b.status <> 'cancelled');

-- ---------------------------------------------------------------------------
-- 2. Promo offers
--    A promo CODE gives a discount to anyone who types it at checkout.
--    An AUTOMATIC offer (e.g. a launch price) applies to everyone while it is live.
--    kind: 'percent' (value = % off) or 'amount' (value = money off, in the course currency)
--    scope: 'all' (pay once and installments) or 'full' (pay once only)
--    courses: empty = every paid course
-- ---------------------------------------------------------------------------
create table if not exists public.promos (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  code text unique check (code is null or code ~ '^[A-Z0-9_-]{3,30}$'),
  auto boolean not null default false,
  kind text not null default 'percent' check (kind in ('percent','amount')),
  value numeric(12,2) not null check (value > 0),
  scope text not null default 'all' check (scope in ('all','full')),
  courses text[] not null default '{}',
  starts_at timestamptz,
  ends_at timestamptz,
  max_uses integer check (max_uses is null or max_uses > 0),
  uses integer not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  check (auto or code is not null),
  check (kind <> 'percent' or value <= 100)
);
alter table public.promos enable row level security;
drop policy if exists "admins manage promos" on public.promos;
create policy "admins manage promos" on public.promos for all to authenticated
  using (public.is_app_admin('admin')) with check (public.is_app_admin('admin'));

create or replace function public.promo_live(p public.promos, p_course text)
returns boolean language sql stable as $$
  select p.active and (p.starts_at is null or p.starts_at <= now()) and (p.ends_at is null or p.ends_at > now())
     and (p.max_uses is null or p.uses < p.max_uses)
     and (cardinality(p.courses) = 0 or p_course = any(p.courses));
$$;

-- Automatic offers that are live now (codes stay secret). The website shows these as "was / now" prices.
create or replace function public.live_offers()
returns table (id uuid, name text, kind text, value numeric, scope text, courses text[], ends_at timestamptz)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.kind, p.value, p.scope, p.courses, p.ends_at from public.promos p
  where p.auto and p.active and (p.starts_at is null or p.starts_at <= now()) and (p.ends_at is null or p.ends_at > now())
    and (p.max_uses is null or p.uses < p.max_uses);
$$;
grant execute on function public.live_offers() to anon, authenticated;

-- Checks a typed code for one course. Answers why it can't be used, or what it gives.
create or replace function public.check_promo(p_code text, p_course text)
returns table (ok boolean, message text, id uuid, name text, kind text, value numeric, scope text)
language plpgsql stable security definer set search_path = public as $$
declare p public.promos;
begin
  select * into p from public.promos where code = upper(trim(coalesce(p_code, ''))) and not auto;
  if not found then return query select false, 'We could not find that promo code. Check the spelling and try again.', null::uuid, null::text, null::text, null::numeric, null::text; return; end if;
  if not p.active then return query select false, 'That promo code is not active at the moment.', null::uuid, null::text, null::text, null::numeric, null::text; return; end if;
  if p.starts_at is not null and p.starts_at > now() then return query select false, 'That promo code starts on ' || to_char(p.starts_at at time zone 'Africa/Lagos', 'FMDD Mon YYYY') || '.', null::uuid, null::text, null::text, null::numeric, null::text; return; end if;
  if p.ends_at is not null and p.ends_at <= now() then return query select false, 'That promo code has expired.', null::uuid, null::text, null::text, null::numeric, null::text; return; end if;
  if p.max_uses is not null and p.uses >= p.max_uses then return query select false, 'That promo code has already been used the maximum number of times.', null::uuid, null::text, null::text, null::numeric, null::text; return; end if;
  if cardinality(p.courses) > 0 and not (p_course = any(p.courses)) then return query select false, 'That promo code does not apply to this course.', null::uuid, null::text, null::text, null::numeric, null::text; return; end if;
  return query select true, '', p.id, coalesce(nullif(p.name, ''), p.code), p.kind, p.value, p.scope;
end $$;
grant execute on function public.check_promo(text, text) to anon, authenticated;

-- The prices a course really costs now: the best live offer (automatic or the typed code) for each plan.
create or replace function public.course_prices(p_course text, p_code text default null)
returns table (full_amount numeric, full_promo uuid, inst_amount numeric, inst_promo uuid)
language plpgsql stable security definer set search_path = public as $$
declare c public.courses; p public.promos; cut numeric; best_f numeric := 0; best_i numeric := 0; pf uuid; pi uuid; tot numeric;
begin
  select * into c from public.courses where id = p_course;
  if not found then return; end if;
  tot := c.inst_amt * c.inst_n;
  for p in select * from public.promos x where public.promo_live(x, p_course)
             and (x.auto or (p_code is not null and x.code = upper(trim(p_code)))) loop
    cut := case p.kind when 'percent' then round(c.price * p.value / 100, 2) else least(p.value, c.price) end;
    if cut > best_f then best_f := cut; pf := p.id; end if;
    if p.scope = 'all' and c.inst_n > 1 and c.inst_amt > 0 then
      cut := case p.kind when 'percent' then round(tot * p.value / 100, 2) else least(p.value, tot) end;
      if cut > best_i then best_i := cut; pi := p.id; end if;
    end if;
  end loop;
  return query select round(c.price - best_f, 2), pf,
    case when c.inst_n > 1 and c.inst_amt > 0 then round((tot - best_i) / c.inst_n, 2) else null end, pi;
end $$;
grant execute on function public.course_prices(text, text) to anon, authenticated;

-- Remember the agreed installment amount (after any discount) and which promo was used
alter table public.enrollments add column if not exists inst_amt numeric(12,2);
alter table public.payments add column if not exists promo uuid references public.promos(id) on delete set null;
alter table public.payment_requests add column if not exists promo_code text check (promo_code is null or length(promo_code) <= 30);

-- The one place where money unlocks a course, now aware of promo offers. Replaces the 27 Nov version.
drop function if exists public.apply_payment(uuid,text,numeric,text,text,jsonb);
create or replace function public.apply_payment(p_user uuid, p_course text, p_amount numeric, p_gateway text, p_reference text, p_raw jsonb default null, p_promo text default null)
returns public.enrollments language plpgsql security definer set search_path = public as $$
declare c public.courses; e public.enrollments; pr record; v_plan text; v_due numeric; v_inst numeric; v_promo uuid;
begin
  select * into c from public.courses where id = p_course;
  if not found or c.mode <> 'paid' then raise exception 'Course % does not take payments', p_course; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  p_amount := round(p_amount, 2);

  select * into e from public.enrollments where user_id = p_user and course_id = p_course for update;
  if not found or e.plan in ('free','granted') then
    -- First payment: the full price, or the first installment, after the best live offer
    select * into pr from public.course_prices(p_course, p_promo);
    if p_amount >= pr.full_amount then v_plan := 'full'; v_due := pr.full_amount; v_promo := pr.full_promo;
    elsif pr.inst_amount is not null and p_amount >= pr.inst_amount then
      v_plan := 'installments'; v_inst := pr.inst_amount; v_due := pr.inst_amount * c.inst_n; v_promo := pr.inst_promo;
    else raise exception 'Amount % is below the price for %', p_amount, p_course; end if;
  else
    if e.amount_paid >= e.amount_due then raise exception 'Course % is already fully paid', p_course; end if;
    -- Later installment: at least one installment, or whatever is left
    if p_amount < least(coalesce(e.inst_amt, c.inst_amt), greatest(e.amount_due - e.amount_paid, 0.01)) then
      raise exception 'Amount % is below the installment for %', p_amount, p_course;
    end if;
  end if;

  insert into public.payments (user_id, course_id, reference, gateway, amount, raw, promo)
  values (p_user, p_course, p_reference, p_gateway, p_amount, p_raw, v_promo);   -- unique reference: a payment can't be used twice
  if v_promo is not null then update public.promos set uses = uses + 1 where id = v_promo; end if;

  insert into public.enrollments (user_id, course_id, plan, amount_due, amount_paid, inst_amt)
  values (p_user, p_course, coalesce(v_plan, 'full'), coalesce(v_due, p_amount), p_amount, v_inst)
  on conflict (user_id, course_id) do update
    set plan = coalesce(v_plan, public.enrollments.plan),
        amount_due = coalesce(v_due, public.enrollments.amount_due),
        inst_amt = coalesce(v_inst, public.enrollments.inst_amt),
        amount_paid = case when v_plan is null then public.enrollments.amount_paid + p_amount else p_amount end
  returning * into e;
  return e;
end $$;
revoke all on function public.apply_payment(uuid,text,numeric,text,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.apply_payment(uuid,text,numeric,text,text,jsonb,text) to service_role;

-- Bank transfer / LinPay: confirming a request now carries its promo code too
create or replace function public.on_payment_request_decided() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'confirmed' and old.status <> 'confirmed' then
    perform public.apply_payment(new.user_id, new.course_id, new.amount, new.method, 'REQ-' || new.id::text, to_jsonb(new), new.promo_code);
    new.decided_at := now();
  elsif new.status = 'rejected' and old.status <> 'rejected' then
    new.decided_at := now();
  end if;
  return new;
end $$;

-- ---------------------------------------------------------------------------
-- 3. Admin portal helpers
-- ---------------------------------------------------------------------------
-- Everything waiting for the team, in one call
create or replace function public.admin_counts()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if not public.is_app_admin('admin') then raise exception 'Admins only'; end if;
  return jsonb_build_object(
    'enquiries', (select coalesce(jsonb_object_agg(kind, n), '{}'::jsonb) from (select kind, count(*) n from public.enquiries where status = 'Received' group by kind) x),
    'payment_requests', (select count(*) from public.payment_requests where status = 'pending'),
    'bookings', (select count(*) from public.event_bookings where status = 'awaiting payment'),
    'affiliates', (select count(*) from public.affiliates where status = 'pending'),
    'messages', (select count(*) from public.contact_messages where status = 'New'),
    'members', (select count(*) from public.profiles where user_id is not null),
    'members_30d', (select count(*) from public.profiles where user_id is not null and joined_at > now() - interval '30 days'),
    'enrollments', (select count(*) from public.enrollments),
    'visitors', (select count(*) from public.visitors),
    'paid', (select coalesce(jsonb_object_agg(currency, total), '{}'::jsonb) from (select currency, sum(amount) total from public.payments group by currency) y)
  );
end $$;
grant execute on function public.admin_counts() to authenticated;
