# Awelen Community

The learning community platform for Awelen Entrepreneurs: courses in tracks, coaching, events, community spaces and programmes such as AMLD and The Crucible Circle.

Built with React, Vite and TypeScript, with Supabase for the database and sign-in, and hosted on Vercel.

## Run it on your computer
1. Install Node.js (version 20 or newer).
2. In this folder run `npm install`, then `npm run dev`, and open the address it shows.

## Connect Supabase
Copy `.env.example` to `.env.local` and paste your Project URL and anon public key from Supabase > Project Settings > API. On Vercel, add the same two values under Project Settings > Environment Variables.

## Publish
Vercel builds the site automatically from the `main` branch on GitHub (build command `npm run build`, output folder `dist`).

See `PROGRESS.md` for what is done and what comes next.
