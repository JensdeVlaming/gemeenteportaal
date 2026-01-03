create schema if not exists public;

-- USERS
create table if not exists public.users (
    id uuid primary key references auth.users(id) on delete cascade,
    name text,
    created_at timestamptz default now()
);

-- EVENTS
create table if not exists public.events (
    id uuid primary key default gen_random_uuid(),
    title text not null,
    description text,
    location text,
    start_time timestamptz not null,
    end_time timestamptz not null,
    created_at timestamptz default now(),
    updated_at timestamptz default now()
);

-- SERMONS
create table if not exists public.sermons (
    id uuid primary key default gen_random_uuid(),
    event_id uuid not null references public.events(id) on delete cascade,
    speaker text not null,
    created_at timestamptz default now()
);

-- COLLECTIONS
create table if not exists public.collections (
    id uuid primary key default gen_random_uuid(),
    sermon_id uuid not null references public.sermons(id) on delete cascade,
    name text not null,
    description text,
    created_at timestamptz default now()
);


-- INDEXES
create index if not exists idx_events_start_time on public.events(start_time);
create index if not exists idx_sermons_event_id on public.sermons(event_id);
create index if not exists idx_collections_sermon_id on public.collections(sermon_id);
