-- Awelen Community: Phase 3 setup (learning and payments).
-- Run AFTER the Phase 2 script. Paste this whole file into Supabase > SQL Editor and press Run.
-- Safe to run again. Supabase may warn about "destructive operations": that is only the
-- "drop policy/trigger if exists" lines that refresh security rules. No table or data is deleted.

-- ---------------------------------------------------------------------------
-- 1. Courses: prices the server trusts when checking payments
--    mode: 'paid' (pay to unlock), 'free' (sign in and start), 'application' (team enrols you)
-- ---------------------------------------------------------------------------
create table if not exists public.courses (
  id text primary key,
  title text not null,
  mode text not null default 'free' check (mode in ('paid','free','application')),
  price integer not null default 0 check (price >= 0),          -- full price in naira
  inst_n integer not null default 1 check (inst_n between 1 and 12),
  inst_amt integer not null default 0 check (inst_amt >= 0),     -- each installment in naira
  updated_at timestamptz not null default now()
);
alter table public.courses enable row level security;
drop policy if exists "anyone reads courses" on public.courses;
create policy "anyone reads courses" on public.courses for select to anon, authenticated using (true);
drop policy if exists "admins manage courses" on public.courses;
create policy "admins manage courses" on public.courses for all to authenticated
  using (public.is_app_admin('admin')) with check (public.is_app_admin('admin'));

insert into public.courses (id, title, mode, price, inst_n, inst_amt) values
  ('idea', 'Idea Discovery', 'paid', 25000, 1, 0),
  ('snb', 'Starting Your New Idea', 'paid', 50000, 3, 18000),
  ('econ', 'Understanding Economic Outlook', 'free', 0, 1, 0),
  ('opp', 'Opportunity Recognition', 'free', 0, 1, 0),
  ('fin', 'Financial Intelligence', 'free', 0, 1, 0),
  ('strat', 'Strategy Development', 'free', 0, 1, 0),
  ('lead', 'Leading Yourself First', 'paid', 40000, 2, 21000),
  ('scale', 'Scaling for Impact', 'free', 0, 1, 0),
  ('visual', 'Visual Thinking for Leaders', 'free', 0, 1, 0),
  ('change', 'Driving Change', 'free', 0, 1, 0),
  ('wealth', 'Building Sustainable Wealth', 'free', 0, 1, 0),
  ('amld-strategy', 'Strategy & Business Model Renewal', 'application', 0, 1, 0),
  ('amld-finance', 'Financial Leadership & Capital', 'application', 0, 1, 0),
  ('amld-leaders', 'Leading Leaders & Building Teams', 'application', 0, 1, 0),
  ('amld-ops', 'Operations, Systems & Digital Transformation', 'application', 0, 1, 0),
  ('amld-growth', 'Growth, Markets & Partnerships', 'application', 0, 1, 0),
  ('amld-turn', 'Turnaround, Risk & Governance', 'application', 0, 1, 0),
  ('ep-found', 'Executive Presence Foundation', 'application', 0, 1, 0),
  ('ep-cohort', 'Executive Presence Cohort', 'application', 0, 1, 0)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Enrolments: who has unlocked which course, and how much is paid
-- ---------------------------------------------------------------------------
create table if not exists public.enrollments (
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id) on delete cascade,
  plan text not null default 'free' check (plan in ('free','full','installments','granted')),
  amount_due integer not null default 0,
  amount_paid integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, course_id)
);
drop trigger if exists enrollments_touch on public.enrollments;
create trigger enrollments_touch before update on public.enrollments for each row execute function public.touch_updated_at();
alter table public.enrollments enable row level security;
drop policy if exists "people read own enrolments" on public.enrollments;
create policy "people read own enrolments" on public.enrollments for select to authenticated using (user_id = auth.uid());
drop policy if exists "admins manage enrolments" on public.enrollments;
create policy "admins manage enrolments" on public.enrollments for all to authenticated
  using (public.is_app_admin('admin')) with check (public.is_app_admin('admin'));

create or replace function public.is_enrolled(p_course text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.enrollments e where e.user_id = auth.uid() and e.course_id = p_course);
$$;
grant execute on function public.is_enrolled(text) to authenticated;

