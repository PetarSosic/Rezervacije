# Build Plan — Kombi Rezervacije

Execution plan for building the app described in [`SPEC.md`](./SPEC.md), using the
agents in `.claude/agents/`.

Read `SPEC.md` first. It is the source of truth; this file is only the order of
operations.

## Status — 04.09.2026

| Phase | State |
|---|---|
| 0 · Scaffold | done |
| 1 · Data layer | done |
| 2 · Locale primitives | done |
| 3 · Domain core | done |
| 4 · Auth and RLS | done |
| 5 · Screens | done |
| 6 · Installable and offline | done — one gate deferred to Phase 9 |
| 7 · Verification gate | **done — signed off 04.09.2026** |
| 8 · Deploy | **done — signed off 05.09.2026** |
| 9 · Handover | not started |

**Phase 7 ran and found things, which is the gate working.** The domain core came
through clean — 261 tests across 16 files, identical under five timezones, and
the main leg rule, all three list modes, the filter rollup and all four sort keys
were each re-derived from SPEC and found correct. The two real defects are both
outside `src/domen/`: the **login screen's inputs are 32px tall**, below the 44px
floor, because every Phase 5 device gate ran signed in and `/prijava` is the one
screen you see logged out; and the **delete dialog and filter sheet both announce
"Close" in English** to a screen reader, while the Serbian string for it sits
unused in `tekst.ts`. Full write-up under Phase 7.

Five further deviations were documentation rather than code — most
consequentially **SPEC §9 listed CI as a service that exists when it does not**,
so nothing runs the 261 tests on push, and **SPEC §5 contradicted itself on the
destination counts** (the heading's `7 · 18 · 45` was right; two sentences in its
own body were stale).

**Both defects were fixed the same day, and `SPEC.md` and `RUNBOOK.md` were
corrected** — including the one genuine ambiguity, which the owner settled: the
destination filter is scoped to **the leg**, not the booking. The code was
already right; the spec was reworded and now states the cost outright.
`/prijava` was then **measured at 375px for the first time in the project** and
passes — zero overflow, every control 44px at 16px font. The last two hardening
items were closed the same day: inactive destinations are now refused
server-side, and `broj_putnika` has an upper bound and a digits-only parse.

**Phase 7 is signed off.** 265 tests across 16 files, identical under five
timezones; typecheck, lint and build clean; RLS verified against the live
project; and every defect the gate raised is either fixed or written into
`SPEC.md` as a decision. Phase 8 is next.

**There is one database and it is the real one.** Development and production are
the same hosted Supabase project, `biqiztxeiqmrgmngemhf`, in the EU
(`eu-central-1`, Frankfurt). `.env.local` points at it, the migrations are applied
and both seeds have run. There is no Docker and no local Supabase stack — the
`supabase/` directory has been removed and the CLI is not part of this workflow.

That means the Supabase half of Phase 8 landed early, out of order. Phase 8 is now
only Vercel, CI, monitoring and backups.

It also means every command runs against live data. `npm run db:reset` is gated
behind `POTVRDA="OBRISI SVE"` and nothing else drops anything.

**Verified at the end of Phase 5:** `npm run typecheck` clean · `npm run lint`
clean · `npm run test` 222/222 · `npm run build` succeeds (7 routes + Proxy) ·
`npm run test:tz` — **222 tests across 5 timezones, all identical**. All five
screens redirect to `/prijava` when logged out. RLS verified by curl in Phase 4:
the publishable key with no session returns `[]` from all four tables.

**Phase 5 is signed off.** The mobile gates were closed by hand in Chrome at a
375px viewport, signed in, against the real database: no horizontal scroll on
any route, no touch target under 44px, no input under 16px, and the cascade,
the ⇅ swap, the filter rollup, Dan mode and the delete guard all driven
individually. Nothing was written — counts before and after were identical.

**Phase 6 is done.** The service worker is built as its own esbuild step
(`npm run build:sw`) because `@serwist/next`'s plugin is webpack-only and this
project builds with Turbopack. The list was watched rendering with the server
process killed, and a `POST` against a dead origin was watched failing instead of
queueing. Chrome fired `beforeinstallprompt`, which is Chrome vouching for the
manifest and icons. Two Phase 5 defects surfaced on the way and were fixed:
`--font-sans` in `globals.css` referred to itself, so the whole app had been
rendering in Times New Roman, and the `dark` variant was keyed to a class
nothing ever set, so dark mode was unreachable code. Both are written up at the
end of Phase 6.

**`profiles` is the access list — 01.09.2026.** Signups were switched off in the
dashboard, and migration `0003` made membership the rule in the database rather
than a convention: every policy now tests `je_clan()` instead of `USING (true)`.
An `auth.users` row with no `profiles` row reads nothing and writes nothing.
Proven by role impersonation in a rolled-back transaction — a member sees 8
reservations and could delete 8; a stranger with a valid session sees **0** and
deletes **0**. Adding a person is now two steps, and skipping the second fails
closed: create the account in the dashboard, then insert their `profiles` row.

**Verified on the hosted project:** migrations `0000` and `0001` applied · 44
destinacije, 2 profila, 8 rezervacija, 1 settings row · RLS enabled on all four
tables with zero policies, so the publishable key returns `[]` from every table
while server-side queries are unaffected.

## Agents

| Agent | Owns | Model |
|---|---|---|
| `supabase` | Schema, Drizzle models, migrations, seeds, query layer | sonnet |
| `locale` | Serbian strings, date formatting, collation, phone normalization | sonnet |
| `domain-logic` | Main leg rule, list modes, filter + sort semantics | opus |
| `security` | Supabase Auth, sessions, `proxy.ts`, **RLS policies**, secrets | sonnet |
| `ui` | All screens, Tailwind, shadcn, mobile-first — **and** PWA, offline, install | sonnet |
| `developer` | Routes, Server Actions, Zod, wiring — **and** Vercel, CI, backups | sonnet |
| `tester` | Spec conformance, edge cases, timezone, mobile, evidence | opus |

Code quality review is handled by the built-in `/code-review` skill, not a custom
agent — no need to duplicate it.

---

## Dependency graph

```
Phase 0  Scaffold                        (main session)
            │
      ┌─────┴─────┐
      ▼           ▼
Phase 1        Phase 2                   ← these two run in parallel
supabase       locale
      │           │
      └─────┬─────┘
            ▼
Phase 3  domain-logic                     ← needs schema + Belgrade "today"
            │
            ▼
Phase 4  security                         ← needs profiles table
            │
            ▼
Phase 5  ui — screens                     ← needs logic, strings, session
            │
            ▼
Phase 6  ui — installable and offline     ← needs a working app to cache
            │
            ▼
Phase 7  tester                           ← verification gate
            │
            ▼
Phase 8  developer — deploy
            │
            ▼
Phase 9  Device smoke test + handover     (main session)
```

---

## Phase 0 — Scaffold ✅

**Agent:** none — main session. **Completed 28.08.2026.**

- `create-next-app`: TypeScript strict, App Router, Tailwind v4, ESLint
- `git remote add origin https://github.com/PetarSosic/Rezervacije.git`
  (originally `mihajloStamenkovic/Rezervacije`; moved 04.09.2026 — see Phase 8)
- Install: `drizzle-orm`, `drizzle-kit`, `postgres`, `zod`,
  `@supabase/supabase-js`, `@supabase/ssr`, `date-fns`, `libphonenumber-js`,
  `@serwist/next`
- `npx shadcn@latest init`, then add **only** `sheet dialog input button checkbox`
- Hosted Supabase project, EU (Frankfurt). Connection strings and API keys into
  `.env.local`
- `.env.example` committed; `.env.local` git-ignored
- `data/destinacije.json` is already in the repo — the destination reference data
  captured from eurotravel.rs on 27.08.2026

**Done when:** `npm run dev` serves a blank page and `tsc --noEmit` is clean.

> Pin versions at install time. Check what is current — do not trust version
> numbers quoted from memory.

### What was built

Versions were resolved from the registry at install time and pinned exactly:
Next **16.3.3**, React **19.2.8**, Tailwind **v4**, drizzle-orm **0.45.2**,
drizzle-kit **0.31.10**, postgres **3.4.9**, zod **4.4.3**,
`@supabase/supabase-js` **2.112.4**, `@supabase/ssr` **0.12.5**, date-fns
**4.4.0**, libphonenumber-js **1.13.12**, `@serwist/next` **9.5.12**, vitest
**4.1.11**, tsx **4.23.12**.

- `create-next-app` had to run in a temp directory and be moved in: npm rejects
  the project name `Rezervacije` because of the capital letters. `package.json`
  is named `kombi-rezervacije`.
- shadcn 4.x asks for a *base* and a *preset* now. Initialised with
  `--base radix --preset nova`, then added exactly `sheet dialog input checkbox`
  (`button` came with init). Nothing else.
- npm 11 gates postinstall scripts. `esbuild` and `unrs-resolver` were approved
  explicitly and are recorded in `package.json` under `allowScripts`; without
  that, vitest, tsx and drizzle-kit are all broken.
- Next 16 generates route types (`LayoutProps<"/">`) into `.next/types`, so
  `tsc --noEmit` fails on a clean checkout until `next typegen` has run. The
  `typecheck` script runs both — this matters for the Phase 8 CI job.
- `turbopack.root` is pinned in `next.config.ts`: a stray `package-lock.json` in
  the user's home directory otherwise makes Turbopack guess the workspace root
  and warn on every start.
- `git init` plus `origin` → `github.com/mihajloStamenkovic/Rezervacije`.
  No commits made. **That account was left behind on 04.09.2026**; `origin` now
  points at `github.com/PetarSosic/Rezervacije`. Recorded as it happened rather
  than rewritten, because where the backups from Phase 8 currently live depends
  on it.

**Evidence:** `npm run dev` → `Ready in 1120ms`, `GET / 200`. `npm run build` →
compiled, 2 static routes. `tsc --noEmit` → exit 0.

### How the hosted project got wired up

Phases 0–2 were originally built against a local Supabase stack in Docker. That
was dropped: the stack is one more thing to keep running, it cannot be reached
from a phone, and it gave a false sense of testing auth and RLS locally.

Moving to the hosted project turned up three real problems, all now fixed:

- `NEXT_PUBLIC_SUPABASE_URL` had `/rest/v1/` appended to it. `supabase-js` adds
  that itself, so every client call would have 404'd on a doubled path.
- `DIRECT_URL` pointed at `db.<ref>.supabase.co`, which does not resolve — newer
  projects do not publish that host on IPv4. Migrations and seeds both failed with
  `ENOTFOUND`. It now uses the **session pooler** on port 5432, which is the
  supported replacement and holds the session state DDL needs.
- `npm run db:reset` ran `supabase db reset`, a local-stack-only command. It is
  now `src/db/reset.ts`, which drops this app's four tables and the `drizzle`
  schema — not `drop schema public cascade`, which would take Supabase's role
  grants and extensions with it.

---

## Phase 1 — Data layer ✅

**Agent:** `supabase` · **Parallel with Phase 2** · **Completed 28.08.2026.**

Prompt it with: *"Read SPEC.md §4. Build the Drizzle schema, migrations and seed
for Kombi Rezervacije."*

**Deliverables**
- `src/db/schema.ts` — `reservations` (9 columns), `profiles`, `destinacije`, `settings`
- Generated migration in `drizzle/`
- `src/db/seed-destinacije.ts` — **idempotent**, reads `data/destinacije.json`,
  keyed on `drzava_sifra` + `regija` + `grad`. Inserts, updates, flips `aktivna`.
  **Never deletes.**
- `src/db/seed.ts` — test reservations covering the awkward cases
- Query layer exposing raw rows — no business logic

**Done when**
- Migration applies cleanly
- Dates are `date` columns in `{ mode: 'string' }` — **not** `timestamp`
- Destination seed produces **44 cities across 17 regions in 7 countries**, and
  running it twice changes nothing the second time
