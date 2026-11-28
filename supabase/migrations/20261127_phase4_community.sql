-- Awelen Community: Phase 4 setup (community and special spaces).
-- Run AFTER the Phase 2, Phase 3 and 27 November (courses_usd) scripts.
-- Paste this whole file into Supabase > SQL Editor and press Run. Safe to run again.
-- Supabase may warn about "destructive operations": that is only the "drop policy/trigger if exists"
-- lines that refresh security rules. No table or data is deleted.

-- ---------------------------------------------------------------------------
-- 0. Who may read and post in which space
--    faculty  = Faculty Lounge: the team only
--    presence = Critique Wall: Executive Presence learners and the team
--    everything else (community, intro, portfolio): anyone reads, members post
-- ---------------------------------------------------------------------------
create or replace function public.is_ep_learner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.enrollments e
    where e.user_id = auth.uid() and e.course_id in ('ep-found','ep-cohort')
      and (e.plan in ('free','granted') or e.amount_paid > 0));
$$;
grant execute on function public.is_ep_learner() to anon, authenticated;

create or replace function public.can_read_space(p_space text)
returns boolean language sql stable security definer set search_path = public as $$
  select case p_space
    when 'faculty' then public.is_app_admin('editor')
    when 'presence' then public.is_app_admin('editor') or public.is_ep_learner()
    else true end;
$$;
grant execute on function public.can_read_space(text) to anon, authenticated;

create or replace function public.can_post_space(p_space text)
returns boolean language sql stable security definer set search_path = public as $$
  select auth.uid() is not null and p_space in ('community','intro','portfolio','faculty','presence')
    and public.can_read_space(p_space);
$$;
grant execute on function public.can_post_space(text) to authenticated;

create or replace function public.my_display_name()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select p.name from public.profiles p where p.user_id = auth.uid()),
                  split_part(coalesce(auth.jwt() ->> 'email', 'Member'), '@', 1));
$$;

-- ---------------------------------------------------------------------------
-- 1. Posts, comments and likes
-- ---------------------------------------------------------------------------
create table if not exists public.posts (
  id uuid primary key default gen_random_uuid(),
  space text not null,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  author_name text not null default '',
  is_creator boolean not null default false,
  body text not null check (length(body) between 1 and 5000),
  pinned boolean not null default false,
  likes integer not null default 0,
  created_at timestamptz not null default now()
);
create index if not exists posts_space_idx on public.posts (space, pinned desc, created_at desc);

create or replace function public.posts_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then            -- written from the website (not by this setup script)
    new.user_id := auth.uid();
    new.author_name := left(public.my_display_name(), 120);
    new.is_creator := public.is_app_admin('admin');
    new.likes := 0;
    if not public.is_app_admin('editor') then new.pinned := false; end if;
  end if;
  return new;
end $$;
drop trigger if exists posts_before_insert on public.posts;
create trigger posts_before_insert before insert on public.posts for each row execute function public.posts_before_insert();

alter table public.posts enable row level security;
drop policy if exists "read posts where allowed" on public.posts;
create policy "read posts where allowed" on public.posts for select to anon, authenticated using (public.can_read_space(space));
drop policy if exists "members post where allowed" on public.posts;
create policy "members post where allowed" on public.posts for insert to authenticated
  with check (user_id = auth.uid() and public.can_post_space(space));
drop policy if exists "people delete own posts" on public.posts;
create policy "people delete own posts" on public.posts for delete to authenticated using (user_id = auth.uid());
drop policy if exists "team manages posts" on public.posts;
create policy "team manages posts" on public.posts for all to authenticated
  using (public.is_app_admin('editor')) with check (public.is_app_admin('editor'));

create table if not exists public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid default auth.uid() references auth.users(id) on delete cascade,
  author_name text not null default '',
  is_creator boolean not null default false,
  body text not null check (length(body) between 1 and 2000),
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on public.post_comments (post_id, created_at);

create or replace function public.comments_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null then
    new.user_id := auth.uid();
    new.author_name := left(public.my_display_name(), 120);
    new.is_creator := public.is_app_admin('admin');
  end if;
  return new;
