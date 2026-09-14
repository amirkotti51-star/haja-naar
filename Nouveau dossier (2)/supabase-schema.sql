-- Haja-Naar / خِدمة — Supabase database schema
create extension if not exists pgcrypto;

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(), providerId uuid not null, providerName text not null,
  providerEmail text, providerBio text default '', providerExperience text default '', providerPhoto text,
  name text not null, category text not null, country text default 'تونس', governorate text not null, city text not null,
  description text not null, price text default '', phone text not null, whatsapp text default '', hours text default '',
  portfolio jsonb default '[]'::jsonb, active boolean default true, premium boolean default false, featured boolean default false,
  expiresAt timestamptz, createdAt timestamptz default now()
);
create table if not exists public.service_reviews (
  id uuid primary key default gen_random_uuid(), serviceId uuid not null, userId uuid not null, userName text not null,
  rating integer not null check (rating between 1 and 5), comment text not null, createdAt timestamptz default now(),
  unique(serviceId, userId)
);
create table if not exists public.service_reports (
  id uuid primary key default gen_random_uuid(), serviceId uuid not null, reason text not null, userId uuid not null, createdAt timestamptz default now()
);
create table if not exists public.service_views (
  id uuid primary key default gen_random_uuid(), serviceId uuid not null, createdAt timestamptz default now()
);
create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(), providerId uuid not null, providerName text not null, email text, status text not null default 'pending', createdAt timestamptz default now()
);
create table if not exists public.premium_requests (
  id uuid primary key default gen_random_uuid(), serviceId uuid not null, providerId uuid not null, providerName text not null,
  status text not null default 'pending', createdAt timestamptz default now(), reviewedAt timestamptz
);
create table if not exists public.premium_orders (
  id uuid primary key default gen_random_uuid(), serviceId uuid not null, providerId uuid not null, providerName text not null,
  plan text not null, price numeric(10,2) not null, days integer not null, status text not null default 'pending',
  createdAt timestamptz default now(), paidAt timestamptz, expiresAt timestamptz, paymentRef text, payUrl text, orderId text
);

create index if not exists services_provider_idx on public.services(providerId);
create index if not exists services_active_idx on public.services(active);
create index if not exists reviews_service_idx on public.service_reviews(serviceId);
create index if not exists views_service_idx on public.service_views(serviceId);
create index if not exists verification_provider_idx on public.verification_requests(providerId);
create index if not exists premium_request_service_idx on public.premium_requests(serviceId);
create index if not exists premium_order_provider_idx on public.premium_orders(providerId);

alter table public.services enable row level security;
alter table public.service_reviews enable row level security;
alter table public.service_reports enable row level security;
alter table public.service_views enable row level security;
alter table public.verification_requests enable row level security;
alter table public.premium_requests enable row level security;
alter table public.premium_orders enable row level security;

-- The app's Vercel API uses the Supabase service-role key server-side.
-- Do not create public policies for these tables unless you intentionally move data access to the browser.

insert into storage.buckets (id, name, public) values ('haja-naar', 'haja-naar', true)
on conflict (id) do update set public = true;