- Slovenija and BiH land with `aktivna = false`
- `Srbija › Beograd › Beograd` is present (added manually — not on the client's site)
- Reservation seed includes: departed-with-no-return, Greece→Belgrade one-way,
  same-day round trip, departing-today
- `kreirao` and both destination FKs are `ON DELETE RESTRICT`

### What was built

| File | Purpose |
|---|---|
| `src/db/schema.ts` | `reservations` (9 columns), `profiles`, `destinacije`, `settings` |
| `drizzle.config.ts` | `snake_case` casing, migrations out to `drizzle/`, uses `DIRECT_URL` |
| `drizzle/0000_pocetna_sema.sql` | the generated migration |
| `drizzle/0001_ukljuci_rls.sql` | RLS enabled on all four tables |
| `src/db/migrate.ts` | applies migrations over the direct connection |
| `src/db/reset.ts` | gated destructive reset |
| `src/db/destinacije-json.ts` | flattens the three-level JSON into one row per city |
| `src/db/seed-destinacije.ts` | idempotent destination seed |
| `src/db/seed.ts` | dev fixtures — 2 profiles, settings row, 8 reservations |
| `src/db/index.ts` | pooled Drizzle handle, `server-only`, dev-reload safe |
| `src/db/queries.ts` | raw-row query layer |
| `src/env.ts` | env access that throws on a missing variable |

Scripts: `db:generate`, `db:migrate`, `db:seed:destinacije`, `db:seed`,
`db:reset` (gated reset → migrate → seed both), `db:studio`.

### Evidence

- **Nine columns, `date` not `timestamp`.** `information_schema.columns` for
  `reservations` returns exactly 9 rows; `datum_polaska` and `datum_povratka`
  are both `date`. The schema declares them `{ mode: 'string' }`, so they arrive
  as `YYYY-MM-DD` and never become a JS `Date`.
- **Destination counts.** 44 cities · 17 regions · 7 countries — matches SPEC
  §5. Per country: Grčka 17, Hrvatska 13, Slovenija 7, Srbija 2, Makedonija 2,
  BiH 2, Italija 1.
- **Idempotent.** First run `44 ubačeno`. Second run
  `0 ubačeno, 0 izmenjeno, 44 nepromenjeno` — the second run writes nothing.
- **Update path.** Deactivated Grčka and misspelled it to `Grcka` directly in
  the database, then re-ran: `17 izmenjeno, 27 nepromenjeno`, and both the name
  and `aktivna` were restored.
- **Never deletes.** Inserted a `Crna Gora › Budva › Budva` row that the JSON
  does not contain, then re-ran the seed. It reported
  `1 red(ova) … Nisu obrisani: crnagora|Budva|Budva` and left the row in place.
- **Slovenija and BiH** land `aktivna = false`; `Srbija › Beograd › Beograd` is
  present and active.
- **`ON DELETE RESTRICT`.** All four FKs report `RESTRICT` in
  `information_schema.referential_constraints`. Deleting the Hanioti destination
  and deleting the profile `Nikola` both fail with a foreign key violation.
- **Check constraints** (added beyond the spec — cheap and load-bearing):
  `broj_putnika > 0`, `datum_povratka >= datum_polaska`, and `settings.id = 1`
  so "one settings row" is a database guarantee rather than a convention. All
  three were verified to reject a bad insert.
- **RLS on, default-deny.** `pg_tables` reports `rowsecurity = true` for all four
  tables and `pg_policies` is empty. Curling each table with only the publishable
  key returns `[]`. `npm run db:seed:destinacije` still reports
  `44 nepromenjeno`, proving the server path is unaffected — it connects as
  `postgres`, which owns the tables and so bypasses RLS.

### The eight seed reservations

Dates are relative to today in Belgrade, so the fixtures keep meaning the same
thing next month.

| # | Case it covers |
|---|---|
| 1 | The SPEC §1 worked example — Hanioti, 4 putnika, return in two weeks |
| 2 | **Departing today** — proves the `>=` boundary resolves to ↑ Odlazak |
| 3 | **Departed, return ahead** — must flip to ↓ Povratak and leave the Grčka filter |
| 4 | **Departed, no return date** — has no main date, drops off the list |
| 5 | **Greece → Belgrade one-way** — Beograd in the *outbound* column |
| 6 | **Same-day round trip** — appears in both groups; also `21 putnik` |
| 7 | References an **inactive** destination (Ljubljana) — must still render |
| 8 | Same main date as #6 — exercises the destination-then-name tiebreak |

### Two decisions to flag

**`profiles` has no `password_hash`.** SPEC §4 lists one, but §9 chose Supabase
Auth, which owns credentials in `auth.users`. A password column in `public`
would be a second source of truth and a liability. Reporting rather than
resolving silently, per standing rule 1.

**`profiles.id` has no foreign key to `auth.users` yet.** It is a bare
`uuid primary key`. Wiring it to `auth.users(id)` belongs with the auth work in
Phase 4, which also needs to replace the two placeholder profile UUIDs in
`seed.ts` with the real ones from the dashboard.

---

## Phase 2 — Locale and formatting primitives ✅

**Agent:** `locale` · **Parallel with Phase 1** · **Completed 28.08.2026.**

Prompt it with: *"Read SPEC.md §7. Build the date, phone and string modules."*

**Deliverables**
- `src/lib/datum.ts` — `danasBeograd()`, formatters, day headings
- `src/lib/telefon.ts` — normalize to E.164, display, `tel:` and `viber://` links
- `src/lib/tekst.ts` — every user-facing string, one file
- One exported `sr-Latn` collation comparator

**Done when**
- `danasBeograd()` returns the same value regardless of process `TZ`
- Passenger pluralization is correct at 1, 2, 4, 5, 21
- No date formatting anywhere constructs a JS `Date` from a `YYYY-MM-DD` string

### What was built

`src/lib/datum.ts` — `danasBeograd()`, plus `pomeriDane`, `razlikaUDanima`,
`danUNedelji`, `pocetakNedelje` / `krajNedelje`, `pocetakMeseca` / `krajMeseca`
(the Phase 3 date-chip ranges), `formatDatum` (`01.01.2026.`), `formatDanMesec`
(`12.09.`), `formatDug` (`1. januar 2026.`), `imeDana`, `naslovDana` (`danas` ·
`sutra` · `juče` · `subota, 12.09.`), `zaInput`, and `jeDatum` as a type guard.

`src/lib/telefon.ts` — `normalizujTelefon` (E.164, default country RS, returns
`null` rather than throwing so it drops straight into a Zod refinement),
`jeIspravanTelefon`, `formatTelefon`, `telLink`, `viberLink`.

`src/lib/tekst.ts` — the `T` object holding every user-facing string, the
three-form Serbian pluraliser (`putnika`, `rezervacija`, `filtera`), and the
single `uporediTekst` collator.

`scripts/test-tz.mjs` plus `npm run test:tz` — runs the whole suite once per
timezone in its own process, because Node reads `TZ` only at startup.

### Evidence

**85 tests, all green, identical under UTC · Europe/Belgrade · Europe/Athens ·
Pacific/Auckland · America/Los_Angeles.**

- **`danasBeograd()` ignores the process timezone.** Measured directly: at the
  instant `2026-01-01T22:45:00Z`, Node's own local hour reads 22 / 11 / 0 / 14 /
  7 across those five zones, while `danasBeograd()` returns `2026-01-01` in all
  five. The naive `new Date("2026-01-01")` comparison drifts to `2025-12-31`
  under `America/Los_Angeles` — that is the bug being designed out.
- Belgrade's own rollover is covered both ways: `22:30Z` on 31.12. is still the
  31st; `23:30Z` is already the 1st. Summer time (CEST, +2) tested separately.
- **No JS `Date` is built from a date string anywhere.** Every formatter splits
  the string and formats the parts; arithmetic goes through `Date.UTC`.
  Spring-forward (29.03.2026) and fall-back (25.10.2026) both step correctly.
- **Pluralisation** at the five values this plan names: `1 putnik`, `2 putnika`,
  `4 putnika`, `5 putnika`, **`21 putnik`** — plus the 11–14 exception
  (`11 putnika`, `111 putnika`) and `101 putnik`.
- **Collation** is `sr-Latn`, not `sr` and not the default: `Cetinje · Čačak ·
  Ćuprija · Drvar · Đakovo · Sarti · Šabac · Zagreb · Žabalj`. Plain `sr` is the
  Cyrillic order and puts `Čačak` before `Cetinje`, which is wrong for Latin
  text.
- A test asserts **no Cyrillic character appears anywhere in `T`**, keys
  included. It has already caught one bug: the key `uneo` had been typed with
  Cyrillic `е` and `о`.

### Note

`formatTelefon("+381641234567")` renders `+381 64 1234567`, not
`+381 64 123 4567` — that is libphonenumber's grouping for Serbian mobiles.
Left as the library has it rather than hand-rolling a different one.

---

## Phase 3 — Domain core ✅

**Agent:** `domain-logic` · **Completed 28.08.2026.**

Prompt it with: *"Read SPEC.md §1, §2, §3, §5. Implement and test the main leg
rule and both list modes."*

**Deliverables**
- `resolveMainLeg(reservation, today)`
- `rasporedView(...)` — one row per reservation, main leg only
- `danView(...)` — one row per matching leg, departures grouped before returns
- Filter composition and sort, including the same-day tiebreak
- Destination filter over the reference table: ticking a **country** matches every
  destination in it, a **region** matches every city in it, and a match on either
  `destinacija_id` or `destinacija_povratka_id` counts
- Unit tests with `today` injected as a fixed string

**Done when**
- Every case in the agent's test list passes, output included in its report
- The `>=` boundary is proven: departure exactly today resolves to ↑ Odlazak
- Filtering `Grčka` matches a booking whose leg is Hanioti (city → region → country
  rollup works)
- Filtering `Beograd` matches bookings referencing it from **either** destination
  column — the Greece→Belgrade one-way and an ordinary return both appear

> This is where the app is most likely to be subtly wrong. Read the test output
> yourself — do not accept "tests pass" as a summary.

### What was built

`src/domen/` — nine modules, five test files, 2232 lines. Nothing outside the
directory changed.

| File | Purpose |
|---|---|
| `tipovi.ts` | `RezervacijaRed`, `Etapa`, `StavkaListe`, `StanjeListe`, sort and mode types |
| `glavna-etapa.ts` | `resolveMainLeg`, `sveEtape`, `proveriDanas` |
| `destinacije.ts` | the rollup, filter keys, the one canonical list, the checkbox tree |
| `filteri.ts` | date chips, range normalisation, badge count, mode selection |
| `pretraga.ts` | diacritic-folding search over name, phone and destination |
| `sortiranje.ts` | primary sort plus the same-day tiebreak |
| `liste.ts` | `rasporedView`, `danView`, `pretragaView`, `prikaziListu`, grouping |
| `index.ts` | the single import surface for the UI phase |
| `fiksture.ts` | test-only; mirrors the eight seed rows at a fixed `DANAS = "2026-01-15"` |

### Evidence

Re-run and read in the main session, not taken from the agent's summary.

- **178 tests pass**, 93 of them new (`npx vitest run src/domen` → 6 files, 93
  tests). `npm run test:tz` → identical under UTC · Europe/Belgrade ·
  Europe/Athens · Pacific/Auckland · America/Los_Angeles, closing with
  *"Svih 5 vremenskih zona daje isti rezultat."*
- `npm run typecheck` exit 0 · `npm run lint` exit 0.
- **No database import.** The only `@/db` reference in the whole directory is a
  type-only import of three `$inferSelect` types from `schema.ts`, which is
  erased at compile time. `schema.ts` has no `server-only`; `queries.ts` does,
  and is never reached.
- **The structural row type cannot drift from the real one.** A temporary probe
  asserting `RezervacijaRed` from `src/db/queries.ts` and from
  `src/domen/tipovi.ts` are assignable **both ways** typechecked at exit 0. The
  probe was deleted afterwards; `git status` shows only `?? src/domen/`.
- **Mutation testing** — the agent broke the code four ways and confirmed the
  suite caught each: `>=` → `>` (11 failures), destination filter reading the
  reservation instead of the leg (6), `uporediTekst` → byte compare (2),
  departures-before-returns tiebreak removed (5).
- The `>=` boundary is named in the test list twice: *"departure exactly today →
  still outbound"* and *"flips the day AFTER departure, not on it"*.
- Rollup proven both directions: *"a country matches every city in it (Grčka →
  Hanioti)"* and *"a region matches only its own cities (Kasandra → Hanioti and
  Siviri, not Sarti)"*. Filter keys are built on `drzava_sifra`, not the display
  name, so re-seeding a renamed country cannot invalidate a saved filter.
- Both-columns rule proven: *"a place matches from BOTH destination columns"*
  and *"a departed trip leaves the Grčka filter, because its leg is now home"*.

### Three interpretations, flagged rather than resolved silently

**1. The departed-with-no-return booking is reachable in Dan mode.** The agent
brief said "excluded from both modes"; SPEC §1's edge-case table says reachable
"by search on the name, **or by filtering its past departure date**." SPEC won —
`danView` is purely leg-in-range and applies neither the main-leg rule nor the
today horizon. The booking is still absent from Raspored entirely.

**2. `pretragaView` is a third list shape, and SPEC §2 names only two.** SPEC §3
says search "is the only way to reach a booking that has no main date", but such
a booking has no main leg to render, so it cannot be a row in either named mode.
`pretragaView` emits one row per matching reservation, showing the main leg where
there is one and the past departure leg where there is not. `prikaziListu`
dispatches: date filter → `dan`, else search → `pretraga`, else `raspored`.
**This is a real addition to SPEC §2 and should be written into the spec.**

**3. What feeds the filter checkboxes.** Per SPEC §5, `destinacijeZaFilter` is
every **active** destination ∪ **anything any booking references**, from either
column, deduped by id. Ljubljana is absent with no bookings and appears exactly
once with the seed rows.

