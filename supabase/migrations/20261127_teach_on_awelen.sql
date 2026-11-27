-- Teach on Awelen: creator sign-ups from the /plans page arrive in the admin inbox as enquiries of kind 'creator'
-- (reference numbers start with CR). Run after 20261127_phase5_admin.sql. Safe to run again.

alter table public.enquiries drop constraint if exists enquiries_kind_check;
alter table public.enquiries add constraint enquiries_kind_check
  check (kind in ('challenge','eoi','consult','coaching','cohort','faculty','corporate','brief','intro','creator'));

create or replace function public.enquiries_before_insert() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  new.user_id := auth.uid();                       -- null for visitors who are not signed in
  new.status := 'Received'; new.notes := null; new.scheduled_at := null;
  new.ref := case new.kind when 'challenge' then 'CC' when 'eoi' then 'EX' when 'consult' then 'BS'
                           when 'coaching' then 'PC' when 'intro' then 'IN' when 'creator' then 'CR' else 'AM' end
             || '-' || lpad(nextval('public.enquiry_ref_seq')::text, 4, '0');
  return new;
end $$;
