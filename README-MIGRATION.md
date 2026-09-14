# Haja-Naar migration

This project is migrated from AppDeploy to Vercel + Supabase.

## Environment

Set the following environment variables in Vercel and in local development:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_EMAIL`

Do not commit real credentials.

## Database

Run `supabase-schema.sql` in the Supabase SQL editor before using the application.

## Local development

```bash
npm install
npm run dev
```

## Production

Deploy the repository to Vercel. Configure the environment variables in the Vercel project settings, then redeploy.
