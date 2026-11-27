# Awelen Community: progress and handover

This file is the project's memory. Read it at the start of every session and update it at the end.

## Where things stand (20 November 2026)

**Phase 3 (learning and payments) is built.** Awele needs to: run the Phase 3 SQL, create the `paystack-verify` Edge Function, and add the Paystack keys (see "Payments setup").
- Course page: full-width course banner, an access box, the current lesson, the course outline with locks and progress, downloads list.
- Access rules (enforced by Supabase, not just the page): free courses start with one click after sign-in; paid courses unlock after payment; AMLD and Executive Presence courses are by application (an admin adds an enrolment with plan `granted`).
- Lessons open one after another. Video (YouTube, Vimeo, Google Drive, Bunny, or a video file), PDF, notes, and written reflections for "quiz" lessons. Media lives in the `lesson_media` table, readable only by enrolled members.
- Payments: Paystack (card, bank, USSD) confirmed on the server by the `paystack-verify` Edge Function, which checks the amount with Paystack before unlocking. Pay in full or by installments (Starting Your New Idea: 3 × ₦18,000; Leading Yourself First: 2 × ₦21,000). Bank transfer and LinPay: the member sends a notice (`payment_requests`); an admin sets status to `confirmed` in Table Editor and the course unlocks automatically.
- My account lists the member's courses with progress.
- Tested: SQL run twice on a local Postgres with Supabase-like roles (payments, installments, double-use of a reference, overpaying, self-enrolment and unpaid lesson access all checked). Pages tested in a browser against stand-ins for Supabase and Paystack.
- Bank details and the LinPay link are empty in `src/data/seed.json` (`payments`). Until filled, the bank-transfer box says to contact us for details.
- Lesson videos and PDFs are not added yet: add rows to `lesson_media` (lesson ids are in `src/data/seed.json`). The admin portal (Phase 5) will make this a simple form.

**Phase 2 (public side) is built.** Awele needs to run the Supabase script once (see "Supabase setup" below).
- Member accounts with Supabase Auth: create account, sign in, forgot password, reset-password page (`/reset-password`), My account page (`/account`), sign out. A profile row is created automatically at sign-up by a database trigger.
- Exit sign-up form for visitors (mouse leaves the top of the window on computers; after 60 seconds or the 4th page on phones). Saved through the `register_visitor` function. Returning visitors and members get "Thanks for visiting again". "Not now" pauses the form for 3 days.
- Welcome page with "How to find your way around" and the 9 community guidelines.
- Announcements read from Supabase (`announcements` table, 4 carried over), with category filters. Falls back to the built-in list if the table is empty.
- Contact page with details and a message form saved to `contact_messages`.
- Links page.
- Tested in a browser against a stand-in for Supabase (the build workspace cannot reach supabase.co). Live check to be done on Vercel.

**Phase 1 (foundation) is done.**
- New React + Vite + TypeScript project, ready for Vercel.
- The look is carried over unchanged: `src/styles/app.css` is the original stylesheet, and components reuse its class names.
- Shell built in React: top bar, home page hero banner (with the photo in the yellow ring), user bar, sidebar with categories, tracks and spaces, and footer.
- Pages: Welcome, every space (headline and description), All tracks, each track with its courses, and each course (title, price, module and lesson count).
- Site content comes from `src/data/seed.json`, exported from the original build.
- Supabase client is set up in `src/lib/supabase.ts`. It reads the URL and key from `.env.production` / `.env.development` (or Vercel environment variables, which take priority).
- The original single-file build (Awelen_Community_Edited_3.html) is the blueprint. It is kept privately by Awele, not in this public repository, because it contains the admin passcode check. Upload it to the session when a phase needs it.

