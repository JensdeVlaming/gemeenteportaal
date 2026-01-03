-- seed.sql
-- Basisdata voor events, sermons en collections
-- Tijdzone: Europe/Amsterdam (CET in de voorbeelden)

begin;

-- Optioneel: schoon start
delete from public.collections;
delete from public.sermons;
delete from public.events;

-- Zondagse dienst – 2 nov 2025
with e as (
  insert into public.events (title, description, location, start_time, end_time)
  values (
    'Zondagse Eredienst',
    'Reguliere samenkomst met preek en kinderwerk.',
    'Kerkzaal',
    '2025-11-02 10:00:00+01',
    '2025-11-02 11:30:00+01'
  )
  returning id
),
s as (
  insert into public.sermons (event_id, speaker)
  select id, 'Ds. J. van Dijk' from e
  returning id
)
insert into public.collections (sermon_id, name, description)
select id, 'Diaconie', 'Collecte t.b.v. lokale noodhulp' from s
union all
select id, 'Zending', 'Collecte t.b.v. zendingswerk' from s;

-- Jeugdavond – 7 nov 2025 (geen preek)
insert into public.events (title, description, location, start_time, end_time)
values (
  'Jeugdavond',
  'Samenkomst voor jongeren 12–18 jaar.',
  'Jeugdhonk',
  '2025-11-07 19:30:00+01',
  '2025-11-07 21:30:00+01'
);

-- Zondagse dienst – 9 nov 2025
with e as (
  insert into public.events (title, description, location, start_time, end_time)
  values (
    'Zondagse Eredienst',
    'Dienst met avondmaal.',
    'Kerkzaal',
    '2025-11-09 10:00:00+01',
    '2025-11-09 11:45:00+01'
  )
  returning id
),
s as (
  insert into public.sermons (event_id, speaker)
  select id, 'Ds. M. de Boer' from e
  returning id
)
insert into public.collections (sermon_id, name, description)
select id, 'Kerkbeheer', 'Onderhoud gebouw en energie' from s
union all
select id, 'Jeugdwerk', 'Materiaal en activiteiten' from s;

-- Bidstond – 13 nov 2025 (geen preek)
insert into public.events (title, description, location, start_time, end_time)
values (
  'Bidstond',
  'Gebed voor gemeente en stad.',
  'Consistorie',
  '2025-11-13 20:00:00+01',
  '2025-11-13 21:00:00+01'
);

-- Adventsdienst – 30 nov 2025
with e as (
  insert into public.events (title, description, location, start_time, end_time)
  values (
    'Adventsdienst',
    'Eerste advent. Thema: Hoop.',
    'Kerkzaal',
    '2025-11-30 10:00:00+01',
    '2025-11-30 11:30:00+01'
  )
  returning id
),
s as (
  insert into public.sermons (event_id, speaker)
  select id, 'Gastspreker: P. Vermeulen' from e
  returning id
)
insert into public.collections (sermon_id, name, description)
select id, 'Werelddiaconaat', 'Noodhulp internationaal' from s;

-- Kerstdienst – 25 dec 2025
with e as (
  insert into public.events (title, description, location, start_time, end_time)
  values (
    'Kerstdienst',
    'Viering van de geboorte van Christus.',
    'Kerkzaal',
    '2025-12-25 10:00:00+01',
    '2025-12-25 11:30:00+01'
  )
  returning id
),
s as (
  insert into public.sermons (event_id, speaker)
  select id, 'Ds. L. Smit' from e
  returning id
)
insert into public.collections (sermon_id, name, description)
select id, 'Kerstcollecte', 'Diaconale kerstactie' from s;

-- Oudjaarsdienst – 31 dec 2025
with e as (
  insert into public.events (title, description, location, start_time, end_time)
  values (
    'Oudjaarsdienst',
    'Dankbaarheid en terugblik.',
    'Kerkzaal',
    '2025-12-31 19:00:00+01',
    '2025-12-31 20:15:00+01'
  )
  returning id
),
s as (
  insert into public.sermons (event_id, speaker)
  select id, 'Ds. J. van Dijk' from e
  returning id
)
insert into public.collections (sermon_id, name, description)
select id, 'Algemene Middelen', 'Algemene gemeentekas' from s;

-- Nieuwjaarsdienst – 1 jan 2026
with e as (
  insert into public.events (title, description, location, start_time, end_time)
  values (
    'Nieuwjaarsdienst',
    'Start van het nieuwe jaar.',
    'Kerkzaal',
    '2026-01-01 10:30:00+01',
    '2026-01-01 11:30:00+01'
  )
  returning id
),
s as (
  insert into public.sermons (event_id, speaker)
  select id, 'Ds. M. de Boer' from e
  returning id
)
insert into public.collections (sermon_id, name, description)
select id, 'Zending', 'Jaarstart gift voor zending' from s;

commit;