Two smaller calls, both documented in the code: the filter tree sorts
alphabetically at every level rather than by `redosled` (that column is the
client's display order for the booking dropdowns), and descending sort reverses
only the primary key — departures still precede returns within a day, since that
is a rule about a day, not about direction.

### Two things Phase 5 needs to know

- `StavkaListe.kljuc` is `<id>#<smer>`, **not** the reservation id. A same-day
  round trip emits two rows for one reservation, so the id alone is not a safe
  React key.
- `resolveMainLeg` deliberately does *not* apply the "from today forward"
  horizon — a booking that departed and returned last month still resolves to
  its return leg, which is what the detail screen wants. `rasporedView` owns the
  horizon.

---

## Phase 4 — Auth and RLS ✅

**Agent:** `security` · **Completed 28.08.2026.**

**Fully unblocked — Block B closed 28.08.2026.** Both accounts exist in
`auth.users`, confirmed, and the badge names and colours are settled:

| User id | Badge name | Colour |
|---|---|---|
| `56231ad7-e99a-4425-ae45-f87a82b2c07d` | Mihajlo | `#2563eb` |
| `22ecbb36-23fd-4d78-905d-fb8f0d2c89ca` | Petar | `#d97706` |

**The profile swap needs a specific order.** The two placeholder profiles
cannot simply be deleted or re-keyed: the eight seed reservations reference
them and both FKs are `ON DELETE RESTRICT` with no `ON UPDATE CASCADE`, so
an in-place `update profiles set id = …` is blocked just as a delete is.
The migration must, in one transaction:

1. insert the two real profile rows, taking `email` **from `auth.users`**
   rather than a literal — `src/db/seed.ts` is committed to GitHub and must
   not carry either account holder's personal address;
2. re-point `reservations.kreirao` from each placeholder to its real id
   (4 rows each, currently split evenly);
3. delete the two placeholder rows;
4. only then add the `profiles.id` → `auth.users(id)` foreign key.

Doing 4 before 1–3 fails: the placeholder UUIDs are absent from `auth.users`.

**RLS is already on.** `drizzle/0001_ukljuci_rls.sql` enabled it on all four
tables with no policies, so the door is locked by default and the publishable key
reads nothing. This phase writes the policies that let authenticated users in — it
does not start by opening anything.

**Deliverables**
- Supabase Auth via `@supabase/ssr` — browser, server and admin clients
- ~~`middleware.ts`~~ **`src/proxy.ts`** refreshing the session and protecting
  everything except `/prijava` and static assets — renamed in Next 16, see below
- `/prijava` screen in Serbian with correct `autocomplete` attributes
- **RLS policies for every table, written into migrations** (see SPEC §9)
- `profiles.id` becomes a real foreign key to `auth.users(id)`
- The two placeholder UUIDs in `seed.ts` replaced with the real account ids, or a
  trigger that creates the `profiles` row on user creation

**Done when**
- Logging in persists across a browser restart and across several days
- Every route redirects to `/prijava` when logged out
- `select * from pg_tables where schemaname='public' and rowsecurity=false`
  returns **zero rows**
- Curling the REST endpoint with only the publishable key and no session returns
  nothing from `reservations`; the same curl **with** a session returns rows
- `SUPABASE_SECRET_KEY` appears in no client bundle
- No password appears anywhere in the repo or in any env file I wrote

**Not blocked.** You create the two accounts in the Supabase dashboard and set
their passwords there. I never handle them.

### What was built

| File | Purpose |
|---|---|
| `drizzle/0002_profili_i_rls_politike.sql` | real profiles, the `auth.users` FK, 9 RLS policies |
| `drizzle/meta/0002_snapshot.json`, `_journal.json` | hand-written migration, journal kept consistent |
| `src/lib/supabase/client.ts` | browser client (publishable key) — **deleted 06.09.2026**, never used; see Phase 7 polish |
| `src/lib/supabase/server.ts` | per-request server client, publishable key + cookie session |
| `src/lib/supabase/admin.ts` | secret key, server-only, bypasses RLS |
| `src/lib/supabase/middleware.ts` | session refresh + redirect logic |
| `src/proxy.ts` | route protection (**not** `middleware.ts` — see below) |
| `src/app/prijava/{page,prijava-forma,actions}.tsx` | login screen and Server Action |
| `src/app/actions/nalog.ts` | logout |
| `src/db/schema.ts` | models `auth.users` via `pgSchema("auth")`, reference-only |
| `src/db/seed.ts` | placeholder UUIDs gone; reads ids and emails from `auth.users` |

### One deviation from this plan, and it is correct

This plan said `middleware.ts`. **Next 16 deprecated that file and export in
favour of `proxy.ts` / `export function proxy`** — confirmed in the bundled docs
at `node_modules/next/dist/docs/01-app/03-api-reference/03-file-conventions/proxy.md`:
*"The `middleware` file convention is deprecated and has been renamed to
`proxy`."* The build output confirms it is wired up, printing `ƒ Proxy (Middleware)`.
This is exactly the class of breaking change `AGENTS.md` exists to warn about.
**The wording above and in `.claude/agents/security.md` should be corrected.**

### Evidence

Re-verified in the main session against the live hosted project — not taken from
the agent's report.

- **`pg_tables … rowsecurity = false` → zero rows.** All four tables still RLS-on.
- **9 policies, every one scoped to `authenticated`.** Counted from `pg_policies`:
  `reservations` select/insert/update/delete, `profiles` select + update-own-row,
  `destinacije` select, `settings` select/update. **Policies granting anything to
  `anon`: 0.**
- **Anon curl, publishable key, no session** → `HTTP 200 []` from *all four*
  tables: `reservations`, `profiles`, `destinacije`, `settings`.
- **Anon writes change nothing.** `POST /rest/v1/reservations` → `HTTP 401`.
  `DELETE` → `HTTP 204` **but zero rows removed** — PostgREST reports success
  while RLS filters every row out of scope. Reservation count before and after:
  **8 and 8**. Worth knowing: a 204 here is not a breach, but it does not read
  like a rejection either.
- **The `auth.users` foreign key is real and enforcing.** `information_schema`
  reports it as absent — a privilege false-negative, because `auth.users` is
  owned by another role. `pg_constraint` shows
  `profiles_id_users_id_fk FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE`,
  and a live insert of a profile whose id is not an auth user was **rejected**
  by that constraint (tested in a rolled-back transaction).
- **Profiles are the real accounts.** Two rows, `Mihajlo` `#2563eb` and `Petar`
  `#d97706`, both present in `auth.users`, and each row's `email` **matches
  `auth.users.email` exactly** — proving it was copied by the migration rather
  than typed in. Placeholder profiles remaining: **0**.
- **All 8 reservations survived the re-point**, 4 to each account.
- **Route protection**, tested against a real `next start` server: `/`,
  `/nepostojeca-ruta`, `/detalji/abc`, `/podesavanja` → **`307` to `/prijava`**;
  `/prijava` itself → `200`.
- **No secret in anything the browser receives.** Clean rebuild, then grep of
  `.next/static` for the literal secret value, `sb_secret_`, `SUPABASE_SECRET_KEY`
  and connection strings → **0 files each**. The served `/prijava` HTML likewise
  contains none. The secret's only occurrence anywhere under `.next` is
  `.next/cache/turbopack/….sst`, a local build cache, and `/.next/` is gitignored.
- `npm run typecheck` exit 0 · `npm run lint` exit 0 · `npm run test` 178/178 ·
  `npm run build` succeeds (routes `/` and `/prijava`, plus the Proxy).

### Session longevity — what was and was not verified

The refresh cookie is written with `Max-Age=34560000` (400 days), and
`azurirajSesiju` calls `getClaims()` on every navigation, which refreshes an
access token that is near expiry. So the *mechanism* for surviving a browser
restart and a multi-day gap is in place and was observed in a real `Set-Cookie`.
**Nobody waited days.** Elapsed-time behaviour is unverified and stays unverified
until Phase 9 on the owner's actual phone.

### A mistake the agent flagged rather than hid

While testing the cookie round trip it ran one `curl -i` that printed a
`Set-Cookie` containing a full session JWT — which embeds the account email —
into its own transcript. It caught this, switched to silent curls with cookie
jars, and revoked the session with `signOut({scope:"global"})`.

**Verified in the main session:** `auth.sessions` → **0 rows**;
`auth.refresh_tokens` → **0 total, 0 active**. The leaked token is dead. No
password was involved at any point — the test sessions were minted via
`admin.generateLink()` + `verifyOtp()`, never `signInWithPassword`.

### Two things Phase 5 should know

- **`src/lib/supabase/client.ts` is currently unused.** `sb_publishable_` appears
  in **zero** files under `.next/static`, because login runs through a Server
  Action and nothing client-side has needed the browser client yet. It is correct
  code, but it is untested in a real bundle — the first client component to use
  it is the first real exercise of that path.
  **Resolved 06.09.2026 by deleting the file** — it stayed unused through Phases
  5–8, and a never-exercised auth path is worse than none. The pattern to
  recreate it is the `createBrowserClient` call in the table above.
- **Deleting an account in the dashboard will fail while it has reservations.**
  `profiles.id → auth.users(id)` is `ON DELETE CASCADE`, but
  `reservations.kreirao → profiles.id` is `ON DELETE RESTRICT`, so the cascade is
  blocked. That is the safe direction — no silent data loss — but it is a
  surprise if someone tries it.


---

## Phase 5 — Screens ✅

**Agent:** none — built in the main session. **Completed 01.09.2026.**

**Deliverables**
- **Lista** — sticky header, date-grouped cards, direction chips, creator badges
- **Filter** — bottom sheet, date chips, destination checkboxes **grouped by
  country** (collapsible), count badge
- **Nova / Izmeni** — Server Action + `useActionState`, native date inputs,
  **three cascading dropdowns per leg** (Država → Regija → Grad), **⇅ swap button**
- **Detalji** — *Pozovi* / *Viber*, edit, delete behind a confirm Dialog
- **Podešavanja** — default home destination

**Done when**
- No horizontal scroll at 375px
- Touch targets ≥ 44px, inputs ≥ 16px font
- Primary actions in the bottom third, safe-area insets respected
- Cascade resets correctly: changing country clears region and city
- Regions containing exactly one city auto-select and hide the third dropdown
- `aktivna = false` destinations are absent from the dropdowns but still render
  correctly on an existing reservation that references one
- Zero Serbian strings inlined in JSX — all from `tekst.ts`
- Zero filtering or sorting reimplemented in components

### What was built

Five routes, ten components, three new modules, two new test files.

| File | Purpose |
|---|---|
| `src/app/page.tsx` | Lista — reads `searchParams`, calls `danasBeograd()` once |
| `src/app/nova/page.tsx` | Nova rezervacija |
| `src/app/rezervacija/[id]/page.tsx` | Detalji |
| `src/app/rezervacija/[id]/izmeni/page.tsx` | Izmeni |
| `src/app/podesavanja/page.tsx` | Podešavanja, plus the logout button |
| `src/app/actions/rezervacije.ts` | create · edit · delete Server Actions |
| `src/app/actions/podesavanja.ts` | default home destination |
| `src/components/filter-sheet.tsx` | the bottom sheet — date, sort, destinations |
| `src/components/kaskada-destinacija.tsx` | Država → Regija → Grad |
| `src/components/forma-rezervacije.tsx` | the shared Nova/Izmeni form |
| `src/components/lista-rezervacija.tsx` | day headings and the Polasci/Povratci split |
| `src/components/kartica-rezervacije.tsx` | one card — renders a *leg*, not a booking |
| `src/components/polje-pretrage.tsx` | debounced search into the URL |
| `src/components/dugme-brisanja.tsx` | delete behind the confirm Dialog |
| `src/components/forma-podesavanja.tsx`, `izbor.tsx`, `cip-smera.tsx`, `bedz-autora.tsx` | settings form, native select, direction chip, creator badge |
| `src/domen/izbor-destinacija.ts` | the checkbox selection algebra (+ 21 tests) |
| `src/domen/kaskada.ts` | the form's dropdown lists (+ 11 tests) |
| `src/lib/validacija.ts` | the Zod schema shared by form and action (+ 12 tests) |
| `src/lib/url-stanje.ts` | filter/sort/search ⇄ query string |
| `src/lib/navigacija.ts` | the `nazad` path guard |
| `src/lib/auth.ts` | `zahtevajKorisnika()` — see below |

**Filter state lives in the URL, not in React state.** The list stays a Server
Component that renders once; a filtered view is linkable and survives a reload;
and the back button steps through filter changes the way a phone user expects.

**Three new domain modules, because the gate says zero logic in components.**
The checkbox algebra (ticking a country, then unticking one city inside it) and
the dropdown ordering are both filter logic and both are tested. Note that the
two orderings differ on purpose: the *form* dropdowns follow `redosled`, the
client's own display order, while the *filter* tree stays A–Z — that split was
already decided in Phase 3 and is now load-bearing in two places.

### One addition beyond the plan, and the reason for it

**`src/lib/auth.ts` — every page and action re-checks the session itself.**

The screens read through `src/db/queries.ts`, which connects as `postgres`, the
owner of the tables, and therefore **bypasses RLS entirely**. For a REST call
with the publishable key, RLS is the boundary and Phase 4 proved it holds. For a
server render it is not in the path at all, and the only thing between an
unauthenticated request and the reservations would have been `src/proxy.ts` —
which is a convenience redirect by its own documentation, and which sits on a
layer that has had a real bypass (CVE-2025-29927). `zahtevajKorisnika()` repeats
the check where the data actually is. It is cheap: `getClaims()` verifies the
JWT locally.

### Evidence

Run in the main session, not summarised from anywhere.

- `npm run typecheck` exit 0 · `npm run lint` exit 0 (see the note below).
- `npm run test` — **222 passed, 13 files**, up from 178/11. The 44 new tests are
  the selection algebra (21), the cascade lists (11) and the form schema (12).
- `npm run test:tz` — **222 tests identical under UTC · Europe/Belgrade ·
  Europe/Athens · Pacific/Auckland · America/Los_Angeles**, closing with
  *"Svih 5 vremenskih zona daje isti rezultat."*
- `npm run build` succeeds. Seven routes, five of them new, plus `ƒ Proxy`.
- **Route protection, against a real `next start`:** `/`, `/nova`,
  `/podesavanja`, `/rezervacija/<uuid>` and `/rezervacija/abc/izmeni` all return
  **307 → `/prijava`**; `/prijava` itself returns 200. Confirmed in a browser as
  well: `http://localhost:3000/` lands on the login screen.
- **Zero Serbian strings inlined in JSX.** A diacritic grep over `src/app` and
  `src/components` returns only prose inside comments. It caught one real hit —
  `layout.tsx` had `title` and `description` spelled out; both now come from
  `T.app`.
- **No Cyrillic character anywhere in `src`**, checked across every `.ts`/`.tsx`.

**Three lint errors were fixed rather than suppressed.** `react-hooks/set-state-in-effect`
flagged the search box, the filter sheet and the cascade — all three were the
"derive state from a prop" pattern written as an effect. All three are now
render-phase state adjustments, which is both what React documents and one fewer
wasted frame showing stale content.

### Two interpretations, flagged rather than resolved silently

**1. Day headings follow the sort, not the mode.** `grupisiPoDanu` starts a new
group whenever the date changes, so sorting by destination would render a column
of one-row day groups. Sorted by destination the list therefore goes flat and
each card carries its own date instead. SPEC §6 describes the date-grouped
shape and does not say what should happen under the §3 destination sort; this is
the gap being filled.

**2. Nova leaves the departure date and the passenger count blank.** Neither is
pre-filled, though today and `1` were both available. A booking that silently
departs today, or silently carries one passenger where the answer was four, is a
dispatch failure that looks like a correctly filled-in form. An empty field asks
a question; a wrong default answers it. Costs one tap each.

Two smaller calls, both documented in the code: the ⇅ swap exchanges the two
*destinations* and leaves the dates alone (a departure date is a departure date
whichever way the van is pointing), and the filter sheet also hosts the sort
controls rather than opening a second sheet for two toggles.

### Device gates — closed 01.09.2026

Driven by hand in Chrome at a phone viewport, signed in, against the real
hosted database. Clicks went through the DOM rather than screen
coordinates, because the captured frame was scaled and coordinate clicks landed
in the wrong place.

**Nothing was written.** No booking was created, edited or deleted; the delete
dialog was opened and cancelled. Counts before and after the whole pass:
`reservations=8 profiles=2 destinacije=44 settings=1`.

- **No horizontal scroll at 375px.** Chrome on Windows will not size a window
  below ~393px, so each route was measured inside a same-origin iframe pinned
  to exactly 375px. `scrollWidth - clientWidth = 0` on `/`, `/?od=…` (Dan),
  `/?q=…` (Pretraga), `/?sort=destinacija`, `/nova` and `/podesavanja`.
- **Touch targets and font size.** Every visible `button`, `a`, `input`,
  `select` and checkbox row on `/`, `/nova` and `/podesavanja` measured at
  375px: **zero** under 44×44, **zero** inputs under 16px. The Filter trigger
  measures 85×44 exactly.
- **The main leg rule, on real rows.** Today 01.09.2026, Raspored shows
  **5 rezervacija** — and the three absent ones are absent for three different
  correct reasons: Stefan Nikolić and Ana Marković departed with no return date
  (no main leg at all), Dragan Đorđević's return was 30.08 (main date in the
  past, outside the horizon). Jelena Ilić and Porodica Jovanović render as
  ↓ Povratak → Beograd; Marko Petrović, who has not left, is still
  ↑ Odlazak → Hanioti — the SPEC §1 worked example, live.
- **Destination rollup.** `?d=drzava:grcka` → **1 rezervacija**, Marko
  Petrović / Hanioti. Country → city rollup works, and the three departed Greek
  trips correctly leave the Grčka filter because their leg is now home.
- **The filter writes one key, not seventeen.** Ticking Grčka produced
  `?d=drzava%3Agrcka`. `sazmiIzbor` is doing its job where it is visible — in
  the URL and in the badge count.
- **Dan mode and the same-day round trip.** `?od=2026-08-30` renders
  **POLASCI** then **POVRATCI**, and Dragan Đorđević appears in *both* — one
  row per leg from one booking, which is what `kljuc = <id>#<smer>` exists for.
  Within Polasci, Hanioti before Kopaonik (destination A–Z).
