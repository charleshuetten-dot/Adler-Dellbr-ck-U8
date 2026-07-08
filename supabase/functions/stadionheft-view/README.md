# Edge Function: stadionheft-view (HOTFIX 19 digital – Eltern-Ansicht)

Liefert das **digitale Stadionheft** für Eltern – öffentlich lesbar (wie die
Matchday-Karte / der Read-only-Ticker), aber DSGVO-sauber:

- **Nur veröffentlichte Hefte** (`stadionheft.published = true`) werden ausgeliefert.
- **Namen serverseitig maskiert** (`maskName`: "Max Mustermann" → "Max M."). Der
  Klarname verlässt den Server nie.
- **Fotos nur mit ausdrücklicher Einwilligung**: signierte URL (Bucket
  `spielerfotos`, 1 h gültig) wird ausschließlich erzeugt, wenn
  `kader.foto_stadionheft_ok = true`. Sonst `foto_url = null` → Client zeigt Initialen.
- `verify_jwt = false` (public). Schreibt nichts; nur Lesen über service_role
  (RLS-bypass, aber strikt minimierte Projektion).

## Response
```json
{
  "published": true,
  "heft": { "titel": "...", "einleitung": "...", "kommentar": "...",
            "fokus": { "name": "Max M.", "nr": 7, "foto_url": null, "text": "..." },
            "updated_at": "..." },
  "spieler": [ { "name": "Max M.", "nr": 7, "lieblingsposition": "...",
                 "tw": false, "spitzname": "Blitz", "foto_url": null } ]
}
```
Ist kein Heft veröffentlicht: `{ "published": false }`.

## Zugehörige Migration (stadionheft_table_and_photo_consent)
```sql
create table if not exists public.stadionheft (
  team text primary key default 'adler1',
  titel text default 'Stadionheft U9',
  einleitung text default '',
  fokus_spieler_id bigint,
  fokus_text text default '',
  kommentar text default '',
  published boolean not null default false,
  updated_at timestamptz not null default now()
);
alter table public.stadionheft enable row level security;
create policy stadionheft_trainer_all on public.stadionheft
  for all to authenticated using (is_trainer()) with check (is_trainer());
-- Fokus-FK: beim Löschen des Kindes -> NULL
alter table public.stadionheft add constraint stadionheft_fokus_fk
  foreign key (fokus_spieler_id) references public.kader(id) on delete set null;
-- Consent-Flag pro Kind (Default AUS), getrennt von der FUT-/Eigenes-Kind-Einwilligung
alter table public.kader add column if not exists foto_stadionheft_ok boolean not null default false;
```

Der Trainer setzt `foto_stadionheft_ok` pro Kind bewusst (nach analog eingeholter
Eltern-Zustimmung). Default AUS bedeutet: **kein Kind ist je unbeabsichtigt exponiert.**
