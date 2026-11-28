-- Awelen Community: two new courses (28 November 2026).
-- Run AFTER 20261127_courses_usd.sql. Paste this whole file into Supabase > SQL Editor and press Run.
-- Safe to run again.
--   The Apprenticeship Road (Track 1): $25, or 3 x $9.17
--   Stepping Up (Track 2):              $100, or 3 x $36.67

insert into public.courses (id, title, mode, price, currency, inst_n, inst_amt) values
  ('appr', 'The Apprenticeship Road: From Apprentice to Master Trader', 'paid', 25, 'USD', 3, 9.17),
  ('stepup', 'Stepping Up: From Great at the Work to Great at Leading It', 'paid', 100, 'USD', 3, 36.67)
on conflict (id) do update set
  title = excluded.title, mode = excluded.mode, price = excluded.price, currency = excluded.currency,
  inst_n = excluded.inst_n, inst_amt = excluded.inst_amt, updated_at = now();