- **Both routes to a booking with no main date.** `?od=2026-08-31` reaches Ana
  Marković under the heading **juče** (SPEC §1: "by filtering its past
  departure date"); `?q=nikoli` reaches Stefan Nikolić (SPEC §3: search).
  Search also folds diacritics — `nikoli` matched `Nikolić`.
- **Pluralisation in the wild.** `1 rezervacija` · `3 rezervacije` ·
  `5 rezervacija`, and `1 putnik` · `2 putnika` · **`21 putnik`** on Dragan
  Đorđević's minibus.
- **The cascade, all 14 regions.** Walked every country and region on `/nova`.
  Every region holding exactly one city auto-selects it and hides the third
  dropdown; every region with more than one shows it and selects nothing.
  That is 8 single-city regions — SPEC's list of ten minus Sarajevo and
  Jahorina, which are in BiH and correctly not offered. The rule is
  implemented, not the list. Changing country clears region and city.
- **The two destination lists really are different.** `/nova` offers Grčka,
  Hrvatska, Italija, Makedonija, Srbija — no Slovenija, no BiH. The **filter**
  offers Slovenija (the Ljubljana booking references it) but not BiH (nothing
  does). Opening **Šaban Šaulić** for editing offers Slovenija *and* pre-fills
  Slovenija › Slovenija with the third dropdown hidden. Both halves of SPEC §5
  proven on the same data.
- **The ⇅ swap.** With Grčka › Kasandra › Hanioti outbound and the pre-filled
  Beograd return, one tap exchanged both ids *and* both cascades re-derived
  their country and region from the new values — Grčka/Kasandra moved to the
  return leg, Srbija/Beograd to the outbound. One tap for a homecoming-first
  booking, as SPEC §5 asks.
- **Podešavanja pre-fills the return leg.** A fresh `/nova` opens with the
  return already set to `Srbija › Beograd › Beograd` from the settings row,
  third dropdown hidden.
- **Detalji.** `tel:+381667778899` and `viber://chat?number=%2B381667778899` —
  E.164 for the dialler, E.164 for Viber too, both usable from a foreign network.
  Long dates render as `7. septembar 2026.` and the full path as
  `Slovenija › Slovenija › Ljubljana`.
- **Delete is guarded.** The button opens a dialog reading *"Obrisati
  rezervaciju?" / "Brisanje je trajno. Rezervacija se ne može vratiti."* with
  Odustani and Obriši. Only the confirm button sits inside the form that posts
  to the Server Action. Cancelled; the booking is still there.

### Added after sign-off — the card shows both ends of the leg

01.09.2026, on the owner's request: a card reading `↓ Povratak · Beograd` says
they are arriving but not where from, which is half the dispatch question. Cards
now read `Solun → Beograd` on a return and `Beograd → Hanioti` on a departure.

**The origin is inferred, because there is no origin column.** SPEC §4 has
`destinacija_id` and `destinacija_povratka_id` and the nine columns are fixed,
so the far end of a leg is the *other* column, picked by direction —
`rutaEtape` in `src/domen/glavna-etapa.ts`, with 8 tests. That is exact for a
round trip and for the one-way ride home, where the outbound column already
holds home.

**It has one honest limit.** The Greece → Beograd one-way is entered with
Beograd in the outbound column and Beograd as the return, so both ends are the
same row and the Greek town they set out from was never recorded anywhere.
Rather than draw an arrow from Beograd to Beograd, the card collapses to the
single name — Ana Marković renders as `↑ Odlazak · Beograd`. If the owner wants
that origin, it needs a tenth column, which is a SPEC change and not this one.

A side benefit worth noting: the same-day round trip is now legible. Dragan
Đorđević's two rows on 30.08 used to read `Kopaonik` and `Beograd`; they now
read `Beograd → Kopaonik` and `Kopaonik → Beograd`.

Re-verified at 375px after the change: **zero horizontal overflow** on `/`,
`/?od=…` and the Dan view. The origin is the half that ellipsizes and the
destination never shrinks, so the place the van is going is always fully
visible — stress-tested with names far longer than any real destination
(`Bosanski Petrovac na Uni → Sveti Stefan Crnogorski`): still zero overflow,
origin truncated, destination intact.

### Added after sign-off — jednosmerna vožnja

01.09.2026, on the owner's request, and it closes the limit flagged in the
section above: a one-way ride home could not record where it started.

**No tenth column.** A booking with no `datum_povratka` is already a one-way —
SPEC §8 has the return leg optional — so the checkbox does not store a new
fact, it makes an existing absence sayable out loud. Ticking it clears the
return date, relabels the second leg from *Povratak* to **Odakle**, and puts
it first, because "from Solun to Beograd" is the order someone says it in.
`jeJednosmerna` in `src/domen/glavna-etapa.ts`, with tests.

**The second column is read as the origin.** On a round trip
`destinacija_povratka_id` is home, which is also where they set out from, so
this is a reading of the column rather than a change to it — the same reading
`rutaEtape` already applies to every outbound leg. Ana Marković no longer has
to collapse to a bare `Beograd`: the same trip entered as a one-way now records
Solun and renders `Solun → Beograd`.

**One thing the data still cannot say.** "This trip is one-way" and "the return
is not confirmed yet" are both an absent `datum_povratka`, and nothing
distinguishes them. Nothing in the app behaves differently between the two, so
nothing is lost today — but it is why the initial state of the checkbox is
passed in per screen rather than inferred: **Nova** opens as a round trip
(SPEC §4 has the return date filled in later), **Izmeni** opens ticked when the
stored booking has no return date. Inferring it uniformly made every new
booking default to one-way, which was caught in the browser and fixed.

**The detail screen had a real hole.** It only ever rendered
`destinacijaPovratka` when a return date existed, so on a one-way the origin
was invisible — it showed only "Povratak nije dogovoren". A one-way now renders
**ODAKLE / KUDA / POVRATAK**.

### Evidence

End to end against the live database, which meant writing for the first time:
one booking created through the form and deleted through the UI afterwards.

- Ticking the box: legends go `Odlazak · Povratak` → `Odakle · Kuda`, the
  return-date field disappears, and the pre-filled origin id survives the
  reorder. Unticking restores all three.
- **A one-way saved and rendered.** `Odakle Grčka › Solun i okolina › Solun`,
  `Kuda Srbija › Beograd`, 20.09.2026, no return. The list card read
  **`↑ Odlazak Solun → Beograd · 2 putnika`** — the exact shape that was
  impossible before. The phone normalised from `0641234567` to
  `+381 64 1234567` on save.
- Detail rendered `ODAKLE Grčka › Solun i okolina › Solun` / `KUDA
  20. septembar 2026.` / `POVRATAK Povratak nije dogovoren`.
- **Create and delete both exercised for the first time.** The test row was
  removed through the confirm dialog; `reservations` is back to **8** with
  zero `TEST%` rows left behind.
- 375px re-checked in both form states: **zero horizontal overflow**. The
  one-way checkbox's own box is 20×20, but the tap target is its label at
  262×64 and clicking the label toggles it — the same pattern the filter sheet
  already uses.
- 233 tests, identical across five timezones; typecheck, lint and build clean.

One thing that is still **not** verified, and cannot be from a desktop browser:
`tel:` actually dialling from a foreign network, and the session surviving a
multi-day gap. Both are Phase 9, on the owner's phone.

---

## Phase 6 — Installable and offline ✅

**Agent:** none — built in the main session. **Completed 01.09.2026.**

**Deliverables**
- Serwist service worker with per-route caching strategy
- Manifest, icons (192, 512, **512 maskable**), `apple-touch-icon` 180
- Offline indicator bar; save disabled with a clear reason when offline
- iOS Add-to-Home-Screen hint; Android `beforeinstallprompt` button

**Done when**
- ~~App shell and list render with the network disabled~~ ✅
- ~~**Mutations are never cached or queued** — they fail loudly~~ ✅
- Session survives the transition into iOS standalone mode — **still open**, see
  below. It cannot be closed from a desktop browser and moves to Phase 9.

### The one decision that shaped this phase

**`@serwist/next`'s default export is a webpack plugin, and this project builds
with Turbopack.** Under Turbopack it prints a warning and silently emits no
service worker at all — which is the worst possible failure, because everything
else looks like it worked. Serwist's supported answer is *configurator mode*:

| File | What it is |
|---|---|
| `src/sw/sw.ts` | the worker's source — routes, strategies, the policy |
| `serwist.config.mjs` | build options, via `serwist.withNextConfig` |
| `tsconfig.sw.json` | a second TS project, because `webworker` and `dom` cannot share a `lib` |
| `npm run build:sw` | `serwist build`, an esbuild step chained after `next build` |

That needed one new devDependency, **`@serwist/cli`** — already a declared peer
of `@serwist/next`. `public/sw.js` is generated output: git-ignored,
eslint-ignored, and never edited by hand.

The alternative was `next build --webpack`, which keeps the dependency list
shorter and gives up Turbopack on every build. Not worth it.

### The caching policy, and why it is shaped this way

**Reads may fall back to the last known copy. Writes never do.**

Serwist keys its route table by HTTP method, and every rule in `sw.ts` defaults
to `GET`. A `POST` therefore matches nothing, the worker calls neither a handler
nor `respondWith`, and the request goes to the network as though no service
worker existed. Offline it fails immediately and visibly. **There is no
background sync and there must not be one** — a booking that replays two hours
later is a duplicate the owner never learns about.

Rules in order, first match wins:

| Match | Strategy | Why |
|---|---|---|
| cross-origin (only Supabase) | `NetworkOnly` | a cached auth response is a stale session, or somebody else's |
| `/prijava` | `NetworkOnly` | a login form served from disk cannot be trusted to be the current one |
| `/_next/static/*` | `CacheFirst` | content-hashed, so a hit can never be stale |
| `/ikone/*`, manifest, favicon | `StaleWhileRevalidate` | change roughly never |
| RSC prefetch | `NetworkFirst` 3s → `rsc-najava` | a prefetch is a partial tree; it must never answer a real navigation |
| RSC | `NetworkFirst` 3s → `rsc` | |
| `mode === "navigate"` | `NetworkFirst` 3s → `stranice` | **the rule that makes an offline reload show the schedule** |
| anything else same-origin | `NetworkOnly` | an honest failure beats a guess |

Three seconds, because the failure mode in a parked van on foreign roaming is
not "no signal" but "a signal that takes twenty seconds to admit it is not
working". Yesterday's list answers most questions.

### Two things added beyond the plan, and the reasons

**1. `src/components/ciscenje-kesa.tsx` — the login screen empties the caches.**

Without it, signing out leaves the previous session's pages in Cache Storage,
and the next person to open the app on that phone with no signal is handed the
last schedule by the worker before the redirect to `/prijava` ever reaches the
network. The cookie is gone and RLS is untouched, but the names and phone
numbers are still on the device, which is the part that matters. It hangs off
the *screen* rather than the logout button, so a session that expires on its own
clears just as thoroughly as one ended on purpose. `gradnja` and `sredstva`
survive — content-hashed JS and icons, nothing personal in either, and
re-downloading them over a connection that has just proven unreliable would be a
second punishment.

**2. `reloadOnOnline` is off.** `SerwistProvider` defaults it to `true`, meaning
`location.reload()` the moment the signal returns. For a man half way through
typing a booking he has just been given over the phone, that throws the form
away at the worst possible moment.

### Next 16 ships `experimental.useOffline`. It is deliberately not enabled.

It would give a better connectivity signal than `navigator.onLine` — it watches
real request failures rather than only the network interface, so it is right
about a hotel WiFi with no upstream. It also makes Next **queue failed Server
Actions and silently retry them when the connection returns**, which is exactly
the behaviour SPEC forbids and the whole reason the worker refuses to touch
`POST`. A weaker signal with honest failures is the right side of that trade.
The reasoning is recorded in `src/lib/mreza.ts` so nobody turns it on by
accident.

### One real bug this phase caught

**`src/proxy.ts` excluded `icons/`; the directory is `ikone/`.** The exclusion
list was written pre-emptively in Phase 4 against a guess at the directory name,
and the guess was English while Phase 6 built the directory in Serbian like
everything else. Every icon returned **307 → `/prijava`**, so a browser deciding
whether the app was installable was handed a redirect instead of a PNG and the
install prompt would never have appeared. Fixed and verified: all four icons now
return `200 image/png` on a logged-out request.

### Evidence

Run against a real `next start`, in Chrome, signed in, against the real database.

- `npm run typecheck` exit 0 (both TS projects) · `npm run lint` exit 0 ·
  `npm run test` **234 passed, 14 files** · `npm run test:tz` **234 tests
  identical across all five timezones**.
- `npm run build` succeeds; `build:sw` reports **37 URLs precached, 1.03 MB**.
- **Logged out, on the bare domain:** `/sw.js`, `/manifest.webmanifest` and all
  four icons return `200`; `/`, `/nova` and `/podesavanja` still `307 → /prijava`.
  `sw.js` carries `Cache-Control: no-cache, no-store, must-revalidate`.
- **The worker installs and activates**, scope `/`, 37 precache entries. After
  one visit the caches hold `stranice: /`, `sredstva: /manifest.webmanifest` and
  11 RSC prefetches.
- **The list renders with the server process killed.** Not DevTools throttling —
  `next start` was stopped and the port confirmed free, then a full reload:
  heading *Raspored*, 5 cards, day headings *petak, 04.09.* … *nedelja, 13.09.*,
  direction chips and creator badges all present, served by
  `navigator.serviceWorker.controller`.
- **Mutations fail loudly.** With the origin dead,
  `fetch('/nova', {method:'POST'})` rejected with `TypeError: Failed to fetch`,
  and `registration.sync.getTags()` returned `[]`. (`BackgroundSyncQueue` *code*
  survives esbuild's tree-shaking into the bundle. It is never constructed, and
  those two runtime checks are what prove it.)
- **The offline bar** renders above the sticky header and pushes it down 36px
  rather than covering it: *"Nema veze sa internetom — Prikazani su poslednji
  poznati podaci."*
- **Save disabled offline.** On `/nova`, *Sačuvaj* goes from enabled to disabled
  the moment the connection drops, with *"Za čuvanje je potrebna internet veza."*
  beneath it. *Odustani* stays live.
- **Delete disabled offline**, and the confirm dialog swaps its own text while
  open: *"Brisanje je trajno…"* → *"Za brisanje je potrebna internet veza."*
- **Chrome fired `beforeinstallprompt`** — Chrome certifying the manifest, the
  icons and the worker as installable. The card appeared on Podešavanja with
  *Ne sada* / *Dodaj*; *Ne sada* hides it and the choice persists. **The install
  itself was not clicked** — that installs the app on the machine and is the
  owner's call.
- **The purge works**: running what `CiscenjeKesa` runs removed 4 pages and 15
  RSC entries and left the 37-entry precache and the icon cache untouched.
  `CiscenjeKesa` is present in the logged-out `/prijava` payload.
- **375px:** with the document flow constrained to 375, no horizontal overflow
  anywhere; the bar wraps to 56px, the install card fits at 341px and both of its
  buttons are 44px tall.

### Three things that are NOT verified, and cannot be from here

1. **The 375px gate was measured, not viewed.** The Chrome window was maximized
   and refused programmatic resize, so the numbers above come from constraining
   the document width. Fixed-position elements are viewport-relative and were
   therefore *not* re-tested at 375 — they are unchanged from Phase 5, which did
   close that gate by hand.
2. **A cold login through the service worker.** The test browser already held a
   session. `/prijava` is `NetworkOnly` and the login POST is never intercepted,
   so there is no mechanism for the worker to break it — but it has not been
   watched happening.
3. **Session survival into iOS standalone mode.** A different storage context and
   the classic PWA auth bug. It needs the owner's iPhone, alongside the `tel:`
   check already waiting there. **Phase 9.**

### Two Phase 5 defects found while testing, and fixed

Neither was caused by this phase. Both were found because Phase 6 put the app on
a screen in a state Phase 5 never looked at, and both are in `globals.css`.

**1. The app had been rendering in Times New Roman.** The theme mapped
`--font-sans: var(--font-sans)` — a self-reference, so it resolved to nothing
and `html { @apply font-sans }` fell through to the browser default. The layout
defines `--font-geist-sans` correctly and it was simply never read; Geist was
downloaded on every page load and thrown away. Now
`--font-sans: var(--font-geist-sans)`, and `getComputedStyle` reports
`Geist, "Geist Fallback"`.

**2. Dark mode was unreachable code.** `@custom-variant dark (&:is(.dark *))`
made every `dark:` utility depend on a `dark` class, and nothing in the app has
ever set one — no toggle, no script, no server-rendered attribute. So the whole
`.dark` palette and the `dark:` variants on the direction chips were dead. The
variant is now `@media (prefers-color-scheme: dark)`, which is what the `ui`
brief asked for, and the palette moved from `.dark { … }` to
`@media (prefers-color-scheme: dark) { :root { … } }`.

Two consequences worth recording:

- **`color-scheme: light dark` was added to `:root`.** Without it the native
  `<select>` and `<input type="date">` on Nova stay white — the browser paints
  those itself and ignores our tokens. They are now dark, verified on screen.
- **`themeColor` in `layout.tsx` is a light/dark pair** (`#ffffff` / `#242424`),
  matched to the two `:root` palettes, so the status bar above an installed app
  matches the header under it. The manifest's `theme_color` stays a single light
  value because the manifest format has no media queries.

The light palette is unchanged and still unconditional: a light phone gets
exactly what it got before. Verified through the CSSOM — `--background` is `#fff`
on a bare `:root` and `#0a0a0a` only inside the one dark media rule.

---

## Phase 7 — Verification gate

**Agent:** `tester` · **Nothing deploys until this passes.**

Prompt it with: *"Verify the implementation against SPEC.md. Report findings with
evidence."*

Runs the full matrix: main leg edge cases, the `>=` boundary, destination cascade
and filter rollup, filter/sort semantics, Serbian collation and pluralization,
mobile at 375px, data safety, RLS, and the timezone check.

**The timezone check is the highest-value item:** run with `TZ=Pacific/Auckland`,
`TZ=UTC` and `TZ=Europe/Athens` around a date boundary. The list must be
**identical** in all three.

**Then:** run `/code-review` for code quality. Fix findings, re-run Phase 7.

**Done when:** no correctness bugs and no spec deviations remain open.

### First run — 04.09.2026. NOT signed off.

The gate was run and **found things**, which is the gate working. Two confirmed
correctness defects and five documentation deviations are open, so Phase 7 stays
open and nothing deploys. Everything below was re-verified in the main session
against the source — the agent's report was the starting point, not the finding.

**The environment had to be rebuilt first.** This checkout had no `node_modules`
and no `.env.local`; the latter is gitignored and does not travel with the repo.
`npm install` restored 838 packages and the `allowScripts` approvals for
`esbuild` and `unrs-resolver` carried over, so vitest, tsx and drizzle-kit all
work. The owner supplied `.env.local`. Its shape was checked without reading any
value, and all five variables avoid the traps recorded in Phase 0: bare project
URL with no `/rest/v1/`, the new `sb_publishable_` / `sb_secret_` key names,
`DATABASE_URL` on the transaction pooler 6543, `DIRECT_URL` on the session
pooler 5432, and neither on `db.<ref>.supabase.co`.

#### Gates — all green

| Gate | Result |
|---|---|
| `npm run test` | **261 passed, 16 files** (was 234/14 — the gate added 27) |
| `npm run test:tz` | **261 identical across all five timezones** |
| `npm run typecheck` | exit 0, both TS projects |
| `npm run lint` | exit 0 |
| `npm run build` | 7 routes + `ƒ Proxy`; `build:sw` **37 URLs, 1.03 MB** |

**Two test files were added, no application code was touched:**
`src/domen/faza7-kapija.test.ts` (20 tests — the SPEC §1/§2/§5 rows that had no
direct assertion) and `src/db/kolone.test.ts` (7 tests — the nine columns as a
guard rather than a comment). All 27 passed on the first run.

**The domain core came through clean.** The main leg rule, the `>=` boundary, all
three list modes, the filter rollup, all four sort keys including the reservation
id tiebreak, Serbian collation and pluralization, and the no-JS-`Date` rule were
each re-derived from SPEC and found correct. Newly proven and not previously
asserted anywhere: a departure exactly today whose return is *also* today still
resolves to ↑ Odlazak; `sortirajStavke` is idempotent and stable across three
input permutations and five repeated renders; and the id tiebreak really is
implemented, not merely documented — reversing the input array produces an
identical order.

#### Live gates, run from the main session

- **RLS holds.** The publishable key with no session returns `HTTP 200 []` — two
  bytes — from all four tables.
- **Nine policies, 4/2/2/1, every one scoped to `authenticated`.** Policies
  granting anything to `anon`: **0**. Tables with `rowsecurity = false`: **0**.
- **Live counts:** `reservations` 8 · `profiles` 2 · `destinacije` 45 ·
  `settings` 1. 36 destinations active; Slovenija and BiH inactive as specified;
  Serbia is `Beograd · Kopaonik · Niš` with Beograd first.
- **Nine columns on the real table**, both `datum_` columns `date`, not
  `timestamp`.
- **No secret in the built bundle.** Zero files under `.next/static` contain the
  secret key value, `sb_secret_`, `SUPABASE_SECRET_KEY`, the database password or
  `postgresql://`. The publishable key is absent too — which confirms the Phase 4
  note that `src/lib/supabase/client.ts` is still unused. (That file was deleted
  on 06.09.2026; this gate's result stands unchanged, since it was measuring the
  absence of a key the file never got to emit.)

**The anonymous-INSERT probe was deliberately NOT re-run.** Phase 4 recorded it
as 401. Repeating it aims a write at the one real production database, and if RLS
had regressed it would land a junk row there with no sandbox to catch it. It sits
behind a `PROBE_WRITE=1` flag, unrun.

#### Two confirmed correctness defects

**1. The login screen's inputs are 32px tall — below the 44px floor.**
`src/components/ui/input.tsx:11` has the shadcn base `h-8 … text-base …
md:text-sm`. Every other `Input` in the app overrides it with
`h-11 text-base md:text-base` — the reservation form's five fields, the filter
range picker and the search box all do. The two inputs in
`src/app/prijava/prijava-forma.tsx:22` and `:38` pass **no className at all**, so
they inherit 2rem and the uncountered `md:text-sm`. No global CSS rescues them:
`globals.css` has no `input` rule.

The reason this survived is precise and worth recording: the Phase 5 device gate
measured `/`, `/nova` and `/podesavanja`. **`/prijava` was never measured** — it
is the one screen reached while logged out, and every gate ran signed in.

**2. Two English strings on live user-facing paths.**
`src/components/ui/dialog.tsx:79` and `src/components/ui/sheet.tsx:80` both render
`<span className="sr-only">Close</span>`, and both components default
`showCloseButton = true`. Neither caller opts out — `dugme-brisanja.tsx:59` is the
**delete confirmation dialog** and `filter-sheet.tsx:169` is the **filter sheet**.
So a screen reader announces "Close" in English on two of the app's most-used
controls, against SPEC's *"UI language: Serbian, Latin script"*.

The Serbian string already exists and is dead code: `T.filter.zatvori` at
`src/lib/tekst.ts:66` is declared and never referenced. (`dialog.tsx:118` has a
third `Close`, on a component nothing renders.)

#### Both fixed, same day

The two inputs on `/prijava` now carry `h-11 text-base md:text-base` — the exact
override the other seven already had, so nine of nine `Input`s clear the floor.
All three `Close` strings now render `T.nav.zatvori`; the string moved out of
`filter` into `nav`, because both primitives render it and a filter-namespaced
string on a delete confirmation reads as a mistake. `grep` for an English
`Close` in `src` now returns nothing.

Re-run after the fixes: **261 tests, 16 files** · `typecheck` exit 0 ·
`lint` exit 0 · `build` 7 routes + `ƒ Proxy`, `build:sw` 37 URLs / 1.03 MB.

#### `/prijava` measured at 375px — 04.09.2026, gate closed

Driven in Chrome against a real `next start`, logged out. Chrome on Windows still
refuses to size a window below ~393px — `resize_window` to 375 reported success
and `innerWidth` stayed 1920 — so the measurement used the Phase 5 method: a
**same-origin iframe pinned to exactly 375px**, confirmed by reading
`innerWidth: 375` from inside it before measuring anything.

| | |
|---|---|
| Horizontal overflow | `scrollWidth - clientWidth` = **0** |
| `#email` | 327 × **44**, font **16px**, `autocomplete="email"`, `inputmode="email"` |
| `#lozinka` | 327 × **44**, font **16px**, `autocomplete="current-password"` |
| *Prijavi se* | 327 × **44**, font **16px** |

Zero elements under 44×44, zero inputs under 16px. Re-measured at **414, 768 and
1024** as well, because the second half of the defect was `md:text-sm` biting at
the `md` breakpoint: overflow 0 and 44h/16px at every width.

**The fix was proven load-bearing rather than assumed.** Stripping `h-11` back to
`h-8` and `md:text-base` back to `md:text-sm` in the live DOM reproduced the
reported defect exactly — **32h/16px at 375, 32h/14px at 768** — and restoring the
classes returned it to 44h/16px. So the numbers above are the override working,
not a floor the base class was meeting anyway.

Incidental: the screen rendered in **dark mode**, which is the Phase 6
`prefers-color-scheme` fix confirmed live on a third screen. Nothing was typed
into either field and no login was attempted.

#### Both hardening items closed — 04.09.2026

**Inactive destinations are now refused server-side.** The schema cannot do this
— it has no database and must not grow one — so the check sits in
`sacuvajRezervaciju`, which is where a hand-built POST actually lands. The
allowed set is built by **`katalogZaFormu`, the same function the form's
dropdowns are built from**, so the server rule and the UI cannot drift apart.
Its second argument is what keeps an existing booking editable: a reservation
already pointing at Ljubljana may be saved again with Ljubljana, because
inactive means *not offered for new bookings*, never *unresolvable* (SPEC §5).
A rejection now names the field — *"Ta destinacija više nije u ponudi."* —
instead of arriving as the generic save failure.

**`broj_putnika` is parsed digits-only and capped at 100.** The regex runs
*before* `Number()`, which is the whole point: `Number("1e3")` is 1000 and
`Number("0x10")` is 16, both genuine integers, so `Number.isInteger` never
caught them. `MAX_PUTNIKA` is exported and documented as a guardrail rather
than a business rule — SPEC names no maximum, the largest real booking in the
data is 21, and the bound exists so `2147483648` stops at the form with a
sentence instead of at Postgres with an int4 overflow reported as *"Čuvanje
nije uspelo."* The error message was also wrong for `1.5`: it said "greater than
zero" when the problem was that it is not a whole number. It now reads
*"Broj putnika mora biti ceo broj veći od nule."*

Four tests were added for these — exponent and hex notation, a negative, the cap
including the old overflow value, and `21` still accepted, because the fix must
not break the minibus already in the data.

### Phase 7 signed off — 04.09.2026

| Gate | Result |
|---|---|
| `npm run test` | **265 passed, 16 files** |
| `npm run test:tz` | **265 identical across all five timezones** |
| `npm run typecheck` | exit 0, both TS projects |
| `npm run lint` | exit 0 |
| `npm run build` | 7 routes + `ƒ Proxy`; `build:sw` 37 URLs, 1.03 MB |
| RLS, live | `[]` from all four tables anonymously; 9 policies, 0 to `anon` |
| `/prijava` at 375px | zero overflow; every control 44px at 16px |

**Done when: no correctness bugs and no spec deviations remain open** — met. The
two correctness defects are fixed and re-measured, the two hardening items are
closed with tests, and every deviation is either corrected in `SPEC.md` or
recorded there as a decision with its cost stated.

Three things remain unverifiable from a desktop and stay in Phase 9: `tel:`
dialling from a foreign network, session survival into iOS standalone mode, and
a save attempted while `navigator.onLine` is true but the connection is dead.
One known gap is carried into Phase 8 rather than closed here: **nothing runs
this suite on push**, so the guarantees in the table above hold as of this
commit and not automatically thereafter.

---


#### Five deviations that are documentation, not code

3. **SPEC §5 contradicts itself on the destination counts.** Recounted from
   `data/destinacije.json`: **7 countries · 18 regions · 45 cities · 11
   single-city regions**. The section heading says exactly that and is right. Two
   sentences in its own body are stale — *"with 44 rows"* and *"is 33 now that
   the Serbian pickup towns are in"*, the latter true only during the few hours
   the 23 withdrawn towns were in the file. SPEC §9 and `RUNBOOK.md:120` also
   still say the verified restore returned 44 destinacije; the actual figure
   recorded above is 67, or 45 after the same-day trim. **The live table is 45 —
   no re-seed is missing, only the prose.**

4. **SPEC §9 lists CI as a service that exists.** `.github/` contains exactly one
   file, `rezerva.yml`, the nightly backup. There is no test workflow. Phase 8
   below correctly still lists it as an open deliverable, so the work is
   scheduled — but SPEC asserts it as present, and for an app whose entire safety
   net is 261 tests plus `test:tz`, **nothing currently runs them on push.**

5. ~~**Inactive destinations are not refused server-side.**~~ **Fixed
   04.09.2026 — see "Both hardening items closed" below.** SPEC §11 settled that
   Slovenija and BiH must not be bookable. The dropdowns are correct, but
   `src/lib/validacija.ts:38` validates the destination as `z.uuid()` with no
   catalogue or `aktivna` lookup, and `sacuvajRezervaciju` adds none. A
   hand-crafted POST would create a booking on Ljubljana. Tamper-only, by one of
   two trusted accounts, and the FK still blocks an id that is not in the
   catalogue at all — but the check lives in Postgres rather than in the schema.

6. ~~**`broj_putnika` has a floor but no ceiling, and is not parsed as
   decimal.**~~ **Fixed 04.09.2026 — see below.**
   `0`, `-1` and `1.5` are all rejected. `1e3` → 1000, `0x10` → 16 and
   `2147483648` all pass Zod and reach Postgres, where the last dies on int4
   overflow as the generic *"Čuvanje nije uspelo."* SPEC names no upper bound, so
   this is an omission rather than a contradiction. Related: `1.5` is rejected
   with *"Broj putnika mora biti veći od nule"*, which is not why it was rejected.

7. **The destination filter matches the leg, not the booking — SPEC is
   ambiguous about which was meant.** SPEC §5 says a place *"matches bookings
   that reference it from **either** `destinacija_id` **or**
   `destinacija_povratka_id`."* `prolaziDestinacije` matches the destination of
   the leg being rendered. Both readings are defensible and SPEC §1's own worked
   example backs the code — a departed Greek trip correctly leaves the Grčka
   filter. The consequence, measured on the eight fixtures: 8 of 8 rows reference
   Beograd in one column or the other, but the Beograd filter in Raspored returns
   2. Stefan Nikolić — departed, no return date — carries Beograd in that column
   and cannot be reached by the Beograd filter in **any** mode, because he has no
   leg to render. **Not resolved here.** SPEC should say whether the requirement
   is scoped to rows or to legs.

#### Polish, recorded and not fixed

- `T.lista.prazoUzFilter` (`src/lib/tekst.ts:33`, used at `src/app/page.tsx:125`)
  is missing an `n` — `praznoUzFilter`. The rendered Serbian is correct.
- **The count line above the list counts legs, not bookings**
  (`src/app/page.tsx:97`). In Dan mode a same-day round trip is two rows, so one
  booking reads *"2 rezervacije"*.
- ~~Three pieces of dead code: `supabaseBrowser()`, `aktivneDestinacije()` in
  `src/db/queries.ts`, and `T.filter.zatvori`.~~ **Cleared 06.09.2026** on branch
  `mrtav-kod`: `src/lib/supabase/client.ts` deleted whole, `aktivneDestinacije()`
  and `sviProfili()` removed from `src/db/queries.ts`, and the unused
  `PodaciRezervacije` type removed from `src/lib/validacija.ts` — 28 lines, all
  deletions, `npm run typecheck` clean. The third item as written was wrong:
  there is no `T.filter.zatvori`. The string had already moved to `T.nav.zatvori`
  when the English-announced "Close" was fixed on 04.09.2026, and it is used in
  `src/components/ui/dialog.tsx` and `src/components/ui/sheet.tsx`.
- **`settings` has no INSERT policy** — migration `0003` grants select and update
  only, while `postaviPodrazumevanuDestinaciju` is an
  `insert … onConflictDoUpdate`. Harmless today because that path runs through
  Drizzle as the table owner, but the policy set does not describe the write the
  app actually performs.
- **"Today" goes stale offline.** Navigations are cached `NetworkFirst` with
  `maxAgeSeconds: 24h` and `danasBeograd()` is baked into the cached HTML, so
  opening the app offline the next morning shows yesterday's `danas` / `sutra`
  headings. Inherent to caching the list, which SPEC §7 accepts.

#### Two things the gate could not determine

- **A save attempted while `navigator.onLine` is true but the network is
  actually dead.** The button is enabled, the POST bypasses the service worker
  and fails. Whether that surfaces as a Serbian message or Next's own error page
  is not decidable from the source — `sacuvajRezervaciju`'s `try/catch` wraps the
  database call, not the transport. Needs a browser with request blocking.
- **The `sr-Latn` collation depends on the deployment runtime's ICU.** On a
  small-icu Node, `Intl.Collator("sr-Latn")` falls back to root collation and
  `Čačak` would sort before `Cetinje`. A test catches it — but per finding 4,
  nothing runs the tests on push, so that guard is currently only as good as
  somebody remembering to run them before a deploy.
  **Half-closed 04.09.2026:** CI (`Provera`) now runs the suite on every push,
  so the guard is automatic on the Linux runner. What is still not proven is
  the *Vercel* runtime's ICU — CI and production are different Node builds, and
  nothing asserts collation on the deployed instance.

---

## Phase 8 — Deploy

**Agent:** `developer`

The Supabase half of this phase is already done — the project exists, migrations
are applied and the data is seeded. What remains is everything around it.

**Deliverables**
- Vercel project linked to the GitHub repo, env vars set
- Runtime uses the **pooled** connection (6543); migrations use the **session**
  one (5432), as a build step or separate job, never in the request path
- ~~`/api/health` checking database connectivity~~ ✅ **built 05.09.2026**
- ~~Sentry with PII scrubbed in `beforeSend`~~ ❌ **declined 05.09.2026** — reasoning in SPEC.md
- ~~GitHub Action: `typecheck` + lint + tests on PR~~ ✅ **built 04.09.2026**
- **Nightly `pg_dump` GitHub Action** — backup *and* keep-alive
- `RUNBOOK.md` with the restore procedure and how to re-seed destinations

### Signed off — 05.09.2026

**The bar was "production URL loads and login works." Both hold**, and the owner
signed in himself; nothing here rests on a screen that merely rendered.

| Deliverable | Evidence |
|---|---|
| Vercel linked, env vars set | 3 variables, `DATABASE_URL` stored as **Secret**, production + preview. Two dashboards were not consulted — `vercel env ls` was. |
| Pooled connection at runtime | `DATABASE_URL` is 6543. `DIRECT_URL` is **not on Vercel at all**, so it cannot reach the request path by accident. |
| `/api/health` | `200`/`503` both reproduced, the 503 against a genuinely unreachable host. |
| CI | `Provera` — three jobs, green on Linux. |
| Nightly backup | Running on the new repository, appended to the migrated history. |
| `RUNBOOK.md` | Restore, re-seed, and now "ask `/api/health` first". |
| Sentry | **Declined.** Not skipped — decided, with the reasoning written into SPEC.md. |

**Three things this phase got wrong before it got them right**, all worth
keeping because each looked like something it was not:

1. **The first deploy failed with no env vars.** Green CI was mistaken for
   evidence the deploy would build. It never was — the CI build job injects
   placeholders precisely because `src/db/index.ts` reads `DATABASE_URL` at
   module scope.
2. **The second deploy built perfectly and served 404 on every page.** The
   framework preset was `Other`, so Vercel published `public/` and discarded
   the Next build. The fact that broke the deadlock was `/sw.js` returning
   `200` while `/` did not.
3. **`/api/health` was redirected to `/prijava`** until the proxy matcher
   excluded it — a health check that reports healthy while the database is
   down, which is worse than not having one.

None of the three were defects in the application. All three were configuration,
and all three would have read as "the app is broken" to anybody looking at the
site rather than at the responses.

**Deferred to Phase 9**, unchanged: `tel:` dialling from a foreign network,
session survival into iOS standalone mode, multi-day session longevity, and a
save attempted while `navigator.onLine` is true but the connection is dead.

### The repository moved — 04.09.2026

`origin` is now **`github.com/PetarSosic/Rezervacije`**, matching the account
that also owns Vercel. It was `mihajloStamenkovic/Rezervacije`. The local git
identity was already `PetarSosic <petarsosic4@gmail.com>`, so authorship needed
no change, and the new repository was confirmed reachable and **empty** before
anything was repointed.

**Nothing has been pushed yet.** Five commits are ahead of the old remote and
publishing them to a new repository is the owner's call, not a side effect of
changing a URL.

Three consequences that do not follow automatically from a `set-url`:

1. ~~**The existing backups do not move.**~~ **Migrated 04.09.2026 — see
   "The backups came across" below.** They lived on the orphan branch `rezerve`
   in the *old* repository, including commit `2f03368` and the dump that was
   restore-verified.
2. **Secrets do not move.** `DIRECT_URL` must be set again under Settings →
   Secrets and variables → Actions on the new repository, or the nightly job
   fails on its own guard clause: *"Tajna DIRECT_URL nije podesena."*
   Its value is the session pooler on **5432**, not the transaction pooler.
3. **Vercel must be pointed at the new repository** and given its
   environment variables — **three**, not five; see "The first deploy failed"
   below. `DATABASE_URL` is the pooled connection on **6543**; `DIRECT_URL` on
   5432 is for migrations only, must never be in the request path, and does not
   belong on Vercel at all.

The backup workflow itself needed no edit: it addresses the repository through
`${{ github.repository }}` and authenticates with `${{ github.token }}`, so it
follows the repository it is running in.

### The first deploy failed — 04.09.2026

The Vercel project was created and built commit `041928e` with **no environment
variables set**. It failed at page-data collection:

```
Error: Failed to collect configuration for /nova
  [cause]: Error: Nedostaje promenljiva okruženja: DATABASE_URL.
      at b (src/env.ts:8:11)
      at module evaluation (src/db/index.ts:19:50)
```

Not a defect. `src/db/index.ts:19` constructs the postgres client at **module
scope**, so `databaseUrl()` runs whenever the module is evaluated — and
`next build` evaluates every route module to collect its config. The client is
lazy about *connecting*, which is why a placeholder URL is enough, but it is not
lazy about *reading the variable*. This is exactly why the CI `gradnja` job
injects placeholders; CI being green was never evidence that Vercel would build.

**Three variables, not five.** Measured, not assumed — `.env.local` was moved
aside and `next build` run with only these three, which produced a complete
route table (8 routes, proxy included):

| Variable | Why |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | inlined into the client bundle at build time |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | same — must exist *at build*, not just at runtime |
| `DATABASE_URL` | transaction pooler, port **6543** |

The other two are deliberately absent, and that is a security property rather
than an omission:

- **`SUPABASE_SECRET_KEY` bypasses RLS**, and nothing in the request path uses
  it. Grepping for importers of `src/lib/supabase/admin.ts` returns nothing —
  the file's own header says it is for manual scripts and is "never imported by
  a route, Server Action or Server Component". Putting it in Vercel would place
  an RLS-bypassing credential in a deployment that has no use for it.
- **`DIRECT_URL`** is read only by `migrate.ts`, `reset.ts`, `seed.ts` and
  `seed-destinacije.ts`, none of which run on Vercel. Standing rule 9 gates the
  destructive commands; not shipping their connection string is the cheapest
  possible reinforcement.

If a later change does import the admin client, the build will not warn — it
will fail at runtime on the first request that reaches it. Worth remembering.

**Set on 05.09.2026, from the CLI rather than the dashboard.** `vercel link`
attached the directory to `perica-mixa/rezervacije`, and a script piped each
value out of `.env.local` on stdin — never as an argument, so no connection
string reached shell history.

Two traps the script exists to avoid, both of which would have produced a
failure pointing nowhere near its cause:

- **`.env.local` is CRLF.** Extracting a value with `sed` alone carries a
  trailing carriage return into Vercel. A `DATABASE_URL` ending in `` is
  accepted at write time and fails at connect time.
- **`vercel env add` defaults to `--sensitive` for production and preview** —
  the opposite of the dashboard default. Left alone it would have marked both
  `NEXT_PUBLIC_` values sensitive, hiding them from us while Next inlines them
  into the shipped bundle anyway. Hence the explicit `--no-sensitive`.

Development was skipped deliberately, and two reasons agree: it feeds only
`vercel dev` / `vercel env pull`, which this project does not use, and the
Vercel API refuses sensitive variables in development — including it would have
forced `DATABASE_URL` to be readable.

Confirmed by `vercel env ls` — six rows, nothing in Development:

| Variable | Type | Environments |
|---|---|---|
| `DATABASE_URL` | **Secret** (value `Hidden`) | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_URL` | Config | Production, Preview |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Config | Production, Preview |

### The second deploy built cleanly and still 404'd — 05.09.2026

With the three variables in place the build went green — all 8 routes, the proxy
and a service worker precaching 37 URLs — and **every page still returned 404**
on the production domain `rezervacije-jet.vercel.app`.

The evidence that separated the two possibilities:

| Request | Result |
|---|---|
| `/` | `404`, `X-Vercel-Error: NOT_FOUND` |
| `/prijava` | `404` |
| `/manifest.webmanifest` (a Next route) | `404` |
| `/sw.js` (a real file in `public/`) | **`200`** |

Static files served, Next routes did not. That is not a broken alias and not a
failed build — it is a deployment with no Next.js server in it. `vercel project
inspect` said why:

```
Framework Preset    Other
Output Directory    `public` if it exists, or `.`
```

Vercel never detected the framework. Per its docs, "if no framework is detected,
'Other' will be selected", and then "only the contents of this Output Directory
will be served statically" — so it ran `npm run build`, threw away everything
`next build` produced, and published `public/` as a static folder. The build log
looked perfect precisely because the build *was* perfect; nothing consumed it.

Worth noting how close this came to being misread: the earlier failure was also
a Vercel-side configuration gap, so "the build is green now" felt like the end
of the story. The `sw.js` 200 was the fact that made the diagnosis possible —
without it, an all-paths 404 looks like a DNS or alias problem.

**Fixed by committing `vercel.json` with `"framework": "nextjs"`.** The dashboard
dropdown (Settings → Build and Deployment → Framework Settings) would fix it
equally well, but only until somebody re-imports the project — which is exactly
how it got to "Other" in the first place. In the repository it is reviewable and
cannot drift.

A related observation from the same probes: the deployment URL, the git-main
alias and the project alias all answer `302 → vercel.com/sso-api`, so
**Deployment Protection is on** for those. The production domain is excluded,
which is why it answered 404 rather than a redirect. That is the intended shape
— the app's own login and RLS are the security boundary for the production
domain, not Vercel's SSO gate.

### Live — 05.09.2026

**https://rezervacije-jet.vercel.app**, deployment `qt19bot4l`, built in 50s
from `1f79cdd`. Verified by request, not by looking at a dashboard:

| Path | Response |
|---|---|
| `/` | `307` → `/prijava` |
| `/prijava` | `200` |
| `/nova` | `307` → `/prijava` |
| `/manifest.webmanifest` | `200` |
| `/sw.js` | `200` |

The two redirects matter more than the two `200`s: they are `src/proxy.ts`
running in production and refusing an unauthenticated request for a data route,
which is the behaviour Phase 4 built and nothing had yet exercised off this
machine.

The Phase 4 secret gate, re-run against the deployed site rather than a local
build: the login page plus all 10 scripts the browser downloads were fetched and
searched for `sb_secret_`, `SUPABASE_SECRET_KEY`, `postgresql://` and
`DIRECT_URL`. None present. The page renders Serbian correctly — *Prijava*,
*Lozinka*, *Prijavi se*.

Note that `vercel project inspect` still reports `Framework Preset: Other`. That
is expected and not a leftover: `vercel.json` overrides the preset per
deployment, so the project-level setting stays as it was while every deployment
builds as Next.js.

**Still unproven from here:** an actual sign-in. The login *screen* serves and
the route guard works, but Phase 8's bar is "production URL loads **and login
works**", and that needs a real password, which only the owner has.

### Login works, and `/api/health` — 05.09.2026

**The owner signed in on the production URL.** That closes the Phase 8 bar,
"production URL loads and login works". Everything before this was reachability;
this is the first proof that auth, the session cookie and RLS all work off this
machine.

`GET /api/health` is now live. It counts `destinacije` rather than running
`SELECT 1`: a pooler that answers while the schema is missing is not a healthy
deployment, and one round trip proves both. It is also the one table where a row
count discloses nothing about anybody.

**Verified in both directions, which is the only way a health check earns
trust:**

| Condition | Result |
|---|---|
| Real database | `200` · `{"status":"ok","baza":"ok","destinacija":45,"trajanjeMs":872,"danas":"2026-09-05"}` |
| `DATABASE_URL` pointed at a dead host | `503` · `{"status":"greska","baza":"nedostupna","trajanjeMs":10}` |

`destinacija: 45` matches the live table, and `danas` is the Belgrade date from
`danasBeograd()` — so the endpoint also proves the date rule is running in the
deployed zone.

The 503 body carries **no error text**. The reason went to the runtime log
instead, where it read `[health] baza nedostupna: "Failed query: select count(*)
from \"destinacije\""` — no host, no credentials. A driver error can name the
host it failed to reach, and this endpoint is public.

**It had to be excluded from the proxy matcher**, and that is the subtle part.
Without the exclusion `/api/health` answers `307 → /prijava`; a monitor follows
the redirect, gets a login page that renders perfectly, records `200`, and
reports the app healthy **while the database is unreachable** — the single
failure the endpoint exists to catch.

That is the same failure shape Phase 6 already paid for once, when the matcher
said `icons/` and the directory was `ikone/`. So the matcher now has its own
test (`src/proxy.test.ts`, 5 cases). Proven to fail: with `|api/health` removed
from the pattern, the suite reports *"expected true to be false"* on exactly
that case and nothing else. Suite is **270 tests across 17 files**.

### The backups came across — 04.09.2026

**The same commits, not copies.** This clone still held the old remote's objects
under `refs/remotes/origin/rezerve` — `git remote set-url` rewrites a URL, it
does not discard fetched objects — so the branch was recreated locally from
`cb83929` and pushed to the new repository with its history intact. No dump was
re-taken, re-compressed or reconstructed.

Four nights migrated, `2f03368` (01.09) through `cb83929` (04.09):

```
dump/2026/2026-09-01.sql.gz   4937 B   ← the restore-verified one
dump/2026/2026-09-02.sql.gz   4143 B
dump/2026/2026-09-03.sql.gz   4141 B
dump/2026/2026-09-04.sql.gz   4140 B   ← taken that morning, before the move
csv/2026-09-0{1,2,3,4}-rezervacije.csv + csv/rezervacije-najnovije.csv
```

Two details worth reading rather than skipping:

- **The 01.09 dump is ~800 bytes larger than the three after it.** That is the
  destination trim, visible in the backups: 67 rows that night, 45 from the next
  one on. It independently corroborates the Phase 8 restore record above.
- **All five CSVs are byte-identical** — one blob, `b9030ef4`, referenced five
  times. Nobody has entered or changed a reservation since 01.09, and the CSV is
  a snapshot of current state rather than a diff. Expected, but it would look
  alarming to someone checking backups for the first time on a bad day.

**Still an orphan after the move:** `git merge-base main rezerve` finds nothing,
so cloning the code still never drags the backups along.

**Proven green on the new repository — 04.09.2026.** With `DIRECT_URL` set as a
secret there, `Nocna rezerva` was run by hand and produced commit `434e5dc`,
**whose parent is `cb83929`** — it appended to the migrated history rather than
starting a branch of its own, which is the thing the migration had to get right.

It did **not** add a fifth file. The run fell on the same UTC date as the last
old-repo run and dump names are keyed by UTC date, so it replaced
`dump/2026/2026-09-04.sql.gz` (4140 → 4139 bytes). One dump per calendar day,
re-running replaces that day's; the fifth appears at the next 01:30 UTC. Worth
recording because "I ran the backup and no new file appeared" reads like a
failure and is not one.

The old repository is now redundant — every dump it holds is here, as the same
commits. Keeping it costs nothing and is the cheaper side of the trade.

### CI ✅ — 04.09.2026

`.github/workflows/provera.yml`. On every push to `main`, every pull request
against it, and on demand. Three jobs, deliberately separate so a failure names
itself:

| Job | Runs | Guards |
|---|---|---|
| `provera` | `npm ci` · `typecheck` · `lint` · `test` | the 265 tests, and lockfile drift — `npm ci` fails if `package.json` and the lock disagree |
| `zone` | `test:tz` | the suite under five timezones, which must agree exactly |
| `gradnja` | `npm run build` + a secret grep | that it builds at all, and that no secret reached the client bundle |

**`zone` is the job that earns its keep.** A date rule that reads the machine
clock instead of the injected Belgrade "today" shows the owner the wrong day's
schedule from a server in another region, and no page reports an error when it
happens. Same for the `sr-Latn` collation on a small-ICU runtime.

**`gradnja` builds with placeholder credentials, never the real ones.**
`src/env.ts` throws on a missing variable at module evaluation, so the build
needs the five to exist — it does not need them to work, because the postgres
client in `src/db/index.ts` is lazy and every data route is dynamic, so nothing
queries at build time. **Verified locally on 04.09.2026** by moving `.env.local`
aside and building against placeholders: succeeded, 7 routes plus `ƒ Proxy`,
`build:sw` 37 URLs / 1.03 MB. A CI job holding the real secret key would put it
one `echo` away from a public log to prove nothing this job is here to prove.

The secret grep is the Phase 4 gate automated: `sb_secret_`,
`SUPABASE_SECRET_KEY`, `postgresql://` and `DIRECT_URL` must appear in neither
`.next/static` nor the generated `public/sw.js`.

**Unproven until it runs on GitHub.** Everything above was checked locally on
Windows; the workflow itself has never executed. Node 24 is pinned rather than
floating, because a minor Node bump has changed ICU data before and ICU is
exactly what the collation test depends on.

**Done when**
- Production URL loads and login works
- ~~The nightly backup job has run at least once and produced a real dump~~ ✅
- ~~A restore has been performed into a scratch database and **verified** — not
  just enabled~~ ✅

### Backups ✅ — 01.09.2026

`.github/workflows/rezerva.yml`, nightly at 01:30 UTC. First green run produced
commit `2f03368` on the orphan branch `rezerve`:

```
     836 B  csv/2026-09-01-rezervacije.csv
     836 B  csv/rezervacije-najnovije.csv
    4937 B  dump/2026/2026-09-01.sql.gz
```

`git merge-base origin/main origin/rezerve` finds nothing — genuinely orphan,
so a clone of the code never drags backups along.

**The committed artifact was restored, not just the local one.** The `.sql.gz`
was pulled back out of the branch, rewritten into a scratch schema and replayed
inside a transaction that was rolled back:

| | |
|---|---|
| destinacije | **67** (45 after the same-day trim, below) |
| profiles | **2** |
| reservations | **8** |
| settings | **1** |

Sample rows came back readable (`Porodica Jovanović · 2026-08-23 · Siviri`).
Afterwards: `reservations=8` unchanged and no scratch schema left behind. The
67 confirms it is genuinely today's data, not a stale capture — it was 44
before the Serbian pickup towns landed the same day.

The dump carries 4 tables, 9 policies, 4 data blocks and **zero** rows from
`auth`, so a backup cannot leak a password hash.

Two bugs were fixed before it went green, both mine:
1. The job began with `actions/checkout` on the `rezerve` branch — which does
   not exist on a first run. Removed entirely; the job never needed the source.
2. `postgresql-client-17` installed fine, but `/usr/bin/pg_dump` is
   postgresql-common's wrapper and kept resolving to the runner's pre-installed
   16, aborting on `server version mismatch` against a 17.6 server. Now called
   by absolute path, with the major version asserted before any dump runs.

> Backups are the only safety net in this app: deletion is permanent, there is no
> status column and no undo, and dev and production are the same database. On
> Supabase's free tier there are no managed daily backups **and** the project
> pauses after 7 days of inactivity — a quiet week in winter would take the app
> offline. The nightly `pg_dump` job solves both at once, because the daily query
> counts as activity. It is not optional.

---

## Phase 9 — Handover

**Agent:** none — main session.

- Create the two real accounts in the Supabase dashboard and wire their profiles
- Install to the owner's phone: iPhone is Share → *Add to Home Screen* (no
  install prompt exists on iOS — Podešavanja shows the instruction); Android
  Chrome offers a real install button on the same screen