## Phase 4: community and special spaces (27 November 2026)
**Built and pushed.** Awele needs to run `supabase/migrations/20261127_phase4_community.sql` once (after the courses_usd script), and redeploy `paystack-verify` (it now also handles eBooks).
- **Posts:** Community, Introduce yourself (with the template button), Portfolio Showcase, Faculty Lounge (team only) and the Executive Presence Critique Wall (EP learners and the team). Comments, likes, pin and delete for the team; members delete their own. Awele's four opening posts are carried over; the sample members' posts are not.
- **Events:** Hangout, Live events and Private coaching sessions read from the `events` table (11 carried over: check their dates in Table Editor). Free events book straight away; paid coaching sessions are held as "awaiting payment" and the team confirms (set status to `paid` in `event_bookings`). Members can release a place.
- **Private coaching & mentoring:** Overview, Financial coaching, Leadership coaching (each area opens at /space/coaching/<programme>/<area>), Book a session, and the free discovery-call form.
- **Member database:** listed members (visitors see names, headline, city and stage only). "Edit my profile" with a "Show me in the Member database" switch.
- **Affiliate members:** Find an expert (approved affiliates), Request an introduction, Apply to be an affiliate; the Affiliate marketing tab with the courses and commission. When an admin sets an application to `approved`, a referral code is made (e.g. KEMI20) and the member sees their links. Not yet: counting clicks and referred sales from `?ref=` links, and payouts.
- **The Crucible Circle:** About, Submit a challenge (no account needed), the public Challenge board (shows a challenge once the team moves it past Received; private organisations show as "An organisation in <sector>"), Join as an expert.
- **Business Solutions:** services, Book a consultation, and the member's own requests.
- **eBook Collection:** designed covers, search and topics; free eBooks go on the member's shelf; paid eBooks are bought with Paystack (naira) and confirmed by `paystack-verify`. Put each PDF link in Table Editor > ebooks > pdf_url.
- **AMLD Programme** (Overview, Studio Sprints, Faculty, For organisations) and **Executive Presence** (Overview, Curriculum, The Cohort, Critique Wall, Apply) with the four application forms.
- **All forms** (challenges, expert interest, consultations, discovery calls, programme applications, introductions) go to one table, `enquiries`, each with a reference (CC-, EX-, BS-, PC-, AM-, IN-). The team reads them in Supabase > Table Editor > enquiries until the admin portal arrives; changing `status` there is what members see.
- **Courses:** lesson summaries ("What this lesson covers"), module outcomes, worksheets and deliverables, Part headings for Business Model Development 1, Expand/Collapse all, from the 27 Nov single-file app.
- **Sidebar:** Track 5 (Solve) removed. Business Solutions stays under Solve. Track 4's page lists Executive Presence, Portfolio Showcase and The Crucible Circle under its courses.
- Tested: the SQL on a local Postgres (scripts in order, run twice) with security checks for visitors, members, an EP learner and an admin; every space and tab rendered in a browser; two forms sent and checked.

## Course update and dollar fees (27 November 2026)
**Built and pushed.** Awele needs to run `supabase/migrations/20261127_courses_usd.sql` once in the SQL Editor (after Phase 2 and 3), and redeploy the `paystack-verify` Edge Function with the new code.
- 24 courses across 5 tracks from the 27 Nov single-file app, including Deciding in the Fog. Lesson summaries show under each lesson title.
- Fees in US dollars, pay in full or 3 installments (e.g. $50 or 3 × $18.34). Executive Presence Foundation and Executive Peer Circle are now paid ($150); the AMLD sprints and Executive Presence Cohort stay by application.
- Money columns now take cents (numeric 12,2). Each course, payment and payment request carries its currency; the server stamps it from the course, so a member cannot change it.
- `paystack-verify` checks the Paystack payment is in the course's own currency. Paystack must have USD switched on for the account before dollar card payments work.
- Tested on a local Postgres: scripts run twice cleanly on top of Phase 3; full payment, 3 installments, too-small amounts, reused references, application-only courses and a confirmed dollar bank transfer all checked.
- Not yet carried over from the single-file app: promo codes and the grace period for missed installments (`promos`, `payCfg`). These come with the admin portal.

## Next phases

