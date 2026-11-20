# Awelen Community: progress and handover

This file is the project's memory. Read it at the start of every session and update it at the end.

## Where things stand (20 November 2026)

**Phase 1 (foundation) is done.**
- New React + Vite + TypeScript project, ready for Vercel.
- The look is carried over unchanged: `src/styles/app.css` is the original stylesheet, and components reuse its class names.
- Shell built in React: top bar, home page hero banner (with the photo in the yellow ring), user bar, sidebar with categories, tracks and spaces, and footer.
- Pages: Welcome, every space (headline and description), All tracks, each track with its courses, and each course (title, price, module and lesson count).
- Site content comes from `src/data/seed.json`, exported from the original build.
- Supabase client is set up in `src/lib/supabase.ts`. It reads the URL and anon key from environment variables.
- The original single-file build (Awelen_Community_Edited_3.html) is the blueprint. It is kept privately by Awele, not in this public repository, because it contains the admin passcode check. Upload it to the session when a phase needs it.

## Next phases

2. **Public side.** Announcements, Contact, exit sign-up form (visitors table), member sign-up and sign-in with Supabase Auth, "welcome back" thank-you for returning visitors.
3. **Learning.** Course outline, modules, lessons (video, PDF, quiz), progress saved in Supabase, payments (Paystack, LinPay) with server-side confirmation via a Supabase Edge Function.
4. **Community and special spaces.** Posts, events and bookings, Member database, Affiliates, eBooks, The Crucible Circle, Business Solutions, AMLD, Executive Presence, Peer-Circle.
5. **Admin portal.** Team sign-in through Supabase (admin and editor roles), content editing, people, money, visitors list. Then switch on the locked spaces for public launch.

## Decisions made
- Front end: React + Vite + TypeScript. Back end: Supabase (no NestJS for now).
- Hosting: Vercel, deployed from GitHub. Work happens on branches; `main` is the live version.
- Admin access lives in the footer and opens only after a team sign-in.
- Locked spaces are left open while building; they switch on at public launch.

## Setup notes
- Local run: `npm install`, then `npm run dev`.
- Supabase keys: copy `.env.example` to `.env.local` locally, and add the same two values in Vercel under Project Settings > Environment Variables.
- `vercel.json` sends every address to the app, so links like `/track/t-exec` work on refresh.

## Session log
- 2026-11-20: Phase 1 foundation built and saved.