- **Then sign in again inside the installed app.** Standalone mode is a separate
  storage context and this is the classic PWA auth bug — Phase 6 could not close
  this gate from a desktop browser. Confirm the session survives, then close the
  app, wait a day, and confirm it is still signed in
- With the app installed and the phone in airplane mode, confirm the schedule
  still opens and that *Sačuvaj* is greyed out with a reason rather than spinning
- Enter one real reservation together and confirm both accounts see it
- Confirm *Pozovi* dials correctly **from a foreign network** if possible
- Set the default home town in Podešavanja

---

## Phase 10 — Timovi i uloge — built 06.09.2026, NOT YET APPLIED

**Agent:** none — main session. Branch `timovi-i-uloge`, five commits.

The app stops being a two-person book. Two owners keep the wide view and gain
account management; drivers are grouped into **teams** and see their own team's
bookings and nothing else.

### The fact that shaped the whole change

`src/db/index.ts` connects as the `postgres` table owner, so **every screen
bypasses RLS**. Writing RLS policies alone would have changed nothing anyone
could see. The enforcement is the `WHERE` clause in `src/db/vidljivost.ts`; the
policies in `0004` are a second, independent boundary for PostgREST. They cannot
be one shared Postgres function — such a function reads `auth.uid()`, which is
NULL over the app's connection — so `npm run provera:vidljivost` reconciles them
against real data.