2. **Public side.** Built (see above). Still to add when the admin portal arrives: a screen for reading visitor sign-ups and contact messages (they can be read in Supabase > Table Editor meanwhile).
3. **Learning.** Built (see above). Later: certificates, a Paystack webhook as a backup confirmation, course outlines moved into the database for editing.
4. **Community and special spaces.** Built (see above).
5. **Admin portal.** Team sign-in through Supabase (admin and editor roles), content editing, people, money, visitors list. Then switch on the locked spaces for public launch.

## Decisions made
- Front end: React + Vite + TypeScript. Back end: Supabase (no NestJS for now).
- Hosting: Vercel, deployed from GitHub. Work happens on branches; `main` is the live version.
- Admin access lives in the footer and opens only after a team sign-in.
- Locked spaces are left open while building; they switch on at public launch.

## Supabase setup
- Project URL: https://gbxdkujdoazifcqcfzdr.supabase.co (publishable key is in `.env.production` and `.env.development`; it is safe to be public).
- Run `supabase/migrations/20261120_phase2_public_side.sql` in Supabase > SQL Editor. Safe to run again. It makes awelenkem@businessarchitectz.com the first admin.
- Authentication > URL Configuration: Site URL `https://the-awelen-communit.vercel.app`, and add `https://the-awelen-communit.vercel.app/**` to Redirect URLs. Needed for the confirmation and password reset links.
- Supabase's built-in email sender is limited to a few emails an hour. Before launch, connect a proper email service (Authentication > Emails > SMTP settings), for example Resend or Brevo.

## Payments setup
1. Run `supabase/migrations/20261120_phase3_learning.sql` in the SQL Editor (after Phase 2).
2. Paystack dashboard > Settings > API Keys: copy the public key (pk_test_ to start) and the secret key (sk_test_).
3. Vercel > Settings > Environment Variables: add `VITE_PAYSTACK_PUBLIC_KEY` = the public key, then redeploy.
4. Supabase > Edge Functions > Secrets: add `PAYSTACK_SECRET_KEY` = the secret key. Never put the secret key in the code or in Vercel.
5. Supabase > Edge Functions > Deploy a new function > Via Editor: name it `paystack-verify`, paste `supabase/functions/paystack-verify/index.ts`, deploy.
6. Test with Paystack's test card, then switch both keys to live ones when ready.

## Setup notes
- Local run: `npm install`, then `npm run dev`.
- Supabase keys: copy `.env.example` to `.env.local` locally, and add the same two values in Vercel under Project Settings > Environment Variables.
- `vercel.json` sends every address to the app, so links like `/track/t-exec` work on refresh.

## Session log
- 2026-11-27: Phase 4 built (community and special spaces), Track 5 removed from the sidebar, course outlines brought fully in line with the 27 Nov single-file app. Next: Awele runs the courses_usd and phase4 SQL and redeploys paystack-verify; then Phase 5 (admin portal: enquiries inbox, events, bookings, affiliates, eBook files, promos).
- 2026-11-27: Courses, tracks and USD fees brought into the React app from the 27 Nov single-file app; currency and cents added to payments. Next: Awele runs the new SQL and redeploys paystack-verify, then adds Paystack keys; then Phase 4 (community and special spaces).
- 2026-11-24: All courses updated track by track in the single-file app (Edited_11) and saved to `docs/reference/` with a JSON export of tracks and courses. Courses now carry USD fees. Next: bring the new courses into `src/data/seed.json` and the database, and add a currency field to payments and `paystack-verify` (the Phase 3 installment plans for Starting Your New Idea and Leading Yourself First no longer apply; those courses were replaced or removed). See `docs/reference/README.md`.
- 2026-11-20: Phase 3 learning and payments built and pushed. Awele ran the Phase 3 SQL (step 1). Paystack (steps 2 to 5) postponed to Monday 23 November; until then only bank transfer / LinPay notices show, which works without Paystack.
- 2026-11-20: Phase 2 public side built and pushed. Awele ran the Supabase script and set URL Configuration. Next: live test on Vercel, then Phase 3 (learning).
- 2026-11-20: Phase 1 foundation built and saved to GitHub (Okonkwo3434/The-Awelen-Communit). Deployed on Vercel by Awele. Next: Phase 2 (public side).
