-- Awelen Community: Phase 2 setup (public side).
-- Paste this whole file into Supabase > SQL Editor and press Run. It is safe to run again.
-- It creates: team list, member profiles (made automatically at sign-up), visitor sign-ups,
-- contact messages and announcements, each locked with security rules (RLS).

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------------------
-- 1. Team: who may manage the site (admin = everything, editor = content only)
-- ---------------------------------------------------------------------------
create table if not exists public.app_admins (
  email text primary key,
  role text not null default 'admin' check (role in ('admin','editor')),
  added_at timestamptz not null default now()
);

create or replace function public.is_app_admin(min_role text default 'editor')
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.app_admins a
    where lower(a.email) = lower(coalesce(auth.jwt() ->> 'email', ''))
      and (min_role = 'editor' or a.role = 'admin')
  );
$$;
grant execute on function public.is_app_admin(text) to anon, authenticated;

alter table public.app_admins enable row level security;
drop policy if exists "team can see team" on public.app_admins;
create policy "team can see team" on public.app_admins for select to authenticated using (public.is_app_admin('editor'));
drop policy if exists "admins manage team" on public.app_admins;
create policy "admins manage team" on public.app_admins for all to authenticated
  using (public.is_app_admin('admin')) with check (public.is_app_admin('admin'));

-- Awele is the first admin. Change the email if you will sign in with a different one.
insert into public.app_admins (email, role) values ('awelenkem@businessarchitectz.com', 'admin')
on conflict (email) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Member profiles: one per account, created automatically when someone signs up
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references auth.users(id) on delete cascade,
  kind text not null default 'member' check (kind in ('learner','member','affiliate')),
  name text not null,
  email text, phone text, city text, headline text, business text, stage text,
  skills text[] not null default '{}',
  bio text,
  status text not null default 'Active',
  agreed_at timestamptz,
  joined_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Older setups (from the single-file build) may already have this table: add what Phase 2 needs.
alter table public.profiles add column if not exists user_id uuid unique references auth.users(id) on delete cascade;
create index if not exists profiles_email_idx on public.profiles (lower(email));

create or replace function public.touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (user_id, name, email, phone)
  values (
    new.id,
    left(coalesce(nullif(trim(new.raw_user_meta_data ->> 'name'), ''), split_part(new.email, '@', 1)), 120),
    new.email,
    left(nullif(trim(new.raw_user_meta_data ->> 'phone'), ''), 40)
  )
  on conflict (user_id) do nothing;
  return new;
end $$;
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
drop policy if exists "admins manage profiles" on public.profiles;
create policy "admins manage profiles" on public.profiles for all to authenticated
  using (public.is_app_admin('admin')) with check (public.is_app_admin('admin'));
drop policy if exists "people read own profile" on public.profiles;
create policy "people read own profile" on public.profiles for select to authenticated using (user_id = auth.uid());
drop policy if exists "people update own profile" on public.profiles;
create policy "people update own profile" on public.profiles for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid() and kind = 'member' and status = 'Active');

-- ---------------------------------------------------------------------------
-- 3. Visitors who leave their details on the exit sign-up form (admins read them)
-- ---------------------------------------------------------------------------
create table if not exists public.visitors (
  id uuid primary key default gen_random_uuid(),
  email text not null unique,
  name text not null,
  phone text, interest text, first_page text,
  visits int not null default 1,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now()
);
alter table public.visitors enable row level security;
drop policy if exists "admins read visitors" on public.visitors;
create policy "admins read visitors" on public.visitors for select to authenticated using (public.is_app_admin('admin'));
drop policy if exists "admins remove visitors" on public.visitors;
create policy "admins remove visitors" on public.visitors for delete to authenticated using (public.is_app_admin('admin'));