Standing rule 7 said "RLS is the security boundary" and was already misleading
before this change. It has been corrected.

### The design was reversed once, before anything shipped

Visibility was first derived from a booking's author, which keeps `reservations`
at nine columns and is wrong here. **The owners are the dispatchers.** Every
booking they entered would have been invisible to the driver who had to drive
it — silently, since an absent booking is indistinguishable from a quiet day.
That is the same failure mode SPEC §1 already accepts once for the no-main-leg
booking, and once is enough.

So `reservations` carries `tim_id`, the tenth column, and **standing rule 2 was
amended** to say what it always meant: the nine columns *describing the trip* are
fixed. The forbidden list is untouched — no `status`, no `napomena`, no
timestamps. `tim_id` is nullable; null means administrators only, and it is a
deliberate choice on the form with a permanent warning beside it.

### What was built

| File | What it does |
|---|---|
| `drizzle/0004_timovi_i_uloge.sql` | `timovi`, three `profiles` columns, `reservations.tim_id`, two CHECKs, `je_admin()`, `moj_tim()`, rewritten policies |
| `src/domen/pristup.ts` | the rule as pure functions — the mirror of the SQL, not the enforcement |
| `src/db/vidljivost.ts` | the `WHERE` fragment. No `server-only`, so the exact SQL is assertable in vitest |
| `src/db/queries.ts` | `sveRezervacije` and `rezervacijaPoId` **deleted**, not deprecated; scoping travels in the UPDATE/DELETE `WHERE` |
| `src/app/nalozi/` | teams and accounts, admin-only, `notFound()` for a driver |
| `src/db/provera-vidljivosti.ts` | read-only reconciliation of SQL against the pure rule |