end $$;
drop trigger if exists comments_before_insert on public.post_comments;
create trigger comments_before_insert before insert on public.post_comments for each row execute function public.comments_before_insert();

alter table public.post_comments enable row level security;
drop policy if exists "read comments where allowed" on public.post_comments;
create policy "read comments where allowed" on public.post_comments for select to anon, authenticated
  using (exists (select 1 from public.posts p where p.id = post_id and public.can_read_space(p.space)));
drop policy if exists "members comment where allowed" on public.post_comments;
create policy "members comment where allowed" on public.post_comments for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and public.can_post_space(p.space)));
drop policy if exists "people delete own comments" on public.post_comments;
create policy "people delete own comments" on public.post_comments for delete to authenticated using (user_id = auth.uid());
drop policy if exists "team manages comments" on public.post_comments;
create policy "team manages comments" on public.post_comments for all to authenticated
  using (public.is_app_admin('editor')) with check (public.is_app_admin('editor'));

create table if not exists public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_likes enable row level security;
drop policy if exists "people see own likes" on public.post_likes;
create policy "people see own likes" on public.post_likes for select to authenticated using (user_id = auth.uid());
drop policy if exists "people like" on public.post_likes;
create policy "people like" on public.post_likes for insert to authenticated
  with check (user_id = auth.uid() and exists (select 1 from public.posts p where p.id = post_id and public.can_read_space(p.space)));
drop policy if exists "people unlike" on public.post_likes;
create policy "people unlike" on public.post_likes for delete to authenticated using (user_id = auth.uid());

create or replace function public.post_likes_count() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update public.posts set likes = (select count(*) from public.post_likes l where l.post_id = coalesce(new.post_id, old.post_id))
  where id = coalesce(new.post_id, old.post_id);
  return null;
end $$;
drop trigger if exists post_likes_count on public.post_likes;
create trigger post_likes_count after insert or delete on public.post_likes for each row execute function public.post_likes_count();