-- The website calls this to save a visitor. It answers 'new' or 'returning' and reveals nothing else.
create or replace function public.register_visitor(p_name text, p_email text, p_phone text default null, p_interest text default null, p_page text default null)
returns text language plpgsql security definer set search_path = public as $$
declare e text := lower(trim(coalesce(p_email, ''))); known boolean;
begin
  if e !~ '^[^@[:space:]]+@[^@[:space:]]+[.][^@[:space:]]+$' or length(e) > 200 then raise exception 'Invalid email'; end if;
  known := exists (select 1 from public.visitors v where v.email = e)
        or exists (select 1 from public.profiles p where lower(p.email) = e);
  insert into public.visitors (email, name, phone, interest, first_page)
  values (e, left(coalesce(nullif(trim(p_name), ''), 'Visitor'), 120), left(nullif(trim(p_phone), ''), 40), left(p_interest, 80), left(p_page, 200))
  on conflict (email) do update set visits = public.visitors.visits + 1, last_seen = now(),
    phone = coalesce(excluded.phone, public.visitors.phone),
    interest = coalesce(excluded.interest, public.visitors.interest);
  return case when known then 'returning' else 'new' end;
end $$;
revoke all on function public.register_visitor(text,text,text,text,text) from public;
grant execute on function public.register_visitor(text,text,text,text,text) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Contact messages from the Contact page (anyone can send, admins read)
-- ---------------------------------------------------------------------------
create table if not exists public.contact_messages (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(name) between 1 and 120),
  email text not null check (length(email) between 3 and 200),
  phone text check (phone is null or length(phone) <= 40),
  topic text check (topic is null or length(topic) <= 80),
  message text not null check (length(message) between 1 and 4000),
  status text not null default 'New',
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
drop policy if exists "anyone can send a message" on public.contact_messages;
create policy "anyone can send a message" on public.contact_messages for insert to anon, authenticated with check (status = 'New');
drop policy if exists "admins manage messages" on public.contact_messages;
create policy "admins manage messages" on public.contact_messages for all to authenticated
  using (public.is_app_admin('admin')) with check (public.is_app_admin('admin'));

-- ---------------------------------------------------------------------------
-- 5. Announcements (everyone reads, the team posts)
-- ---------------------------------------------------------------------------
create table if not exists public.announcements (
  id text primary key default gen_random_uuid()::text,
  title text not null,
  category text not null default 'General',
  body text not null,
  important boolean not null default false,
  pinned boolean not null default false,
  published_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists announcements_touch on public.announcements;
create trigger announcements_touch before update on public.announcements for each row execute function public.touch_updated_at();
alter table public.announcements enable row level security;
drop policy if exists "anyone reads announcements" on public.announcements;
create policy "anyone reads announcements" on public.announcements for select to anon, authenticated using (true);
drop policy if exists "team posts announcements" on public.announcements;
create policy "team posts announcements" on public.announcements for all to authenticated
  using (public.is_app_admin('editor')) with check (public.is_app_admin('editor'));

-- Starting announcements, carried over from the original build
insert into public.announcements (id, title, category, body, published_at) values
  ('an-amld', 'New: AMLD Studio Sprints and the Executive Presence Programme', 'Course update', 'Advanced Management & Leadership Development is now taught in six-week Studio Sprints, led by Professors of Practice who have run businesses themselves. You work on a live brief from a real business and finish with a portfolio, not just a certificate.

The Executive Presence Programme is AMLD’s capstone. Take it self-paced, or apply for the live Cohort with personal critiques and the Presence Dinner.

Everything about both programmes now lives under Track 4 in the sidebar: the AMLD programme, Executive Presence and the Executive Peer-Circle.', '2026-11-20T09:17:26.371000+00:00'),
  ('an1', 'Idea Discovery now has 5 modules and 32 lessons', 'Course update', 'Idea Discovery has grown. It now runs from Finding Meaning in Life all the way to Exploring Your Idea Space, with 32 lessons in five modules.

If you have already unlocked the course, the new lessons are open to you now at no extra cost. Pick up where you left off.', '2026-11-20T07:17:26.371000+00:00'),
  ('an2', 'The Crucible Circle is open for challenges', 'The Crucible Circle', 'Organisations can now submit complex strategic challenges to the Ideation Room, and experienced practitioners can send an expression of interest to join as Expert Practitioners or Master Moderators.', '2026-11-19T08:17:26.371000+00:00'),
  ('an3', 'Webinar: Pricing for profit in 2027', 'Event', 'Join Awele for a live session on setting prices that keep you in business, with time for your questions. Register in Live events; your joining link is emailed before the session.', '2026-11-18T08:17:26.371000+00:00')
on conflict (id) do nothing;