### Three things fixed on the way past

- **`joinedSelect` shipped the whole author profile to the browser** — every
  card carried its author's email address, and after `0004` would have carried
  their role and team. Narrowed to `{id, ime, boja}`.
- **`obrisiRezervaciju` read then deleted by id alone.** The scope now travels
  in the DELETE's own `WHERE`, which closes the window and makes "not yours" and
  "not found" the same answer.
- **`RUNBOOK.md` §3's removal procedure did not work** and never had, for anyone
  who had entered a booking: `kreirao` is `ON DELETE RESTRICT` from one side and
  `profiles.id → auth.users.id` is `ON DELETE CASCADE` from the other, so the
  delete fails from both ends. `aktivan` is the only revocation there is.

### The migration is written and NOT applied

Hand-written, and it has to be: `drizzle-kit generate` adds `uloga` with its
final default of `'korisnik'` and then adds the check requiring a korisnik to
have a team, which both existing rows violate the instant it is created. The
generated file fails on the only database there is. Its snapshot is kept and is
correct; only the DDL is ours.

Before it is applied: verify a backup, rehearse it inside `BEGIN … ROLLBACK`,
then `npm run db:migrate`, then `npm run provera:vidljivost`. The migration is a
behavioural no-op by construction — both existing accounts become admins, and
the deployed code shows admins everything, exactly as today.

**Also outstanding:** the eight seed reservations are still in production. After
`0004` they are all `tim_id = null`, i.e. administrators only, which is the
honest start state — no team exists yet for them to belong to.

---

## Standing rules for every phase

1. **`SPEC.md` is the source of truth.** If an agent wants to deviate, it reports
   the conflict rather than resolving it silently.
2. **The nine columns are fixed.** No `status`, no `note`, no timestamps. Removed
   deliberately.
3. **Destinations are reference data, never free text.** Seeded from
   `data/destinacije.json`, chosen from cascading dropdowns. The filter is **one
   canonical list** — a place appears once and matches from **either** destination
   column. Grouping by country is fine; grouping by trip-versus-home is not.
   Destination rows are never deleted, only deactivated. See `SPEC.md` §5.
4. **Dates are `YYYY-MM-DD` strings end to end.** No JS `Date` in the pipeline,
   no `timestamptz`, no `toISOString()` on a calendar date.
5. **"Today" is always Belgrade**, always injected, never read from the device.
6. **Deletion is permanent.** Confirm dialog required; backups verified.
7. **RLS is the security boundary, not the middleware.** Every table in `public`
   has RLS enabled, policies live in migrations, and the secret key never
   reaches the browser.
8. Agents report what they actually ran and observed. "Looks fine" is not a result.
9. **There is one database and it is the real one.** No Docker, no local stack.
   Destructive commands are gated — `npm run db:reset` requires
   `POTVRDA="OBRISI SVE"` — and nobody bypasses the gate.

---

## Open items

- [x] ~~Account credentials~~ — you create the two accounts in the Supabase
      dashboard and set the passwords there. No seed script, no self-registration.
- [x] ~~Dropdown levels~~ — **confirmed three**: Država → Regija → Grad, third one
      auto-selected and hidden where a region contains exactly one city
- [x] ~~Default home destination~~ — **confirmed `Srbija › Beograd › Beograd`**
      (28.08.2026). The seed writes it into the `settings` row.
- [x] ~~Nightly backup~~ — `.github/workflows/rezerva.yml`, built 01.09.2026.
      Dumps `public` only (never `auth`), writes a readable CSV, commits to the
      orphan branch `rezerve`, refuses to save an empty dump, and doubles as
      the keep-alive. **Green and proven in production 01.09.2026** — commit
      `2f03368` on branch `rezerve`, and that committed dump was restored into
      a scratch schema in a rolled-back transaction: 67 destinacije, 2 profila,
      8 rezervacija, 1 settings. Procedure in `RUNBOOK.md`.
- [x] ~~Serbian pickup towns~~ — settled 01.09.2026 as **Beograd and Niš only**.
      The 23 largest were added and withdrawn the same day at the owner's
      request: the business has two pickup points, and a 25-entry dropdown
      costs a scan on every booking to serve a case that does not arise. The 22
      withdrawn rows were deleted from the database only after proving nothing
      referenced them — 0 in `reservations` (either column), 0 in `settings`.
      45 destinations total; Serbia is `Beograd · Kopaonik · Niš`, Beograd
      first. `Kopaonik` stays: it is the client's own ski destination from
      their site, not a pickup town.
- [x] ~~SPEC drift~~ — `SPEC.md` brought back in line with the code on
      01.09.2026 and given a changelog. All six disagreements closed.
- [ ] Re-check the non-Serbian half of `data/destinacije.json` against the live
      site before launch; it was captured 27.08.2026 and the client edits their
      own site
- [x] ~~`profiles` has no `password_hash`~~ — settled 01.09.2026 and still no
      password column. Supabase Auth owns credentials in `auth.users`, which
      hashes, salts and rate-limits them; a second copy in `public` would be a
      source of truth that can disagree with the first, in a schema reachable
      over PostgREST. What the owner actually wanted — *"profiles is the list of
      who may enter"* — is delivered by migration `0003` instead. SPEC §4 should
      be corrected to drop `password_hash` and say so.
- [x] ~~`profiles.id` foreign key and the placeholder UUIDs~~ — done in
      migration `0002`, verified by `pg_constraint` and a rejected insert.
- [x] ~~`profiles.email` copied from `auth.users`, never hardcoded~~ — done;
      each row's email matches `auth.users` exactly and no address appears in
      any tracked file.
- [x] ~~This plan and `.claude/agents/security.md` both say `middleware.ts`~~ —
      corrected 04.09.2026. The agent table above now says `proxy.ts`, and the
      security brief describes `src/proxy.ts` refreshing the session via
      `azurirajSesiju`, with an explicit *do not create `middleware.ts`* and the
      docs path that proves the rename. `src/lib/supabase/middleware.ts` keeps
      its name on purpose — it is a Supabase helper, not a route convention —
      and the brief now says so. The Phase 4 narrative above is left as written:
      it is the record of a deviation that was correct.
- [x] ~~The repo has zero commits~~ — Phases 3–5 committed and pushed to
      `origin/main` on 01.09.2026 (`b1aad88`), followed by the access-list work.
- [x] ~~SPEC §2 names two list modes; the implementation has three~~ —
      `pretragaView` is now written into SPEC §2.
- [x] ~~SPEC §1 and the `domain-logic` agent brief disagree~~ about whether a
      departed booking with no return date is reachable in Dan mode — corrected
      04.09.2026. SPEC §1 says yes, by filtering its past departure date; the
      brief said "excluded from both modes" and "reachable only via search". SPEC
      was followed in the code, and the brief now states the SPEC rule, names the
      test case, and records that the old wording was wrong so it does not come
      back. The same edit brought the brief up to **three** list modes —
      `pretragaView` and `prikaziListu` were missing from it entirely, which is
      the closed item two lines up read from the other side.
- [x] ~~Phase 7: the login screen's inputs are 32px tall~~ — fixed 04.09.2026.
      Both inputs in `src/app/prijava/prijava-forma.tsx` now carry
      `h-11 text-base md:text-base`, the same override the other seven already
      had; nine of nine `Input`s in the app now clear the 44px floor.
      **Measured at 375px and closed the same day** — zero overflow, both inputs
      and the submit button 327×44 at 16px, re-checked at 414/768/1024, and the
      old 32h/14px reproduced by stripping the classes to prove the fix carries
      it. `/prijava` had never been measured by any gate, which is how this
      survived Phases 5 and 6.
- [x] ~~Phase 7: "Close" is announced in English~~ — fixed 04.09.2026. All three
      occurrences now render `T.nav.zatvori`. The string moved from `filter` to
      `nav`, because both primitives render it and a filter-namespaced string on
      a delete confirmation reads as a mistake. No English string remains in
      `src`.
- [x] ~~Phase 7: SPEC §5 contradicts itself on the destination counts~~ —
      corrected 04.09.2026. "44 rows" → 45, single-city regions "33" → 11, and
      SPEC §9 plus `RUNBOOK.md` now record the restore as 67 (45 after the trim).
      Entered in the SPEC changelog.
- [x] ~~Phase 7: SPEC §9 lists CI as a service that exists~~ — corrected
      04.09.2026. The services table now says CI is not built, and §9 has a
      subsection explaining why the gap matters: nothing runs the suite on push,
      and that suite is the only guard against a small-ICU runtime breaking
      `sr-Latn` collation silently. **The workflow itself is still unbuilt** —
      it remains a Phase 8 deliverable.
- [x] ~~Phase 7: is the destination filter scoped to rows or to legs?~~ —
      **settled by the owner 04.09.2026: the leg.** The code was already right;
      SPEC §5 was reworded, and now states the cost outright — a booking that
      departed with no return date cannot be reached by the filter in any mode,
      only by search or by its past departure date, which is the trade §1
      already accepted.
- [x] ~~Phase 7: inactive destinations are not refused server-side~~ — fixed
      04.09.2026 in `sacuvajRezervaciju`, using `katalogZaFormu` so the server
      check and the form's dropdowns cannot drift apart. An existing booking on
      an inactive destination stays editable, per SPEC §5.
- [x] ~~Phase 7: `broj_putnika` has no upper bound and is not parsed as
      decimal~~ — fixed 04.09.2026. Digits-only regex before `Number()`, capped
      at `MAX_PUTNIKA = 100`, and the message for `1.5` now names the real
      reason. Four tests added, including `21` still accepted.
- [x] ~~**Phase 7 — needs the owner's call: is the destination filter scoped to
      rows or to legs?**~~ — duplicate of the item closed above. **Settled by the
      owner 04.09.2026: the leg.** Removed as an open question 06.09.2026; it had
      been recorded twice in this list, once closed and once still open.
- [x] ~~Owner request 06.09.2026: a city that is not in the list must be
      typeable~~ — built. The region and city dropdowns end in *Drugo — upiši
      ručno*, and what is typed becomes a real `destinacije` row. The typed name
      is folded for case, diacritics and repeated spaces and matched against the
      catalogue first (`kljucNaziva`, `nadjiMesto`, `uskladiRegiju` in
      `src/domen/kaskada.ts`), so a town already there is reused rather than
      duplicated; only `src/db/rucne-destinacije.ts` ever inserts. Two SPEC
      deviations were reported and are now recorded in §5: destinations are no
      longer strictly closed reference data, and the single-city third dropdown
      is auto-selected but no longer hidden, because hiding it hid the only way
      to reach *Drugo*. The default home town in Podešavanja goes through the
      same cascade and the same resolver.
- [x] ~~Owner request 06.09.2026: Viber instead of WhatsApp~~ — done. `viberLink`
      replaces `whatsAppLink` in `src/lib/telefon.ts`, and *Detalji* now offers
      *Pozovi* / *Viber*. `viber://chat?number=%2B381…` is a deep link with no
      web fallback, which is the trade recorded in SPEC §8.
- [x] ~~Rejected submit blanked the destination dropdowns~~ — found 06.09.2026
      while walking the new manual-entry flow in the browser, fixed the same
      day. React resets the form once a Server Action resolves, and
      `sacuvajRezervaciju` resolves *without navigating* whenever validation
      fails. The DOM reset put every `<select>` back to `Izaberi…` while React's
      state still held Grčka, so the screen showed an empty cascade sitting over
      hidden inputs that would still have saved Grčka. Controlled `<input>`s
      survive it — React re-applies their value — which is why only the
      dropdowns showed it. Every field in both forms is controlled, so the reset
      can only destroy information: `onReset={(e) => e.preventDefault()}` on the
      reservation and settings forms cancels it. Not covered by the suite —
      there are no DOM tests in this project — so it is verified in the browser
      only.