-- Awele's opening posts from the single-file app
insert into public.posts (id, space, author_name, is_creator, body, pinned) values
  ('f975901f-f31e-58ff-b7a6-21db642c6532', 'community', 'Awele Okonkwo', true, 'Welcome to the community! 🎉 This is the place to ask questions, share your progress and help each other. No question is too small. Post at least once this week and tell us what you''re working on.', true),
  ('379f593e-8089-d13b-a503-35eaa604136f', 'presence', 'Awele Okonkwo', true, 'Welcome to the Critique Wall. Your first step: post a two-minute video introducing yourself as you would to a new board. Don’t polish it. It’s your “before” picture, and you’ll be surprised how far you come.

Paste a link to your video (unlisted YouTube, Google Drive or similar) with one line on what you’d like feedback on.', true),
  ('9aa30487-e5d3-b472-accd-86fef21c54a2', 'portfolio', 'Awele Okonkwo', true, 'This is where finished sprint work lives. When your team completes a Studio Sprint, post a short summary: the brief (without confidential details), your recommendation and what the client said. Add a link to your portfolio page.

Once a month, Portfolio Friday features the strongest work from each sprint.', true),
  ('96b5203f-c907-b459-bfbf-c3e8d99f30ad', 'faculty', 'Awele Okonkwo', true, 'Faculty Lounge: private to faculty and the Programme Director. Use it for sprint planning, marking moderation and arranging cover when work or travel calls you away. Client information shared here stays here.', true)
on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- 2. Events: coaching sessions, hangouts and live events, and who has booked
-- ---------------------------------------------------------------------------
create table if not exists public.events (
  id text primary key default substr(md5(random()::text), 1, 8),
  space text not null,
  title text not null,
  starts_at timestamptz not null,
  mins integer not null default 60,
  host text not null default '',
  description text not null default '',
  seats integer not null default 20 check (seats >= 0),
  price numeric(12,2) not null default 0,
  currency text not null default 'NGN' check (currency in ('NGN','USD')),
  taken integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.events enable row level security;
drop policy if exists "anyone reads events" on public.events;
create policy "anyone reads events" on public.events for select to anon, authenticated using (true);
drop policy if exists "team manages events" on public.events;
create policy "team manages events" on public.events for all to authenticated
  using (public.is_app_admin('editor')) with check (public.is_app_admin('editor'));

-- Sessions carried over from the single-file app. Check the dates in Table Editor > events.
insert into public.events (id, space, title, starts_at, mins, host, description, seats, price, currency) values
  ('fgcuk6b', 'coaching', '1:1 Business clarity session', '2026-11-30T09:00:00.000Z', 60, 'Awele Okonkwo', 'Bring your idea or business and leave with three clear next steps.', 4, 30000, 'NGN'),
  ('tctn5pv', 'coaching', 'Pitch and plan review', '2026-12-05T13:00:00.000Z', 45, 'Awele Okonkwo', 'Send your one-page plan or pitch deck ahead and get detailed feedback.', 3, 20000, 'NGN'),
  ('xrw4kg0', 'hangout', 'Friday founders'' hangout', '2026-11-28T18:00:00.000Z', 60, 'Community team', 'Grab a drink and meet other members. Cameras optional.', 30, 0, 'NGN'),
  ('wqow203', 'hangout', 'Accountability circle', '2026-12-03T06:00:00.000Z', 45, 'Fatima Bello', 'Share your goal for the week and check in on last week.', 12, 0, 'NGN'),
  ('abbx3tw', 'live', 'Webinar: Pricing for profit in 2027', '2026-12-01T17:00:00.000Z', 90, 'Awele Okonkwo', 'How to set prices that keep you in business, with live Q&A.', 200, 0, 'NGN'),
  ('8l655o1', 'live', 'Ask me anything with Awele', '2026-12-08T17:00:00.000Z', 60, 'Awele Okonkwo', 'Bring your hardest business questions.', 200, 0, 'NGN'),
  ('kq93fge', 'coaching', 'Money clarity session', '2026-12-02T10:00:00.000Z', 60, 'Awele Okonkwo', 'A one-to-one financial health check: we look at your income, spending, savings and debts, and you leave with a simple budget framework and your first three money goals.', 4, 30000, 'NGN'),
  ('gup6nb3', 'coaching', 'Leadership 1:1: your first 60 days', '2026-12-07T15:00:00.000Z', 60, 'Awele Okonkwo', 'For new managers and founders building a team. Bring your biggest leadership challenge and leave with a focused 60-day plan for delegation, feedback and team rhythm.', 4, 30000, 'NGN'),
  ('do2ulx7', 'live', 'AMLD open evening: meet the Professors of Practice', '2026-12-04T18:00:00.000Z', 90, 'Awele Okonkwo', 'See how Studio Sprints work, meet some of the faculty and ask about the first sprint dates. Free.', 150, 0, 'NGN'),
  ('z6byzux', 'live', 'Executive Presence information session', '2026-12-09T18:00:00.000Z', 60, 'Awele Okonkwo', 'What the Foundation and the live Cohort include, who each one suits and how to apply. Free.', 150, 0, 'NGN'),
  ('7tzdq97', 'live', 'Monthly Leadership Fireside', '2026-12-16T18:00:00.000Z', 60, 'Awele Okonkwo', 'A live conversation with a guest executive about leading at the top, open to all AMLD and Executive Presence learners.', 200, 0, 'NGN')
on conflict (id) do nothing;

create table if not exists public.event_bookings (
  event_id text not null references public.events(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null default 'booked' check (status in ('booked','awaiting payment','paid','cancelled')),
  created_at timestamptz not null default now(),
  primary key (event_id, user_id)
);
alter table public.event_bookings enable row level security;
drop policy if exists "people see own bookings" on public.event_bookings;
create policy "people see own bookings" on public.event_bookings for select to authenticated using (user_id = auth.uid());
drop policy if exists "team manages bookings" on public.event_bookings;
create policy "team manages bookings" on public.event_bookings for all to authenticated
  using (public.is_app_admin('editor')) with check (public.is_app_admin('editor'));

-- Book a place (paid sessions are held as "awaiting payment" until the team confirms)
create or replace function public.book_event(p_event text)
returns text language plpgsql security definer set search_path = public as $$
declare ev public.events; v_status text;
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  select * into ev from public.events where id = p_event for update;
  if not found then raise exception 'This event no longer exists'; end if;
  if ev.starts_at < now() then raise exception 'This event has already taken place'; end if;
  if exists (select 1 from public.event_bookings b where b.event_id = p_event and b.user_id = auth.uid() and b.status <> 'cancelled') then
    return (select status from public.event_bookings where event_id = p_event and user_id = auth.uid());
  end if;
  if ev.taken >= ev.seats then raise exception 'Sorry, this event is fully booked'; end if;
  v_status := case when ev.price > 0 then 'awaiting payment' else 'booked' end;
  insert into public.event_bookings (event_id, user_id, status) values (p_event, auth.uid(), v_status)
  on conflict (event_id, user_id) do update set status = excluded.status, created_at = now();
  update public.events set taken = taken + 1 where id = p_event;
  return v_status;
end $$;
revoke all on function public.book_event(text) from public, anon;
grant execute on function public.book_event(text) to authenticated;

create or replace function public.cancel_event_booking(p_event text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  update public.event_bookings set status = 'cancelled'
   where event_id = p_event and user_id = auth.uid() and status <> 'cancelled';
  if found then update public.events set taken = greatest(taken - 1, 0) where id = p_event; end if;
end $$;
revoke all on function public.cancel_event_booking(text) from public, anon;
grant execute on function public.cancel_event_booking(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Enquiries: one inbox for every form in the special spaces
--    challenge (Crucible Circle), eoi (expert interest), consult (Business Solutions),
--    coaching (discovery call), cohort / faculty / corporate / brief (AMLD and Executive Presence),
--    intro (introduction to an affiliate expert). Anyone may send one; only the team reads them all.
-- ---------------------------------------------------------------------------
create sequence if not exists public.enquiry_ref_seq start 13;
create table if not exists public.enquiries (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('challenge','eoi','consult','coaching','cohort','faculty','corporate','brief','intro')),
  ref text unique,
  user_id uuid default auth.uid() references auth.users(id) on delete set null,
  name text not null check (length(name) between 1 and 160),
  email text not null check (length(email) between 3 and 200),
  phone text check (phone is null or length(phone) <= 60),
  org text check (org is null or length(org) <= 200),
  role text check (role is null or length(role) <= 160),
  details jsonb not null default '{}'::jsonb check (length(details::text) <= 20000),
  status text not null default 'Received',
  scheduled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists enquiries_kind_idx on public.enquiries (kind, created_at desc);
drop trigger if exists enquiries_touch on public.enquiries;
create trigger enquiries_touch before update on public.enquiries for each row execute function public.touch_updated_at();

create or replace function public.enquiries_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();                       -- null for visitors who are not signed in
  new.status := 'Received'; new.notes := null; new.scheduled_at := null;
  new.ref := case new.kind when 'challenge' then 'CC' when 'eoi' then 'EX' when 'consult' then 'BS'
                           when 'coaching' then 'PC' when 'intro' then 'IN' else 'AM' end
             || '-' || lpad(nextval('public.enquiry_ref_seq')::text, 4, '0');
  return new;
end $$;
drop trigger if exists enquiries_before_insert on public.enquiries;
create trigger enquiries_before_insert before insert on public.enquiries for each row execute function public.enquiries_before_insert();

alter table public.enquiries enable row level security;
drop policy if exists "anyone sends an enquiry" on public.enquiries;
create policy "anyone sends an enquiry" on public.enquiries for insert to anon, authenticated with check (true);
drop policy if exists "people read own enquiries" on public.enquiries;
create policy "people read own enquiries" on public.enquiries for select to authenticated using (user_id = auth.uid());
drop policy if exists "admins manage enquiries" on public.enquiries;
create policy "admins manage enquiries" on public.enquiries for all to authenticated
  using (public.is_app_admin('admin')) with check (public.is_app_admin('admin'));
grant usage on sequence public.enquiry_ref_seq to anon, authenticated;

-- The public Challenge board: the question and where it stands, never the contact or the details.
create or replace function public.challenge_board()
returns table (ref text, title text, sector text, ctype text, status text, who text, session_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = public as $$
  select e.ref, e.details ->> 'title', e.details ->> 'sector', e.details ->> 'type', e.status,
    case when coalesce((e.details ->> 'private')::boolean, true)
      then (case when e.details ->> 'orgType' in ('Government','Public institution') then 'A public body' else 'An organisation' end)
           || ' in ' || coalesce(e.details ->> 'sector', 'its sector')
      else e.org end,
    e.scheduled_at, e.created_at
  from public.enquiries e
  where e.kind = 'challenge' and e.status not in ('Received','Declined')
  order by e.created_at desc;
$$;
grant execute on function public.challenge_board() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. Affiliate experts
-- ---------------------------------------------------------------------------
create table if not exists public.affiliates (
  user_id uuid primary key default auth.uid() references auth.users(id) on delete cascade,
  expertise text not null check (length(expertise) between 2 and 160),
  category text not null,
  offer text not null check (length(offer) between 2 and 2000),
  rate text check (rate is null or length(rate) <= 120),
  status text not null default 'pending' check (status in ('pending','approved','declined')),
  code text unique,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists affiliates_touch on public.affiliates;
create trigger affiliates_touch before update on public.affiliates for each row execute function public.touch_updated_at();
alter table public.affiliates enable row level security;
drop policy if exists "people apply" on public.affiliates;
create policy "people apply" on public.affiliates for insert to authenticated
  with check (user_id = auth.uid() and status = 'pending' and code is null);
drop policy if exists "people read own application" on public.affiliates;
create policy "people read own application" on public.affiliates for select to authenticated using (user_id = auth.uid());
drop policy if exists "admins manage affiliates" on public.affiliates;
create policy "admins manage affiliates" on public.affiliates for all to authenticated
  using (public.is_app_admin('admin')) with check (public.is_app_admin('admin'));

-- When an admin approves someone, give them a referral code (first name + rate), e.g. KEMI20
create or replace function public.affiliates_code() returns trigger
language plpgsql security definer set search_path = public as $$
declare base text; n int := 0;
begin
  if new.status = 'approved' and new.code is null then
    select upper(regexp_replace(split_part(coalesce(p.name, 'AFF'), ' ', 1), '[^A-Za-z]', '', 'g')) into base
      from public.profiles p where p.user_id = new.user_id;
    base := coalesce(nullif(base, ''), 'AFF') || '20';
    new.code := base;
    while exists (select 1 from public.affiliates a where a.code = new.code and a.user_id <> new.user_id) loop
      n := n + 1; new.code := base || n;
    end loop;
  end if;
  return new;
end $$;
drop trigger if exists affiliates_code on public.affiliates;
create trigger affiliates_code before insert or update of status on public.affiliates for each row execute function public.affiliates_code();

create or replace function public.affiliate_experts()
returns table (profile_id uuid, name text, city text, business text, skills text[], expertise text, category text, offer text, rate text)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, p.city, p.business, p.skills, a.expertise, a.category, a.offer, a.rate
  from public.affiliates a join public.profiles p on p.user_id = a.user_id
  where a.status = 'approved' and p.status = 'Active'
  order by p.name;
$$;
grant execute on function public.affiliate_experts() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Member database: what members choose to show each other
-- ---------------------------------------------------------------------------
alter table public.profiles add column if not exists listed boolean not null default true;

create or replace function public.member_directory()
returns table (profile_id uuid, name text, city text, headline text, business text, stage text, skills text[], bio text, joined_at timestamptz, is_expert boolean, is_me boolean)
language sql stable security definer set search_path = public as $$
  select p.id, p.name, coalesce(p.city, ''), coalesce(p.headline, ''), coalesce(p.business, ''), coalesce(p.stage, ''),
    case when auth.uid() is null then '{}'::text[] else p.skills end,
    case when auth.uid() is null then null else p.bio end,
    p.joined_at,
    exists (select 1 from public.affiliates a where a.user_id = p.user_id and a.status = 'approved'),
    p.user_id = auth.uid()
  from public.profiles p
  where p.status = 'Active' and p.listed and p.user_id is not null
  order by p.name;
$$;
grant execute on function public.member_directory() to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. eBooks: free ones go on your shelf when you sign in; paid ones after Paystack confirms
--    Put each eBook's PDF link in Table Editor > ebooks > pdf_url. Only owners can open it.
-- ---------------------------------------------------------------------------
create table if not exists public.ebooks (
  id text primary key,
  title text not null,
  price numeric(12,2) not null default 0,
  currency text not null default 'NGN' check (currency in ('NGN','USD')),
  pdf_url text,
  updated_at timestamptz not null default now()
);
alter table public.ebooks enable row level security;
drop policy if exists "team manages ebooks" on public.ebooks;
create policy "team manages ebooks" on public.ebooks for all to authenticated
  using (public.is_app_admin('editor')) with check (public.is_app_admin('editor'));
insert into public.ebooks (id, title, price, currency) values
  ('eb1', 'The Strategic Advisor’s Framework', 0, 'NGN'),
  ('eb2', 'Finding Meaning in Life', 5000, 'NGN'),
  ('eb3', 'Power in What You Know', 5000, 'NGN'),
  ('eb4', 'The Entrepreneurial Mindset', 6500, 'NGN'),
  ('eb5', 'Leading Yourself First', 7500, 'NGN'),
  ('eb6', 'Pricing for Profit', 4500, 'NGN')
on conflict (id) do update set title = excluded.title, price = excluded.price, currency = excluded.currency;

create table if not exists public.ebook_shelf (
  user_id uuid not null references auth.users(id) on delete cascade,
  ebook_id text not null references public.ebooks(id) on delete cascade,
  how text not null default 'free' check (how in ('free','paid','granted')),
  amount numeric(12,2),
  reference text unique,
  created_at timestamptz not null default now(),
  primary key (user_id, ebook_id)
);
alter table public.ebook_shelf enable row level security;
drop policy if exists "people see own shelf" on public.ebook_shelf;
create policy "people see own shelf" on public.ebook_shelf for select to authenticated using (user_id = auth.uid());
drop policy if exists "admins manage shelves" on public.ebook_shelf;
create policy "admins manage shelves" on public.ebook_shelf for all to authenticated
  using (public.is_app_admin('admin')) with check (public.is_app_admin('admin'));

create or replace function public.get_free_ebook(p_ebook text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'Please sign in first'; end if;
  if not exists (select 1 from public.ebooks b where b.id = p_ebook and b.price = 0) then raise exception 'This eBook is not free'; end if;
  insert into public.ebook_shelf (user_id, ebook_id, how) values (auth.uid(), p_ebook, 'free') on conflict do nothing;
end $$;
revoke all on function public.get_free_ebook(text) from public, anon;
grant execute on function public.get_free_ebook(text) to authenticated;

create or replace function public.ebook_pdf(p_ebook text)
returns text language sql stable security definer set search_path = public as $$
  select b.pdf_url from public.ebooks b
  where b.id = p_ebook and (public.is_app_admin('editor')
     or exists (select 1 from public.ebook_shelf s where s.ebook_id = b.id and s.user_id = auth.uid()));
$$;
grant execute on function public.ebook_pdf(text) to authenticated;

-- Called only by the paystack-verify Edge Function after Paystack confirms the payment
create or replace function public.apply_ebook_payment(p_user uuid, p_ebook text, p_amount numeric, p_currency text, p_reference text)
returns void language plpgsql security definer set search_path = public as $$
declare b public.ebooks;
begin
  select * into b from public.ebooks where id = p_ebook;
  if not found then raise exception 'eBook % not found', p_ebook; end if;
  if p_currency <> b.currency then raise exception 'This eBook is paid in %', b.currency; end if;
  if p_amount < b.price then raise exception 'Amount % is below the price of %', p_amount, p_ebook; end if;
  insert into public.ebook_shelf (user_id, ebook_id, how, amount, reference) values (p_user, p_ebook, 'paid', p_amount, p_reference);
end $$;
revoke all on function public.apply_ebook_payment(uuid,text,numeric,text,text) from public, anon, authenticated;
grant execute on function public.apply_ebook_payment(uuid,text,numeric,text,text) to service_role;
