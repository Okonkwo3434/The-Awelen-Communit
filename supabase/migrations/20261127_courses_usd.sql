-- Awelen Community: course update and US dollar fees (27 November 2026).
-- Run AFTER the Phase 2 and Phase 3 scripts. Paste this whole file into Supabase > SQL Editor and press Run.
-- Safe to run again. Nothing is deleted: old courses that left the app (Opportunity Recognition,
-- Leading Yourself First, Driving Change) stay in the table so past enrolments keep working.

-- 1. Every course carries its own currency. Amounts stay whole numbers in that currency
--    (dollars for USD courses, naira for NGN courses).
alter table public.courses add column if not exists currency text not null default 'NGN';
alter table public.courses drop constraint if exists courses_currency_check;
alter table public.courses add constraint courses_currency_check check (currency in ('NGN','USD'));

alter table public.payments add column if not exists currency text not null default 'NGN';
alter table public.payment_requests add column if not exists currency text not null default 'NGN';

-- Dollar fees and installments need cents (e.g. 3 x $18.34), so money columns take two decimals.
alter table public.courses alter column price type numeric(12,2);
alter table public.courses alter column inst_amt type numeric(12,2);
alter table public.enrollments alter column amount_due type numeric(12,2);
alter table public.enrollments alter column amount_paid type numeric(12,2);
alter table public.payments alter column amount type numeric(12,2);
alter table public.payment_requests alter column amount type numeric(12,2);

-- The one place where money unlocks a course, now with amounts in cents/kobo precision.
-- (Replaces the Phase 3 version, which took whole numbers.)
drop function if exists public.apply_payment(uuid,text,integer,text,text,jsonb);
create or replace function public.apply_payment(p_user uuid, p_course text, p_amount numeric, p_gateway text, p_reference text, p_raw jsonb default null)
returns public.enrollments language plpgsql security definer set search_path = public as $$
declare c public.courses; e public.enrollments; v_plan text; v_due numeric;
begin
  select * into c from public.courses where id = p_course;
  if not found or c.mode <> 'paid' then raise exception 'Course % does not take payments', p_course; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;
  p_amount := round(p_amount, 2);

  select * into e from public.enrollments where user_id = p_user and course_id = p_course for update;
  if not found or e.plan in ('free','granted') then
    -- First payment: full price, or the first installment
    if p_amount >= c.price then v_plan := 'full'; v_due := c.price;
    elsif c.inst_n > 1 and c.inst_amt > 0 and p_amount >= c.inst_amt then v_plan := 'installments'; v_due := c.inst_n * c.inst_amt;
    else raise exception 'Amount % is below the price for %', p_amount, p_course; end if;
  else
    if e.amount_paid >= e.amount_due then raise exception 'Course % is already fully paid', p_course; end if;
    -- Later installment: at least one installment, or whatever is left
    if p_amount < least(c.inst_amt, greatest(e.amount_due - e.amount_paid, 0.01)) then
      raise exception 'Amount % is below the installment for %', p_amount, p_course;
    end if;
  end if;

  insert into public.payments (user_id, course_id, reference, gateway, amount, raw)
  values (p_user, p_course, p_reference, p_gateway, p_amount, p_raw);   -- unique reference: a payment can't be used twice

  insert into public.enrollments (user_id, course_id, plan, amount_due, amount_paid)
  values (p_user, p_course, coalesce(v_plan, 'full'), coalesce(v_due, p_amount), p_amount)
  on conflict (user_id, course_id) do update
    set plan = coalesce(v_plan, public.enrollments.plan),
        amount_due = coalesce(v_due, public.enrollments.amount_due),
        amount_paid = case when v_plan is null then public.enrollments.amount_paid + p_amount else p_amount end
  returning * into e;
  return e;
end $$;
revoke all on function public.apply_payment(uuid,text,numeric,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.apply_payment(uuid,text,numeric,text,text,jsonb) to service_role;

-- 2. The current course list, titles, access and fees (from the app, 27 November 2026)
insert into public.courses (id, title, mode, price, currency, inst_n, inst_amt) values
  ('idea', 'Idea Discovery', 'paid', 50, 'USD', 3, 18.34),
  ('snb', 'Business Model Development 1: Designing Your Business Model', 'paid', 100, 'USD', 3, 36.67),
  ('bmd2', 'Business Model Development 2: Testing and Evolving Your Business Model', 'paid', 75, 'USD', 3, 27.5),
  ('econ', 'Understanding Economic Outlook', 'paid', 75, 'USD', 3, 27.5),
  ('run', 'Now Run It: Management Foundations for Founders and New Leaders', 'paid', 50, 'USD', 3, 18.34),
  ('fin', 'Financial Intelligence for Leaders', 'paid', 100, 'USD', 3, 36.67),
  ('strat', 'Winning Choices: Strategy for Leaders Who Want to Stand Apart', 'paid', 100, 'USD', 3, 36.67),
  ('plan', 'Plans That Perform: Strategic Planning That Turns Choices into Results', 'paid', 100, 'USD', 3, 36.67),
  ('scale', 'Built to Scale: Structure, Systems and People for Growing Organisations', 'paid', 150, 'USD', 3, 55),
  ('systems', 'Systems Thinking for Leaders and Policymakers', 'paid', 150, 'USD', 3, 55),
  ('visual', 'Visual Thinking for Leaders', 'paid', 150, 'USD', 3, 55),
  ('design', 'Design Thinking for Executives', 'paid', 100, 'USD', 3, 36.67),
  ('culture', 'Innovation Culture Shift', 'paid', 150, 'USD', 3, 55),
  ('decide', 'Deciding in the Fog: Head, Heart, Models and Tools for Leaders in Complexity', 'paid', 150, 'USD', 3, 55),
  ('wealth', 'Building Sustainable Wealth: From Breakthrough to Legacy', 'paid', 100, 'USD', 3, 36.67),
  ('amld-strategy', 'Strategy & Business Model Renewal', 'application', 0, 'NGN', 1, 0),
  ('amld-finance', 'Financial Leadership & Capital', 'application', 0, 'NGN', 1, 0),
  ('amld-leaders', 'Leading Leaders & Building Teams', 'application', 0, 'NGN', 1, 0),
  ('amld-ops', 'Operations, Systems & Digital Transformation', 'application', 0, 'NGN', 1, 0),
  ('amld-growth', 'Growth, Markets & Partnerships', 'application', 0, 'NGN', 1, 0),
  ('amld-turn', 'Turnaround, Risk & Governance', 'application', 0, 'NGN', 1, 0),
  ('ep-found', 'Executive Presence Foundation', 'paid', 150, 'USD', 3, 55),
  ('ep-cohort', 'Executive Presence Cohort', 'application', 0, 'NGN', 1, 0),
  ('peerc', 'Executive Peer Circle', 'paid', 150, 'USD', 3, 55)
on conflict (id) do update set
  title = excluded.title, mode = excluded.mode, price = excluded.price, currency = excluded.currency,
  inst_n = excluded.inst_n, inst_amt = excluded.inst_amt, updated_at = now();

-- 3. Payments are always recorded in the course's own currency
create or replace function public.payments_set_currency() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  select c.currency into new.currency from public.courses c where c.id = new.course_id;
  return new;
end $$;
drop trigger if exists payments_currency on public.payments;
create trigger payments_currency before insert on public.payments
  for each row execute function public.payments_set_currency();
drop trigger if exists payment_requests_currency on public.payment_requests;
create trigger payment_requests_currency before insert on public.payment_requests
  for each row execute function public.payments_set_currency();