- [x] ~~Owner request 06.09.2026: drop Regija from the Povratak leg~~ — done.
      *Povratak* is now Država → Grad with every town of the country in one
      list (`gradoviDrzaveZaFormu`), the `bezRegije` prop on
      `KaskadaDestinacija`. Two things fell out of it and are the interesting
      part: the region became **optional** everywhere, with a town entered
      without one becoming its own region — the shape `Srbija › Beograd ›
      Beograd` already has — and a town typed with no region is matched by
      **country and name alone** (`nadjiGradUDrzavi`), because matching
      `Hanioti` as though its region were `Hanioti` would miss Kasandra and
      create a second row. Caught in the browser: the leg was initially sending
      the previously selected town's region, which would have filed a typed
      `Novi Sad` under `Srbija › Beograd`.
- [x] ~~Owner request 09.09.2026: two tabs, *Odlasci* and *Povratak*, swipeable
      on the phone~~ — built. This is the largest behavioural change since the
      teams work, because it **supersedes the main leg rule for the list**: a
      row is now a leg, not a booking, so a round trip appears in both tabs —
      under its departure date in one and its return date in the other. The
      conflict with SPEC §1 was reported before any code was written and is now
      recorded in §1, §2, §6 and §8 rather than resolved silently. The rule
      itself is untouched and still owns *Detalji* and the direction chip.

      All three modes became leg-shaped in `src/domen/liste.ts` and now differ
      only in which dates they admit — today forward, inside the range, or no
      horizon at all — and `prikaziListu` returns **both** tabs from one pass so
      the screen can render them together. That is what makes the swipe free:
      `src/components/tabovi-liste.tsx` moves between two lists that are already
      on the page, so changing tab costs no request and works with no signal.
      The gesture arithmetic is in `src/lib/prevlacenje.ts` under test, next to
      `povlacenje.ts`; pull-to-refresh gained an axis check the same day, so a
      sideways swipe can no longer open the refresh indicator under itself.

      Asked at the same time whether a booking that departed with no return date
      should finally be surfaced — at the top of *Povratak*, under "Povratak
      nije dogovoren" — **the owner said no**. That leaves SPEC §1's accepted
      trade standing, now reaffirmed twice.

      Verified: `npm run test` (360 pass), `npm run test:tz` (identical under
      all five zones), `npm run lint`, `npm run typecheck`, `npm run build`.
      **Not yet verified in the browser** — the dev session had no signed-in
      user, so the swipe itself has been read but not driven.
- [x] ~~Owner request 09.09.2026: remove the sort controls~~ — done, the same
      day and at his explicit instruction. The whole *Sortiranje* section of the
      filter sheet is gone: field (*Po datumu* / *Po destinaciji*) and direction
      (*Rastuće* / *Opadajuće*) both. What went with it is the point — this is a
      deletion, not a hidden default:

      - `Sortiranje`, `PoljeSortiranja`, `SmerSortiranja` and
        `PODRAZUMEVANO_SORTIRANJE` are deleted. `sortirajStavke(stavke)` and
        `uporediStavke(a, b)` take the rows and nothing else, so no caller can
        ask for a different order and none can drift from another.
      - The `sort` and `smer` URL parameters are gone from `P`. An old link
        carrying them opens on the one order there is — the parser has always
        ignored what it does not recognise, which is why nothing had to be
        written to handle it.
      - The flat, no-headings list shape went too. It existed only because
        sorting by destination scattered the dates, and it was the only user of
        `prikaziDatum` on the card, so both are removed rather than left as
        unreachable branches.
      - `T.sortiranje` is deleted, and `RedPrekidaca` — the two-button toggle
        row in the sheet — had no other caller.

      SPEC §3 is retitled *Filter and search*, §2's "Sorting inside a day" is
      now "One order, and it is not a choice" with the date promoted to key 1 of
      5, and §6 no longer says the header holds a sort.

      Verified: `npm run test` (358 pass — two fewer files' worth of sort cases,
      replaced by tests that the order is fixed), `npm run test:tz`,
      `npm run lint`, `npm run typecheck`, `npm run build`.
- [x] ~~Owner request 09.09.2026: Svetla / Tamna in Podešavanja, on every
      account~~ — built. Stored per phone in `localStorage`, not on the account:
      no column, no migration, and it works with no signal. Two buttons and no
      *Sistemski* — the owner asked for two — so an untouched app keeps
      following the phone and the first tap is what freezes it. That is the one
      decision inside his answer he did not make himself, and it is the reason
      nobody who never opens Podešavanja sees any change.

      `globals.css` finally takes the two-branch form its own comment had been
      describing since the dark palette landed: a `prefers-color-scheme` branch
      guarded by `:not(.svetla)`, plus a `.tamna` branch, and the `dark:`
      variant matching both so the eleven `dark:` utilities keep working under
      a forced theme. The palette is written out twice, deliberately —
      `light-dark()` would state each colour once but needs iOS 17.5, and an
      older phone would lose every colour rather than merely lose the switch.

      Two things that are easy to miss and were both caught in the browser:
      `color-scheme` has to follow the forced theme or a light app on a dark
      phone opens a black date picker; and the `theme-color` tags are matched on
      the *phone's* preference, which is exactly what the switch overrides — so
      the script strips their `media` rather than only rewriting `content`.
      Next adds a third such tag during hydration, so relying on document order
      would have been relying on a framework detail.

      Verified in the browser this time, on the real app: switch renders in
      Podešavanja, tapping *Svetla* turns the whole app light while Chrome
      itself stays dark, the choice survives a reload with no flash, the chips'
      `dark:` colours follow, and clearing the key returns it to following the
      browser. Plus 364 tests, `test:tz`, `lint`, `typecheck`, `build`.
- [x] ~~Owner request 09.09.2026: no region for Srbija~~ — built as a rule, not
      as a country name, which is what §5 already instructs. Counting
      `data/destinacije.json` first was what made the question worth asking:
      Srbija is not alone. Makedonija, Italija and BiH also have one town per
      region, and Slovenija has one region over seven towns — all five ask for a
      region that narrows nothing. The owner picked the widest of the three
      options offered, so `drzavaTraziRegiju` shows the middle dropdown only
      when the country has **more than one region** and **some region holds more
      than one town**. Grčka and Hrvatska keep it; the other five lose it.

      The flag was per *leg* before (`bezRegije`, the Povratak leg, 06.09.2026)
      and is now per leg **and** per country, so `bezRegijeZa(sifra)` replaces
      it at all eight decision points in `kaskada-destinacija.tsx` — including
      the two that ask about a country other than the one on screen. The server
      needed nothing: `razresiDestinaciju` already keys off whether a region was
      submitted, so a typed Serbian town matches by country and name and, if
      new, becomes its own region — the shape `Srbija › Beograd › Beograd`
      already has, which is also what keeps Srbija from drifting back into
      showing a dropdown.

      Verified in the browser on the real data: Srbija, Makedonija and Italija
      render Država → Grad, Italija auto-selecting its single town (Trst);
      Hrvatska and Grčka keep Regija with their four and five regions;
      Podešavanja loses the Regija row it had; and editing an existing booking
      still prefills Grčka › Sitonija › Kalamici with a region-less Serbian
      return leg. Plus 370 tests, `typecheck`, `lint`, `build`.
- [x] ~~Owner request 09.09.2026: implement the `Rezervacije UI` design canvas,
      Nova rezervacija and Filter only~~ — built. Imported through the design
      MCP (`DesignSync`, after `/design-login`); the canvas holds five artboards
      and the owner named two. `support.js` is the generated canvas runtime and
      has nothing in it to implement.

      **An artboard is a still picture, so two things it showed could not say
      what they do.** Both were put to the owner rather than guessed:

      - The form draws the route as a line of text, not as dropdowns. He chose:
        tapping the row opens the cascade in a sheet. So the cascade is intact,
        *Drugo — upiši ručno* with it, and the form loses four selects.
      - The filter draws Grčka as regions with no towns under it. He chose: the
        chevron opens them. Filtering to Hanioti alone still works, which SPEC
        §3 gives and the other reading would have quietly taken away.

      He also scoped the petrol accent to those two screens, so it is its own
      palette (`--akcenat` and four relatives, both theme branches) rather than
      a new `--primary`. Lista, Detalji and Podešavanja are untouched. Making it
      the app's primary later is one line.

      Three decisions taken without asking, each stated at the time: the
      *Jednosmerna vožnja* toggle is a `role="switch"` button rather than a
      seventh shadcn primitive (SPEC §9 caps the list at six); the head-count
      stepper keeps the number as a real input, because typing 21 should not be
      twenty taps; and the accent got a second, lighter set of values for dark,
      since the canvas is light-only.

      **One real bug, found by driving it rather than reading it.** The stepper
      computed the next value from the rendered one, so two taps inside a frame
      moved by one — four quick taps gave 2. The arithmetic is now
      `pomeriPutnike` in `validacija.ts`, applied through the functional form of
      `setState`, with tests including the composition case. Four rapid taps
      give 4.

      A second trap avoided by construction: Radix portals a Sheet outside the
      `<form>`, so the cascade's hidden inputs would have left the form and the
      Server Action would have received nothing. They stay behind in the form
      (`SkrivenaPolja`, `skrivenaPolja={false}`) — verified by reading the
      hidden input after *Potvrdi*, not by assuming.

      Verified in the browser, both themes: the route row fills in from the
      sheet and the id reaches the form; the stepper steps and still accepts
      typing; the filter's chevron opens Kasandra, ticking Siviri turns Kasandra
      soft, and *Primeni* lands on `?d=grad:…`. Plus 375 tests, `test:tz`,
      `lint`, `typecheck`, `build`.
- [x] ~~Owner correction 09.09.2026: the leg sheet revealed itself one dropdown
      at a time, and asked for the date separately~~ — fixed. Two complaints,
      one cause: the destination sheet was built as a cascade that unfolds, and
      the date was left behind on the form as its own field, so filling in one
      leg meant answering four questions in three places.

      Now the sheet holds the whole leg at once — Država, Regija, Grad and the
      date — and *Potvrdi* commits all of it together. A level whose turn has
      not come is **disabled rather than hidden**: "not yet" and "not part of
      this" are different statements, and the greyed box is what tells them
      apart. Regija still disappears entirely where the country does not need
      one, which is the 09.09.2026 rule and not a reveal.

      The date's field inside the sheet carries no `name` — it is a draft, and
      it is portalled outside the form anyway. What the Server Action reads is
      a hidden input in the form, the same shape `SkrivenaPolja` already uses
      for the destination. The row reads the date rather than asking for it,
      which is what the canvas drew all along.

      Verified in the browser: opening Odlazak shows all four fields, with
      Regija and Grad greyed until their turn; picking Srbija drops Regija;
      filling Grčka › Kasandra › Hanioti and 29.01.2026 in one pass leaves the
      row reading both, and the form carrying `destinacija` and `datumPolaska`.
- [x] ~~Owner correction 09.09.2026: opening Povratak grabs the Država field~~ —
      fixed, and only for that leg, as asked. A Radix dialog focuses its first
      control on open; on the outbound leg that is a blank form and the tap it
      saves is worth having, while on the return it is Beograd already filled in
      and a country picker lighting up for no reason — the date is usually why
      that sheet was opened at all.

      `onOpenAutoFocus` is cancelled and focus moved to the **panel itself**
      rather than nowhere: cancelling alone would have left focus on the row
      behind the sheet, outside the focus trap, which is worse for a keyboard
      or a screen reader than the thing being fixed.

      Verified in the browser: opening Povratak leaves focus on the sheet
      element and nothing highlighted, opening Odlazak still lands on
      `odlazak-drzava`, and the return sheet still fills and commits — Država,
      Grad, Datum povratka, then the row reads 12.02.2026 and the form carries
      `destinacijaPovratka` and `datumPovratka`.
- [x] ~~Owner correction 09.09.2026: ticking Grčka then tapping a region left
      everything *except* that region selected~~ — fixed, and it is a reversal
      of `prebaciCvor`'s own documented rule rather than a defect in it. The
      function subtracted, the way a checkbox tree does: a tap inside a ticked
      country removed that place and kept the rest. He read the tap as a
      choice — "just Sitonija" — which is the more natural reading of a chip.

      Now a tap on something that is only on because an ancestor is on
      **narrows to it**: the ancestor's places go off, the tapped one stays.
      Scoped to that ancestor, so ticking Grčka, tapping Sitonija and leaving
      Hrvatska alone does exactly that. A tap with no ticked ancestor is the
      plain toggle it always was.

      The trade is recorded in SPEC §3: "all of Grčka except Solun" used to be
      two taps and is now one per region kept.

      **The tests caught a real hole in the first version.** Where a region
      holds a single town — Sitonija is only Sarti in the fixtures — narrowing
      removes nothing, so the chip could be ticked and never unticked again.
      Narrowing now applies only where the ancestor covers strictly more than
      the tap; otherwise it falls through to the toggle. Two cases pinned:
      a one-town region, and a one-city country.

      Verified in the browser: Grčka then Sitonija leaves only Sitonija lit and
      the badge at 1; Grčka then Hanioti two levels down leaves only Hanioti;
      Kasandra tapped twice ends with nothing selected.
- [x] ~~Owner request 25.09.2026: retire the Viber group — select bookings on
      the list and copy one driver's message~~ — built; SPEC §6 (*Izaberi*),
      §5 (the filter reaffirmed unchanged), §8, changelog.

      **The shape.** An icon in the list header turns on a selection mode;
      cards and day headings get a circle, *Kopiraj (N)* replaces *Nova
      rezervacija*, and the tap writes a plain-text message to the clipboard.
      The text is prepared on the server — `stavkaPoruke` in
      `src/domen/stavka-poruke.ts` formats phone, price and route for every
      leg on screen — and the phone only sorts and joins (`sastaviPoruku`,
      `src/domen/poruka.ts`), because iOS allows a clipboard write only
      synchronously inside the tap. The selection keeps the formatted legs
      themselves, so it survives the filter change the owner's flow needs
      (Grčka on *Odlasci*, then the returns on *Povratak* by date). Verified
      in the Next 16 source that the page segment's React key ignores search
      params (`createRouterCacheKey(segment, true)` in `layout-router.js`),
      which is why client state in `page.tsx` outlives a filter change.

      **One deviation from the written plan.** It sorted the message by a
      card's index on screen. An index under one filter cannot be compared
      with an index under another, so Grčka and Hrvatska picks on the same
      day would have interleaved arbitrarily. The message is sorted by the
      list's own keys instead — section, date, destination, name, id — and a
      test pins that it matches `sortirajStavke`.

      **One fix found in the browser.** In the mode the gutter took 40px from
      each card, and at 390px a return's origin shrank to one letter —
      "P… → Beograd", on the tab where the origin is the whole question. The
      card's › is now hidden in the mode (it no longer means anything there),
      which gives "Perea" its full width; a long origin like "Neos Marmaras"
      still ellipsizes, to "Neos…".

      **Evidence, 25.09.2026.** `npm run typecheck`, `npm run lint` clean;
      `npm run test` 25 files, 414 tests (24 new in `poruka.test.ts`, 4 in
      `tekst.test.ts`); `npm run test:tz` identical in all five zones.
      `liste.test.ts`, `faza7-kapija.test.ts`, `kolone.test.ts` and
      `fiksture.ts` unchanged. In Chrome at a 390×844 viewport against the
      real database, read only: Grčka 15–16.09. showed two departures and
      *Povratak 0*; *ceo dan* and a card tap ticked both without opening
      Detalji; the filter changed to 21–27.09. without Grčka kept the ticks
      and said *2 izabrane nisu na ekranu*; *Kopiraj (4)* wrote the message,
      and Ctrl+V into a textarea returned the same 474 characters; the
      selection emptied and the mode stayed on; a second message held only
      its own booking; *Otkaži* restored *Nova rezervacija* and a tap opened
      Detalji again; with the dev server stopped (`Failed to fetch`), a tick
      and *Kopiraj* still wrote the message. No console errors.

      **Not verified.** A real iPhone from the home screen, pasting into
      Viber — only the owner can do that. The *ceo dan* circle's partial
      (dash) state was never on screen: no day in the real data has two legs
      on one tab, and the client component has no test of its own. DevTools'
      offline switch itself was not used; the dev server was stopped instead.
