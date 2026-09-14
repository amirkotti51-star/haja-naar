# Haja-Naar

Migration of Haja-Naar from AppDeploy to Vercel + Supabase.

## Structure

- `src/` — frontend application
- `api/` — Vercel serverless API
- `supabase-schema.sql` — database schema and policies
- `vercel.json` — Vercel configuration

## Local setup

1. Copy `.env.example` to `.env.local`.
2. Set the Supabase URL and keys in `.env.local`.
3. Run `npm install`.
4. Run `npm run dev`.

Never commit `.env`, `.env.local`, or Supabase service-role credentials.