-- Members start a free course themselves
create or replace function public.enroll_free(p_course text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if not exists (select 1 from public.courses c where c.id = p_course and c.mode = 'free') then
    raise exception 'This course is not free';
  end if;
  insert into public.enrollments (user_id, course_id, plan) values (auth.uid(), p_course, 'free')
  on conflict (user_id, course_id) do nothing;
end $$;
revoke all on function public.enroll_free(text) from public;
grant execute on function public.enroll_free(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Lesson media: video link, PDF link and notes. Only enrolled members (and the team) can read them.
--    Add a row per lesson in Table Editor until the admin portal arrives (lesson ids are in the app).
-- ---------------------------------------------------------------------------
create table if not exists public.lesson_media (
  lesson_id text primary key,
  course_id text not null references public.courses(id) on delete cascade,
  video_url text,
  pdf_url text,
  notes text,
  updated_at timestamptz not null default now()
);
drop trigger if exists lesson_media_touch on public.lesson_media;
create trigger lesson_media_touch before update on public.lesson_media for each row execute function public.touch_updated_at();
alter table public.lesson_media enable row level security;
drop policy if exists "enrolled members read lesson media" on public.lesson_media;
create policy "enrolled members read lesson media" on public.lesson_media for select to authenticated
  using (public.is_enrolled(course_id) or public.is_app_admin('editor'));
drop policy if exists "team manages lesson media" on public.lesson_media;
create policy "team manages lesson media" on public.lesson_media for all to authenticated
  using (public.is_app_admin('editor')) with check (public.is_app_admin('editor'));

-- ---------------------------------------------------------------------------
-- 4. Progress: lessons each member has completed (and their written reflections)
-- ---------------------------------------------------------------------------
create table if not exists public.lesson_progress (
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  lesson_id text not null,
  course_id text not null references public.courses(id) on delete cascade,
  answer text check (answer is null or length(answer) <= 4000),
  done_at timestamptz not null default now(),
  primary key (user_id, lesson_id)
);
create index if not exists lesson_progress_course_idx on public.lesson_progress (user_id, course_id);
alter table public.lesson_progress enable row level security;
drop policy if exists "people read own progress" on public.lesson_progress;
create policy "people read own progress" on public.lesson_progress for select to authenticated using (user_id = auth.uid());
drop policy if exists "enrolled members record progress" on public.lesson_progress;
create policy "enrolled members record progress" on public.lesson_progress for insert to authenticated
  with check (user_id = auth.uid() and public.is_enrolled(course_id));
drop policy if exists "admins read progress" on public.lesson_progress;
create policy "admins read progress" on public.lesson_progress for select to authenticated using (public.is_app_admin('admin'));

-- ---------------------------------------------------------------------------
-- 5. Payments. Only the server writes here: the Paystack check (Edge Function) or an admin confirming
--    a bank transfer / LinPay request. The amount is always checked against the course price above.
-- ---------------------------------------------------------------------------
create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id),
  reference text not null unique,
  gateway text not null,
  amount integer not null check (amount > 0),
  raw jsonb,
  paid_at timestamptz not null default now()
);
alter table public.payments enable row level security;
drop policy if exists "people read own payments" on public.payments;
create policy "people read own payments" on public.payments for select to authenticated using (user_id = auth.uid());
drop policy if exists "admins read payments" on public.payments;
create policy "admins read payments" on public.payments for select to authenticated using (public.is_app_admin('admin'));

-- The one place where money unlocks a course. Returns the updated enrolment.
create or replace function public.apply_payment(p_user uuid, p_course text, p_amount integer, p_gateway text, p_reference text, p_raw jsonb default null)
returns public.enrollments language plpgsql security definer set search_path = public as $$
declare c public.courses; e public.enrollments; v_plan text; v_due integer;
begin
  select * into c from public.courses where id = p_course;
  if not found or c.mode <> 'paid' then raise exception 'Course % does not take payments', p_course; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Invalid amount'; end if;

  select * into e from public.enrollments where user_id = p_user and course_id = p_course for update;
  if not found or e.plan in ('free','granted') then
    -- First payment: full price, or the first installment
    if p_amount >= c.price then v_plan := 'full'; v_due := c.price;
    elsif c.inst_n > 1 and c.inst_amt > 0 and p_amount >= c.inst_amt then v_plan := 'installments'; v_due := c.inst_n * c.inst_amt;
    else raise exception 'Amount % is below the price for %', p_amount, p_course; end if;
  else
    if e.amount_paid >= e.amount_due then raise exception 'Course % is already fully paid', p_course; end if;
    -- Later installment: at least one installment, or whatever is left
    if p_amount < least(c.inst_amt, greatest(e.amount_due - e.amount_paid, 1)) then
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
revoke all on function public.apply_payment(uuid,text,integer,text,text,jsonb) from public, anon, authenticated;
grant execute on function public.apply_payment(uuid,text,integer,text,text,jsonb) to service_role;

-- ---------------------------------------------------------------------------
-- 6. Payment requests: bank transfer or LinPay. The member says what they paid; an admin checks
--    the bank or LinPay and changes status to 'confirmed' (Table Editor works). That unlocks the course.
-- ---------------------------------------------------------------------------
create table if not exists public.payment_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  course_id text not null references public.courses(id),
  method text not null check (method in ('Bank transfer','LinPay')),
  amount integer not null check (amount > 0),
  reference text check (reference is null or length(reference) <= 120),
  note text check (note is null or length(note) <= 1000),
  status text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  created_at timestamptz not null default now(),
  decided_at timestamptz
);
alter table public.payment_requests enable row level security;
drop policy if exists "people send payment requests" on public.payment_requests;
create policy "people send payment requests" on public.payment_requests for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending');
drop policy if exists "people read own payment requests" on public.payment_requests;
create policy "people read own payment requests" on public.payment_requests for select to authenticated using (user_id = auth.uid());
drop policy if exists "admins manage payment requests" on public.payment_requests;
create policy "admins manage payment requests" on public.payment_requests for all to authenticated
  using (public.is_app_admin('admin')) with check (public.is_app_admin('admin'));

create or replace function public.on_payment_request_decided() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'confirmed' and old.status <> 'confirmed' then
    perform public.apply_payment(new.user_id, new.course_id, new.amount, new.method, 'REQ-' || new.id::text, to_jsonb(new));
    new.decided_at := now();
  elsif new.status = 'rejected' and old.status <> 'rejected' then
    new.decided_at := now();
  end if;
  return new;
end $$;
drop trigger if exists payment_request_decided on public.payment_requests;
create trigger payment_request_decided before update of status on public.payment_requests
  for each row execute function public.on_payment_request_decided();
