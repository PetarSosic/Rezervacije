# Kombi Rezervacije — Specifikacija v1

A shared reservation book for a van transport business. Two owners who take the
calls and dispatch, and drivers grouped into **teams** — everyone in a team sees
that team's bookings and nobody else's. Mobile-first — it lives on a phone.

|  |  |
|---|---|
| Accounts | Created by an owner in the app. No self-registration. |
| Roles | `admin` (owner) and `korisnik` (driver) |
| Table columns | 12 for the trip, plus `tim_id` — who may see it |
| Screens | 5 + settings |
| UI language | Serbian, Latin script |
| Timezone | Europe/Belgrade (fixed, not device) |

---

## 1. The main leg rule

The idea the whole app turns on. Every reservation has two legs — going out and
coming home — but only ever **one main date**, and which leg that is depends on
today.

| Condition | Main date | Main destination | Direction |
|---|---|---|---|
| Departure has not passed | `datum_polaska` | trip destination | ↑ Odlazak |
| Departure has passed | `datum_povratka` | home | ↓ Povratak |

The same rule applies to every reservation, so a booking always has a single
consistent date to resolve to. A booking flips the day after it departs — it
stops being a trip *to* Greece and becomes a homecoming *to* Belgrade.

> **Amended 09.09.2026 at the owner's request: the rule no longer picks the row
> for the list.** The list is now two tabs, *Odlasci* and *Povratak*, and a
> booking appears in **both** — under its departure date in one and its return
> date in the other (§2). What the rule still owns is everything that has to
> resolve a whole booking to one date and one direction: **Detalji**, and the
> direction chip on a card.
>
> The reason it moved is that the rule answers "what is this booking *now*",
> and the owner's question when he opens the app is "who is going out" or "who
> is coming home" — and under the rule a return was invisible until the van had
> already left. It is the same data read a different way, and the two readings
> agree everywhere except in the one place the tabs were asked for: a return
> that has not departed yet is now on screen.

### Worked example

Booking: Marko Petrović, 4 putnika, Grčka, polazak 01.01.2026, povratak 15.01.2026.

- **On 20.12.2025** → main date `01.01.2026`, main destination `Grčka`, chip ↑ Odlazak.
  Matches the Greece destination filter.
- **On 05.01.2026** → main date `15.01.2026`, main destination `Beograd`, chip ↓ Povratak.
  No longer matches the Greece filter.

Same row in the database. Only today's date changed.

On the **list** since 09.09.2026 that same booking is two rows, not one: on
20.12.2025 it is under `01.01.2026` in *Odlasci* **and** under `15.01.2026` in
*Povratak*. On 05.01.2026 the departure has happened, so only the *Povratak*
row is left. The rule above is what each row's chip and *Detalji* still say.

### Edge cases

| Case | Behaviour |
|---|---|
| Departure passed, **no return date** | No leg left → **drops off the list entirely**: its departure is behind the horizon and it never had a return. Reachable two ways: by search on the name, or by filtering its past departure date. Accepted trade — reaffirmed 01.09.2026 and again 09.09.2026, when the owner was asked whether such a booking should be surfaced on the *Povratak* tab and chose to leave it as it is. See §8. |
| Departure and return on the same day | One row in each tab — two rows for one booking, both dated that day. |
| One-way ride *home* (e.g. Greece → Belgrade) | Entered with the **Jednosmerna vožnja** option: *Odakle* = Solun, *Kuda* = Beograd, no return date. Direction ↓ Povratak, not ↑ Odlazak — see below. See §5. |

> **Amended 11.09.2026 at the owner's request.** A one-way booking whose *Kuda*
> column is already a Serbian destination and whose *Odakle* column is not is
> a passenger **coming home**, not one leaving, whichever column the trip
> happens to be stored in — so its direction is ↓ Povratak everywhere `smer`
> is read: the list tab, the same-day sort tie-break, and the *Detalji* chip.
> Before this it read ↑ Odlazak, purely because `datum_polaska` pairs with the
> *Kuda* column structurally — the rule never looked at which country either
> end was actually in.
>
> This does **not** fire on an ordinary domestic one-way — a drop-off at
> **Kopaonik** with no return date agreed yet, say — because there *both*
> columns are Serbian (Kopaonik, and Beograd by default). The rule requires
> the *Odakle* end to be abroad, which is what keeps it scoped to genuine
> cross-border homecomings rather than any Serbian destination. And it never
> fires on a round trip: the moment a return date exists the booking is no
> longer one-way, and both legs keep meaning exactly what they always have.
>
> The route shown on the card is unaffected — it still reads `Solun → Beograd`
> — because it is read off the two destination columns directly (§4), not
> derived from this now-sometimes-relabelled direction.

---

## 2. Two tabs, and three ways of looking at them

### Odlasci and Povratak

**Added 09.09.2026 at the owner's request.** The list is two tabs, side by side
and swipeable with a thumb:

| Tab | Holds |
|---|---|
| **Odlasci** | every **departure** leg — `datum_polaska`, to the trip destination |
| **Povratak** | every **return** leg — `datum_povratka`, to the home destination |

A row is a **leg**, not a booking, so a round trip is on both tabs under two
different dates. That is the change: the main leg rule used to choose one of
the two legs and throw the other away for as long as it was not the current
one, which meant next week's homecomings could not be seen until the van had
left. Both are now on screen from the moment the booking is entered.

The tab is the leg direction — the same `smer` the chip and the sort already
speak in — and it lives in the URL as `?tab=povratak`, so a link opens where it
was sent from and a card sends you back to the tab you found it on. *Odlasci*
is the default and is left out of the query.

**Both tabs are rendered on the server in one pass**, so swiping between them
is a client-side move: no request, and it works on a phone with no signal. The
swipe follows the finger and commits at a quarter of the screen; a drag has to
be clearly more horizontal than vertical before it counts, because the list is
scrolled far more often than the tab is changed.

### The three modes, unchanged in kind

A date filter is a question about a **day**, not about a booking. So the list is
still a different shape depending on whether one is on — and each mode now
feeds both tabs at once, differing only in which dates it admits.

**Raspored** *(no date filter — default)*
Every leg from today forward, sorted by date ascending. Answers *"what is coming
up."*

**Dan** *(date filter active)*
Every leg falling inside the chosen date or range, past days included. Answers
*"what happens on 01.01.2026."* The "from today forward" horizon does not apply
here, which is what makes a past departure date reach a booking that has no
return (§1). Departures and returns are no longer split by a heading inside the
day — the tabs are that split.

**Pretraga** *(search active, no date filter)*
Every leg of every match, with no date horizon at all. Needed because §3 makes
search the only way to reach a booking that departed with no return date; that
booking has exactly one leg, its departure, so search finds it on *Odlasci*.
Added 28.08.2026 during implementation; this paragraph is the spec catching up
with it.

### One order, and it is not a choice

**Amended 09.09.2026 at the owner's request: the *Sortiranje* controls are
gone.** The sheet used to offer date or destination, ascending or descending.
The list now runs by **date, soonest first**, in both tabs, and nothing offers
to change that.

No times are stored, so same-day order still needs an explicit rule or rows
shuffle between renders. In full, the order is:

1. Date ascending
2. Departures before returns
3. Destination A–Z
4. Name A–Z
5. Reservation id, so the order never depends on what order Postgres returned

Stable on every render. Key 2 does nothing inside a tab, where every row points
the same way; it is kept because the sort is defined over a list of legs and
runs before they are split, so it must not depend on who is looking at it.

Cards are therefore always under a day heading. While the list could be sorted
by destination the dates were scattered, so it went flat and each card carried
its own date; that shape went with the controls.

---

## 3. Filter and search

- **Datum** — quick chips (*danas · ova nedelja · ovaj mesec*) plus a custom range picker.
- **Destinacija** — chips over the destination reference data (§5), grouped by
  country. Ticking a country matches every destination in it; ticking a region
  matches every city in it. **One canonical list** — see §5.
- **Tapping inside something already ticked narrows to it.** Grčka is on, you
  tap Sitonija: the rest of Grčka goes off and Sitonija stays on. Other
  countries are untouched — you were answering a question about Grčka.

  **Amended 09.09.2026 at the owner's request, reversing what this section
  used to say.** The old rule subtracted, the way a checkbox tree does: a tap
  inside a ticked country removed that one place and left the rest. He read it
  as a bug — he tapped a region meaning "just this one" and watched every
  *other* region stay lit — and he is right that the tap reads as a choice, not
  as an exception. The trade, stated plainly: "all of Grčka except Solun" was
  two taps and is now one per region kept. He does not ask that of this filter.

  Where a region holds a single town, or a country a single region, there is
  nothing to narrow to and the tap is an ordinary toggle — otherwise such a
  chip could be ticked and never unticked.
- Multiple destinations **OR** together; date and destination **AND** together.
  Both can be active at once.
- Filters live in a bottom sheet with a badge showing how many are active, plus *Obriši sve*.
- **No sort.** The sheet carried a *Sortiranje* section — date or destination,
  ascending or descending — until 09.09.2026, when the owner asked for it to
  go. §2 has the one order that is left. The sheet now holds only the two
  things that are genuinely questions: which days, and which places.
- **Pretraga** over name, phone and destination. Often faster than filtering, and it
  is the only way to reach a booking that has no main date.

---

## 4. Model podataka

Twelve columns describing the trip, plus `tim_id`. No status, no timestamps.

| Kolona | Tip | Napomena |
|---|---|---|
| `id` | uuid | primary key |
| `ime` | text | Booking name — one name covers the whole group |
| `telefon` | text | Normalized to `+381…` on save so it dials from abroad |
| `adresa` | text, nullable | Pickup address in Belgrade. Required by the form, nullable in the column |
| `destinacija_id` | → destinacije | Trip destination, chosen from dropdowns (§5) |
| `datum_polaska` | date | Required |
| `destinacija_povratka_id` | → destinacije | Pre-filled from default home destination, editable |
| `datum_povratka` | date | Optional — filled in later when confirmed |
| `broj_putnika` | int | Displays as *"4 putnika"* |
| `cena` | int, nullable | Whole euros. Required by the form, nullable in the column |
| `napomena` | text, nullable | Free-text description. Optional; `null` when blank |
| `kreirao` | → profiles | Who entered it. A badge, never a permission. |
| `tim_id` | → timovi, nullable | **Who may see it.** `null` = administrators only. |

**Amended 07.09.2026, at the owner's request.** Three columns were added:
`adresa`, `cena` and `napomena`. The first two are trip data in the plainest
sense — where the van stops and what the trip costs — and the address is here
rather than in `destinacije` because standing rule 3 governs *destinations*,
which the list filters and groups on; a doorstep is dictated over the phone,
is never filtered on, and would turn the destination table into an address
book.

`napomena` is different in kind: it **reverses** this section's own "no notes",
which was a deliberate decision reaffirmed 01.09.2026. It is recorded as a
reversal rather than absorbed quietly. The note stays out of every list, filter,
sort and search — it is read on Detalji, by someone who has already found the
booking — so what the original decision was protecting (a list that cannot be
made unreadable, and a search that cannot start matching on prose) still holds.
Since 25.09.2026 it is also printed in the driver's message (§6, *Izaberi*),
which is the same kind of reader: someone handling that one booking.

All three columns are **nullable, while the form requires the address and the
price**. Every booking entered before that date has none of them and none can
be invented, so the requirement lives in `RezervacijaSchema`, which is the only
place that can tell a new booking from an old one. The accepted consequence:
an old booking asks for an address and a price the first time it is edited.
The price is `integer` euros, not a decimal — the owner quotes round figures,
and a decimal typed into the box is refused rather than rounded, because
silently turning 120,50 into 120 changes what he charges.

`tim_id` is the tenth column and the only one that is not trip data. It is
stored rather than derived from `kreirao` because the owners are the
dispatchers: they take the calls and enter bookings that drivers then drive, so
a booking has to be able to belong to a crew other than the one that entered
it. Derived from the author, every booking an owner entered would have been
invisible to the driver who had to make the trip — and silently, since an
absent booking looks exactly like a quiet day. Storing it also freezes history:
moving somebody between teams cannot retroactively hand their old customers'
names and numbers to a different crew. See `src/domen/pristup.ts`.

Plus a `profiles` table — `id`, `ime`, `email`, `boja` (badge colour), `uloga`,
`tim_id`, `aktivan` — a `timovi` table (`id`, `naziv`), and a `destinacije`
reference table, see §5.

**There is no `password_hash`, deliberately.** Supabase Auth (§9) owns
credentials in `auth.users`, where they are hashed, salted and rate-limited. A
second copy in `public` would be a source of truth that can disagree with the
first, in a schema reachable over PostgREST. `profiles` is the **access list**,
not a credential store — see §9.

### There is no origin column, and that is a real limit

A booking stores where they are **going** and where they come **back to**. It
does not store where they set out **from**. The app infers it: the far end of a
leg is the *other* destination column, chosen by direction. That is exact while
origin and return-destination are the same place, which is true for a
Belgrade-based van and for the *Jednosmerna vožnja* option in §5.

It cannot express a trip with **three** distinct places — pick up in Niš, drive
to Grčka, return them to Beograd. That needs a tenth column and is not in v1.

Dates are stored as plain calendar dates, **no time component**.
**Deleting is permanent** — a confirm dialog is the only guard, and the nightly
backup (§9) is the only net.

---

## 5. Destinations — reference data from eurotravel.rs

Destinations are **not free text**. They come from a fixed reference table seeded
from the client's own site, and the owner picks them from dropdowns.

> **Amended 06.09.2026 at the owner's request: a place that is not in the list
> may be typed in.** The rule above still holds where it counts — a reservation
> points at a `destinacije` row and never at a name — but the region and city
> dropdowns now end in *Drugo — upiši ručno*, and what is typed there **becomes
> a row**. It is reference data a second later, so it appears on the card, in
> the destination filter, and in the dropdown next time. The country is never
> typed: all seven are already in the table, and a hand-spelled `Grcka` beside
> `Grčka` would split the filter's one canonical list in two.
>
> What keeps the list from silting up is matching: a typed name is folded for
> case, diacritics and repeated spaces and compared against the catalogue
> before anything is created, so `hanioti`, `Hanioti` and `Hanioti ` all resolve
> to the row that is already there, and a typed region reuses the country's
> existing spelling. A match is accepted **even when the row is inactive** —
> typing `Ljubljana` is an explicit request for Ljubljana, and refusing it would
> be a dead end. The trade accepted: a genuine misspelling becomes a permanent
> row, because destinations are never deleted. `aktivna = false` is the only
> way to retire one.

Source: `https://eurotravel.rs/destinacije`, captured 27.08.2026 into
[`data/destinacije.json`](./data/destinacije.json).

### The data is three levels, not two

| Level | Example |
|---|---|
| Država | Grčka |
| Regija | Kasandra |
| Grad | Hanioti |

**7 countries · 18 regions · 45 cities**, as seeded. 44 captured from the
client's site (Beograd among them, added by hand), plus Niš. Since the
06.09.2026 amendment the table also grows by whatever the owner types, so this
count is the floor, not the total.

The third level matters for dispatch. "Kasandra" is a peninsula with six towns —
dropping a family at Hanioti versus Siviri is a forty-minute difference. The
region alone does not tell the driver where to go.

So the form has **three cascading dropdowns**: Država → Regija → Grad. Where a
region contains **exactly one city**, the third dropdown auto-selects it. That
set was ten regions when this was written and is **11** now — which is exactly
why the instruction is **implement the rule, not the list**. Changing country
clears region and city.

> The auto-selected dropdown used to be **hidden** as well, on the reasoning
> that one option is not a choice. That stopped being true on 06.09.2026, when
> every city list gained *Drugo — upiši ručno*: hiding the dropdown would hide
> the only way to enter the town that is missing from it. The dropdown now
> stays on screen with its single city already chosen, so it still costs no
> taps.

### Three levels on the way out, two on the way home

**Amended 06.09.2026 at the owner's request: the *Povratak* leg has no region
at all.** It is Država → Grad, with every town of the chosen country in one
list. The return end of a trip is Beograd on about 99% of bookings, so naming
the region Beograd sits in is a tap that buys nothing.

The third level stays where it earns its keep — *Odlazak* — because Hanioti
versus Siviri really is forty minutes of driving, and that is the leg where the
owner is choosing between towns rather than confirming the obvious one.

> **Amended 09.09.2026 at the owner's request: on *Odlazak* too, the region
> only appears where it narrows the town list.** He asked for Srbija to lose
> it — `Srbija › Beograd › Beograd` asks for the same town twice — and that is
> not a special case but the clearest instance of a general one, so what is
> implemented is the rule and not the country (this section's own instruction).
>
> A region is shown when **both** hold: the country has more than one region,
> and some region holds more than one town. Miss either and choosing a region
> tells the city dropdown nothing it did not already know.
>
> On the seed data that comes to **Grčka and Hrvatska keep it; Srbija,
> Makedonija, Italija, Bosna i Hercegovina and Slovenija lose it** — the first
> four because every region there holds a single town, Slovenija because one
> region holds all seven. If Srbija ever gains a region with two towns in it,
> the dropdown returns on its own. `drzavaTraziRegiju` in
> `src/domen/kaskada.ts` is the rule; `src/db/destinacije-json.test.ts` pins
> what it currently comes to, so a re-seed that changes the answer fails loudly.

Two consequences follow, and both are load-bearing:

- **The region is optional everywhere**, since a leg with no region field
  cannot supply one. A town entered without a region **becomes its own region**
  — which is not a fudge but the shape the seed already uses for exactly this
  case: `Srbija › Beograd › Beograd`, `Srbija › Kopaonik › Kopaonik`,
  `Srbija › Niš › Niš`. Since 09.09.2026 that is also what a town typed under
  Srbija on the *Odlazak* leg does, and it is what keeps the rule above stable:
  every new Serbian town becomes its own single-town region, so Srbija does not
  drift back into showing a dropdown.
- **A town typed with no region is matched by country and name alone.** Typing
  `Hanioti` on the return leg must find `Grčka › Kasandra › Hanioti`; matching
  it as though its region were `Hanioti` would miss and create a second
  Hanioti. "Which region" is the question this leg does not ask, so the match
  must not depend on the answer.

> It briefly read "33" here, which was true only during the few hours on
> 01.09.2026 when the 23 withdrawn Serbian towns were in the file. Corrected
> 04.09.2026 by recounting `data/destinacije.json`.

### The `destinacije` table

| Kolona | Tip | Napomena |
|---|---|---|
| `id` | uuid | primary key |
| `drzava` | text | e.g. `Grčka` |
| `drzava_sifra` | text | e.g. `grcka` — stable key for re-seeding |
| `regija` | text | e.g. `Kasandra` |
| `grad` | text | e.g. `Hanioti` |
| `aktivna` | boolean | Offerable for new bookings — see below |
| `redosled` | int | Display order within its country |

One row per **city**. Country and region are denormalized onto it — with 45 rows
total, a three-table join buys nothing and costs clarity.

### Inactive destinations must still resolve

The site currently marks **Slovenija** and **Bosna i Hercegovina** as
*"trenutno nije dostupna u našoj ponudi."*

`aktivna = false` means: **hidden from the new-reservation dropdowns, but still
fully resolvable** for existing reservations and still present in the filter if a
booking references it. Never delete a destination row — a past reservation
pointing at it must keep rendering.

### Beograd is not on the site

Belgrade is the company's *origin*, so it is not listed as a destination. But the
app needs it as the default **return** destination, and for one-way rides home.

It is added manually to the seed data, marked `"izvor": "rucno"`, and it is the
**default return destination** — around 99% of rides start and end there.

**Niš** is added the same way, as the one other pickup point. Serbia therefore
offers exactly three places: `Beograd`, `Kopaonik` (the client's own ski
destination, from their site) and `Niš` — in that order, because `redosled` is
what the dropdown sorts by and Beograd must be first.

> The 23 largest Serbian towns were added on 01.09.2026 and withdrawn the same
> day at the owner's request: two pickup points is what the business actually
> has, and a dropdown of 25 towns costs a scan on every booking to serve a case
> that does not arise. Adding more later is one edit to
> `data/destinacije.json` plus `npm run db:seed:destinacije`.

### A destination is a destination, whichever column it sits in

This is a hard requirement and survives the move to reference data:

> The destination filter is **one canonical list**. A place appears **once**, and
> it is matched from **either** `destinacija_id` **or** `destinacija_povratka_id`
> — neither column is privileged, and there is no second list.

The owner books one-way rides *home* — Greece → Belgrade — where Belgrade sits in
the outbound field. If the filter split into "trip destinations" and "home towns",
Belgrade would appear as two checkboxes and ticking one would silently miss half
the Belgrade bookings.

**The filter is scoped to the leg on screen, not to the whole booking.** Settled
04.09.2026; earlier wording here said "matches bookings that reference it", which
read as row-scoped and disagreed with §1's own worked example. A row is shown
when the destination of the leg being rendered matches. So a trip to Hanioti
leaves the Grčka filter the day it departs, because from that moment its leg is
the journey home — which is precisely what §1 describes, and what makes the
filter answer *"who is going there"* rather than *"who has ever been there"*.

The two readings differ on real data. Of the eight seed bookings, all eight
reference Beograd in one column or the other, while the Beograd filter in
Raspored returns two. The cost is stated plainly: **a booking that departed with
no return date carries Beograd in its return column and cannot be reached by the
Beograd filter in any mode**, because it has no leg left to render. That booking
is reached the two ways §1 already names — by search, or by filtering its past
departure date — and this is the same accepted trade-off, not a new one.

> **Reaffirmed 25.09.2026 at the owner's request**, while the driver's message
> (§6, *Izaberi*) was being designed. A driver for Grčka needs the departures
> to Grčka *and* the returns from it, and the Grčka filter shows only the
> first — the returns end in Beograd. Asked whether the filter should reach
> the returns too, the owner chose to leave it as it is and pick them on the
> *Povratak* tab by date. The selection surviving a filter change is what
> makes that one message rather than two.

Grouping the filter by **country** is fine and encouraged — that is a real
hierarchy in the data. Grouping by **trip-versus-home** is wrong — that is an
artificial split the client's own data disproves.

### Keeping the data current

The client will add destinations to their site. The seed is a re-runnable,
idempotent script keyed on `drzava_sifra` + `regija` + `grad`: it inserts new
rows, updates changed names, and flips `aktivna` — but **never deletes**.

Updating means editing `data/destinacije.json` and re-running the seed. Note this
in `RUNBOOK.md`. There is no admin UI in v1.

### Swap button

The form keeps a **⇅ swap** button between the two destination selections, so
entering a homecoming-first booking is one tap rather than re-navigating both
sets of dropdowns. It exchanges the two *destinations* and leaves the dates
alone — a departure date is a departure date whichever way the van points.

### Jednosmerna vožnja (one-way)

A checkbox on the form. It is **not a tenth column**: a booking with no
`datum_povratka` is already a one-way (§8, "return leg optional"), so the box
makes that absence sayable instead of leaving the owner to infer it from an
empty field.

Ticking it clears and hides the return date, and relabels the second leg from
*Povratak* to **Odakle**, showing it first — "from Solun to Beograd" is the
order it is said out loud. On a one-way that column holds where they set out
from, which on a round trip is home, so this is a reading of the column rather
than a change to it.

Its initial state is set per screen, never inferred from the empty field:
**Nova** opens as a round trip (§4 has the return date filled in later), and
**Izmeni** opens ticked when the stored booking has no return date.

**What the data cannot say:** "this trip is one-way" and "the return is not
confirmed yet" are both an absent `datum_povratka`. Nothing in the app behaves
differently between them, so nothing is lost — but no report can tell them
apart.

**When *Kuda* is Serbian and *Odakle* is not, this is a homecoming.** Amended
11.09.2026 at the owner's request — see §1, "Edge cases": such a one-way
resolves to ↓ Povratak, not ↑ Odlazak, everywhere direction is read from. A
one-way to a Serbian destination whose *Odakle* is *also* Serbian — Kopaonik,
say — is unaffected and stays ↑ Odlazak.

---

## 6. Ekrani

1. **Lista** — sticky header with search and filter, and under them the
   two tabs, *Odlasci* and *Povratak*, each with the number of rows behind it
   (§2). Swipe sideways to change tab; the count on the tab you are not on is
   the useful half of it. Cards always grouped under date
   headings (*danas · sutra · subota, 12.09.*), each carrying a direction chip,
   the **route**, passenger count and the badge of whoever booked it.
   The route is both ends of that leg — `Solun → Beograd` on a return,
   `Beograd → Hanioti` on a departure — because "↓ Povratak · Beograd" says
   they are arriving but not where from, which is half the dispatch question.
   Where both ends are the same place it collapses to one name.

   **Izaberi — a message for the driver.** Added 25.09.2026 at the owner's
   request, to retire the Viber group every booking used to be posted to and
   forwarded from. An icon in the header, beside Podešavanja, turns on a
   selection mode: a circle appears on each card and each day heading, a tap
   on a card ticks it instead of opening *Detalji* (the card's › is hidden
   for as long as that is true), and a tap on a day heading ticks every leg
   under it on the tab on screen. The *Nova rezervacija* bar becomes
   *Otkaži* and *Kopiraj (N)*. **Kopiraj** puts a plain-text message on the
   clipboard, to be pasted into Viber for one driver — no preview and no
   share menu, the tap copies — then empties the selection and stays in the
   mode, so the next driver's message cannot pick up this one's bookings.
   *Otkaži*, or the header icon again, empties it and leaves.

   - **The selection survives a change of filter, search or tab.** Several
     vans leave for different countries on the same day, and one van's tour
     is its departures to Grčka on one day and its returns from Grčka on
     another. The destination filter does not bring those two together —
     a return's leg ends in Beograd (§5) — so the owner ticks the departures
     under Grčka and the returns on *Povratak* under the date alone, and one
     message holds both. A line above the buttons counts the ticked legs the
     current filter has taken off the screen (*2 izabrane nisu na ekranu*),
     so what was picked earlier is not forgotten.
   - **The message.** A section per direction, *POLAZAK* then *POVRATAK*;
     under each, one heading per date carrying that day's passenger total;
     then each leg — number, name, head count, route, and *Adresa*, *Tel*,
     *Cena*, *Napomena*. Numbers run straight through both sections. Dates
     are always written in full, never *danas* or *sutra*: the message is
     read the next morning. The order is the list's own (§2), not the order
     of tapping. A missing address, price or note drops its whole line
     rather than printing a dash. The route is the card's, so a one-way ride
     home from abroad reads `Solun → Beograd` under *POVRATAK* (§1).
   - **Nothing is stored.** The selection lives on the phone for as long as
     the list is open. There is no "poslato" and there will not be one —
     that would be a `status`, which standing rule 2 forbids. What was sent
     is in the Viber chat.
   - **Prepared on the server, joined on the phone.** iOS lets a page write
     to the clipboard only synchronously inside the tap, so every leg on
     screen arrives with the page already formatted — phone number, price,
     route — and the phone only sorts and joins. That is also why *Kopiraj*
     works with no signal. `src/domen/poruka.ts`,
     `src/domen/stavka-poruke.ts`, `src/components/izbor-za-vozaca.tsx`.
2. **Filter** — bottom sheet, date chips, and the destinations as **chip
   groups**: each country followed by what sits under it, a region with several
   towns opening them on its chevron. A filled chip is one you picked, a soft
   one is one you are getting because something over or under it is picked.
   *Primeni* / *Obriši sve*.
3. **Nova / Izmeni rezervaciju** — the **route block first**: two rows, each
   reading `Grčka › Kasandra › Hanioti` with its date under it, the ⇅ swap on
   the hairline between them and the *Jednosmerna vožnja* switch beneath (§5).
   Tapping a row opens **one sheet holding that whole leg** — Država, Regija,
   Grad *and* the date, all on screen at once; *Potvrdi* writes them back
   together. A level whose turn has not come is greyed out rather than absent,
   because "not yet" and "not part of this" are different things to say. Then
   one card of Ime / Telefon / Adresa, the head count and price side by side,
   and the note last. Native date pickers, big touch targets.

   > **Amended 09.09.2026, hours after the first cut, at the owner's request.**
   > The sheet revealed one dropdown at a time and asked for the date back on
   > the form. Both were wrong for the same reason: a leg is settled in one
   > breath — country, region, town and day are one answer — so the screen has
   > to ask for it in one place, all at once.
   >
   > **The *Povratak* sheet opens without taking a field**, unlike *Odlazak*.
   > Also his call, the same day. A dialog normally puts the cursor in its
   > first control, which saves a tap on a blank outbound leg and is an
   > unasked-for highlight on a return that already says Beograd — where the
   > reason for opening it is usually the date.
4. **Detalji** — full booking with *Pozovi* and *Viber* straight off the phone
   number, plus edit and delete. A round trip reads *Polazak / Povratak*; a
   one-way reads **Odakle / Kuda / Povratak nije dogovoren**, so the origin is
   never invisible.

Plus **Podešavanja** — two settings that are not the same kind of thing:

- **Izgled** — *Svetla* or *Tamna*, added 09.09.2026 at the owner's request.
  **Every account has it**, driver included: it is the only control on that
  screen that is about the phone in the hand rather than about the business.
  It applies on the tap, with no *Sačuvaj* and nothing sent to the server.
- **Podrazumevano mesto povratka** — the one shared `settings` row, so it is
  the same for every crew and only an owner may change it.

### The theme is stored on the phone, not on the account

A `localStorage` key. No column, no migration, no round trip — and it works
with no signal, which a theme that had to be fetched would not. Two people
sharing one account on two phones each get the app the way they want it, and
the same person's second phone is simply a second choice to make. That is the
right shape: the reason to want a dark screen is the light in the room, not
who is holding it.

**There are two buttons, not three — no *Sistemski*.** Until one is tapped the
phone is still in charge, and it keeps being in charge while the app is open,
so an app whose owner never opens Podešavanja behaves exactly as it always
did. The first tap is what freezes it, and from then on the phone is ignored.

The class goes on `<html>` from a **blocking inline script** in `layout.tsx`,
before the first paint — anything later would paint the wrong theme and correct
it a frame afterwards. That script also strips `media` off the `theme-color`
tags and sets them to the chosen theme's colour, because those tags are matched
on the *phone's* preference and the switch is precisely what overrides it; a
light status bar over a dark screen is the seam §7 is trying not to have.

With JavaScript off there is no stored choice to honour, and the palette falls
back to the phone's own preference exactly as before.

**Povuci da osvežiš** — on every screen, added 07.09.2026 at the owner's
request. Installed to the home screen there is no address bar and so no reload
button, and the only way to see a booking a colleague had just entered was to
close the app and open it again. Pulling down from the top of any screen
re-fetches it. It is `router.refresh()` rather than a full reload, so a
half-typed booking survives an accidental pull; and with no connection it says
so rather than spinning, because a refresh that appears to work is how a stale
list gets trusted. See `src/components/povuci-za-osvezavanje.tsx`.

---

## 7. Working from another country

It is a web app on a URL, so it works from anywhere with a connection. Three
things make that actually true rather than nominally true.

1. **One fixed business timezone — Europe/Belgrade.** The whole app hinges on
   "has the departure passed?" Read that from the phone clock and a late night
   in Greece flips bookings a day early, and the two accounts see different lists.

   ```ts
   new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Belgrade' }).format(new Date())
   // → "2026-08-27"   (sv-SE emits ISO format natively)
   ```

2. **Phone numbers stored international.** `064 123 4567` will not dial from a
   Greek network. `+381 64 123 4567` dials from anywhere — the form normalizes on save.
   Viber matches contacts on that same international form, which is why the
   *Viber* button passes the `+` along rather than stripping it.

3. **Deploy to an EU region** (Frankfurt) to keep it quick across the Balkans and
   Western Europe.

The list is cached, so the app opens and shows the schedule with no signal.
Adding and editing need a connection.

---

## 8. Decisions locked

| Decision | Choice | Trade accepted |
|---|---|---|
| Trip shape | Return leg **optional**, with an explicit *Jednosmerna vožnja* option (§5) | One-way and "return not agreed yet" look identical in the data |
| Time of day | Dates only, **no times** | Departure times live in his head. Column drops in later without touching anything else. |
| Home destination | Default town in settings, pre-fills, editable | — |
| Light or dark | **Two buttons in Podešavanja, stored per phone** (§6, added 09.09.2026) | The choice does not follow the account to a second device. No *Sistemski* option either — instead an untouched app keeps following the phone, so the default costs nobody anything |
| List shape | **Two tabs, *Odlasci* and *Povratak*, one row per leg** (§2) | A round trip is two rows and is counted twice. The main leg rule no longer decides what the list shows — it keeps *Detalji* and the direction chip. Added 09.09.2026 at the owner's request, so that a homecoming is visible before the van has left. |
| Departed, no return date | **Drops off the list**; findable by search **or** by filtering its past departure date | Possible to forget someone who is abroad. **Reaffirmed 01.09.2026** after seeing it on real data, and **again 09.09.2026**: asked directly whether these should be shown at the top of *Povratak* under "Povratak nije dogovoren", the owner chose to leave it as it is. He searches the name and edits, or enters a new booking. |
| Language | Serbian, **Latin script** | — |
| Driver's message | **Izaberi → Kopiraj**, plain text on the clipboard, pasted into Viber by hand (§6, added 25.09.2026) | No preview and no share menu — the tap copies. Nothing records what was sent, because that would be a `status`. The Grčka filter does not reach the returns from Grčka; they are picked on *Povratak* by date, and the selection survives the filter change to allow it. |
| Messenger on *Detalji* | **Viber** (`viber://chat?number=%2B381…`) | Changed 06.09.2026 at the owner's request; it was WhatsApp before. Viber has no `wa.me` equivalent, so the button is a deep link into the app: it does nothing at all on a device without Viber, where the old link at least opened a web chat. *Pozovi* is the fallback. |
| Delete | **Permanent**, confirm dialog only | No undo, no recycle bin. The nightly backup (§9) is the only net — it is not optional, and it now exists. |
| Destinations | **Reference data** from eurotravel.rs, plus *Drugo — upiši ručno* (§5, amended 06.09.2026) | A typed place becomes a permanent row. Misspellings cannot be deleted, only deactivated — the case- and diacritic-insensitive match against the existing list is what keeps that rare. |
| Cascade depth | **Povratak** always Država → Grad (06.09.2026); **Odlazak** keeps Regija only where it narrows the town list — Grčka and Hrvatska today (§5, amended 09.09.2026) | The two legs no longer look alike, and neither do two countries on the same leg. A town entered with no region becomes its own, so the same place can enter the table by several routes — matching by country and name is what keeps them one row. The depth is now a property of the data, so a re-seed can change it; the seed test is the alarm. |
| Destination filter | **One canonical list**, grouped by country only | — |
| Accounts | Created in the Supabase dashboard; `profiles` is the access list (§9) | Adding a person is two steps, and skipping the second locks them out rather than letting them in |
| Pickup towns | **Beograd** (default) and **Niš** only (§5) | Not from the client's site; maintained by hand in `data/destinacije.json`. More are one edit plus a re-seed away |

---

## 9. Stack

| Layer | Pick |
|---|---|
| Framework | Next.js (App Router), TypeScript strict |
| Database | **Supabase** Postgres, EU (Frankfurt) |
| ORM / migrations | Drizzle + drizzle-kit — owns the schema |
| Auth | **Supabase Auth**, email/password, cookie sessions via `@supabase/ssr` |
| Access control | **RLS policies**, written in migrations — the real security boundary. Every policy tests `je_clan()`: a row in `profiles` |
| Styling | Tailwind v4 |
| Components | shadcn/ui — Sheet, Dialog, Input, Button, Checkbox only |
| Validation | Zod, shared client + Server Action |
| Forms | Server Actions + `useActionState` |
| Dates | `date-fns` + `srLatn` locale; `Intl` for the Belgrade "today" |
| Phones | `libphonenumber-js/min`, default country `RS` |
| PWA | `@serwist/next` |

### Services

| Service | Use | Cost |
|---|---|---|
| Supabase | Postgres + Auth, EU (Frankfurt) | Free tier — see caveats |
| Vercel | Next.js hosting, auto-deploy from GitHub | Free (Hobby) |
| GitHub | `PetarSosic/Rezervacije` — repo, CI, nightly backup job | Free |
| ~~Sentry~~ | **Declined 05.09.2026** — see below. Vercel's runtime logs plus `/api/health` instead. | — |
| Domain | Skip initially; `*.vercel.app` is fine once it is a home screen icon | ~€10/yr |

**Total running cost: €0.**

No email service (no signups, no password reset — reset in the Supabase dashboard).
No analytics (two users).
No error reporting service — see below.

### No Sentry — decided 05.09.2026

Earlier drafts of this document listed Sentry, and Phase 8 planned it with PII
scrubbed in `beforeSend`. The owner chose not to add it. Recording the reasoning
rather than just the outcome, because "why is there no error tracking?" is a
fair question for whoever reads this next:

- **This app stores real customers' names and phone numbers.** An error report
  carries whatever was in scope when it was thrown. Scrubbing can be made
  correct, but it has to *stay* correct through every future change, and a
  mistake in it sends a stranger's phone number to a third party.
- **Two users, one owner.** The population that could hit an unreported bug is
  two people who can describe it in a sentence.
- **The two failures that actually take this app down are already covered.**
  A paused Supabase project and an unreachable database both show up in
  `/api/health`, and the nightly backup job goes red. Neither needs Sentry.

The cost of this decision is real and worth naming: a runtime error that does
not take the app down will be noticed only when somebody mentions it. If that
starts happening, revisit — Sentry with a strict `beforeSend` remains the right
answer, not a different service.

### Who sees what — teams and roles (06.09.2026)

`profiles` is still the access list, and is now also the authorisation model.

| | Sees | May |
|---|---|---|
| `admin` | every booking, every team, every account | manage teams and accounts; file a booking under any team or under none |
| `korisnik` | their own team's bookings, their own teammates | enter, edit and delete their team's bookings |

Visibility inside a team is always mutual — that is what makes it a team rather
than a list of permissions. A driver cannot see that accounts outside their team
exist at all: not in a member list, not in a badge, and `/nalozi` returns 404
rather than 403, because a 403 would confirm the screen is real.

**Edit and delete stay team-wide.** `kreirao` remains a badge and never a
permission: within one team anybody may fix anybody's booking, which is what a
shared book means. Deletion is still permanent (§8).

**`aktivan` governs signing in and never visibility.** Deactivating a driver
locks them out on their next request; the bookings they entered stay visible to
their team, which is what the team needs after that person stops working. It has
to work this way because a `profiles` row cannot be deleted once that person has
entered a booking — `reservations.kreirao` is `ON DELETE RESTRICT` and
`profiles.id → auth.users.id` is `ON DELETE CASCADE`, so the delete fails from
both ends. Deactivation is not a soft alternative to removal; it is the only
removal there is.

> **Where the boundary actually is.** The screens read through Drizzle, which
> connects as the table owner and **bypasses RLS**, so the visibility rule is
> enforced by the `WHERE` clause in `src/db/vidljivost.ts`. The RLS policies in
> migration `0004` express the same rule independently for the PostgREST
> surface. They cannot be one shared Postgres function — such a function reads
> `auth.uid()`, which is NULL over the app's connection — so
> `npm run provera:vidljivost` reconciles the two against real data.

### Who may enter — `profiles` is the access list

Corrected 01.09.2026. This section previously asserted "no signups" as a fact.
It was not one: signups were **enabled** on the live project, and a stranger who
confirmed an email could have signed in and read — or deleted — every booking,
because the policies then read `USING (true)` for any authenticated user.

Both halves are now closed:

1. **Signups disabled** in the Supabase dashboard.
2. **Membership is the rule in the database.** Migration `0003` adds
   `public.je_clan()` — `SECURITY DEFINER`, so the policy on `profiles` can
   consult `profiles` without infinite recursion — and every policy on all four
   tables tests it. An `auth.users` row with no `profiles` row reads nothing and
   writes nothing.

The app repeats the check where the data is: `prijaviSe` revokes the session it
just minted if the account has no profile, and `src/proxy.ts` counts "logged in"
as *session **and** profile*, so a stray account is turned away rather than
bounced between `/` and `/prijava` forever.

Adding a person is two steps — create the account in the dashboard, then insert
their `profiles` row. Removing one is a single row delete. See `RUNBOOK.md`.

> **Why the app checks at all, when RLS is the boundary:** the screens read
> through Drizzle, which connects as the table owner and *bypasses RLS*. For a
> REST call with the publishable key RLS holds; for a server render it is not in
> the path at all. So the check is repeated in `zahtevajKorisnika()`.

### Two free-tier caveats that matter here

**Projects pause after 7 days of inactivity.** For a seasonal transport business a
quiet week in winter would take the app offline until someone unpauses it.

**The free tier has no daily backups**, and deleting a reservation in this app is
permanent.

Both are solved by one nightly GitHub Action that runs `pg_dump` against the
direct connection: it produces a real backup **and** the daily query counts as
activity, so the project never pauses.

**Built 01.09.2026** — `.github/workflows/rezerva.yml`, nightly at 01:30 UTC.
It installs `pg_dump` 17 (the server is 17.6 and the runner ships 16, which
refuses), dumps the `public` schema only — never `auth`, so a backup can never
leak password hashes — writes a human-readable CSV of every booking, and commits
both to the orphan branch `rezerve`, where nothing expires. It refuses to commit
a dump that is missing tables or suspiciously small, because a backup that
silently contains nothing is worse than none.

A restore was **performed and verified**, not merely enabled: the dump was
replayed into a scratch schema inside a transaction and rolled back, returning
67 destinacije — 45 after the same-day trim of the withdrawn Serbian towns — plus
2 profila, 8 rezervacija and 1 settings row. Procedure in `RUNBOOK.md`.

If the owner later wants managed backups and no pause risk, that is Supabase Pro
at $25/month. Not needed to launch.

### CI

`.github/workflows/provera.yml`, added 04.09.2026 with the move to the
`PetarSosic` account. Runs on every push to `main`, every pull request against
it, and on demand. Three jobs:

| Job | What it guards |
|---|---|
| `provera` | `npm ci`, typecheck, lint, the full test suite |
| `zone` | `test:tz` — the suite under five timezones, which must agree |
| `gradnja` | `npm run build` plus a grep proving no secret reached the client bundle |

`zone` is the one that earns its keep. The suite is the only thing standing
between a deployment runtime with a small-ICU Node and `Intl.Collator("sr-Latn")`
silently falling back to root collation — which would sort `Čačak` before
`Cetinje` and break every list in the app in a way no page would report. Until
04.09.2026 this section listed CI as a service in use while nothing ran the
tests at all; that is now true rather than aspirational.

`gradnja` builds with **placeholder** environment values, never the real ones.
`src/env.ts` throws on a missing variable, so the build needs them to exist — but
not to work, because the postgres client is lazy and every data route is dynamic,
so nothing queries at build time. A CI job holding the real secret key would put
it one `echo` away from a public log, to prove nothing the job is there to prove.

### Deliberately not using

Prisma (query-engine binary bloats the image) · MUI/Chakra (too much CSS for a
phone) · Redux/Zustand (server components hold the state) · tRPC (Server Actions
cover every call) · Auth.js / bcrypt / Lucia (Supabase owns auth) · Supabase
Realtime (nice for live updates between the two accounts — v2, not v1).

---

## 10. Not in v1

Cene i naplata · Vozila i vozači · Ponavljajuće ture · SMS podsetnici ·
Izvoz u kalendar · Imena pojedinačnih putnika · Vreme polaska · Istorija izmena

All of it drops onto this schema later without a rewrite.

---

## 11. Open items

- [x] ~~Account credentials~~ — created in the Supabase dashboard; `profiles` is
      the access list (§9). No self-registration, and signups are disabled.
- [x] ~~Number of dropdown levels~~ — **confirmed three**: Država → Regija → Grad,
      with the third auto-selected and hidden for single-city regions.
- [x] ~~Default home destination for Podešavanja~~ — confirmed `Srbija › Beograd › Beograd`
- [x] ~~Should inactive countries (Slovenija, BiH) be bookable anyway?~~ — **no.**
      Hidden from the new-booking dropdowns, still fully resolvable on existing
      bookings, and still in the filter for as long as a booking references one.
- [x] ~~`password_hash` on `profiles`~~ — **dropped.** Supabase Auth owns
      credentials; see §4 and §9.
- [x] ~~Backups~~ — nightly `pg_dump` built and a restore verified (§9).
- [ ] Re-check `data/destinacije.json` against the live site before launch — the
      Greek, Croatian and other entries were captured 27.08.2026 and the client
      edits their own site. Beograd and Niš are ours and need no check.
- [ ] **A trip with three distinct places** — pick up in Niš, drive to Grčka,
      return to Beograd — cannot be expressed (§4). Needs a tenth column. Not
      in v1; revisit if the owner starts running pickups he does not return to.

---

## 12. Changelog

**25.09.2026** — *Izaberi*: a message for the driver, to retire the Viber
group (§6, screen 1). Selection mode on the list, *Kopiraj* puts one driver's
bookings on the clipboard as plain text. No schema change; the selection is
phone state only and `src/db/kolone.test.ts` is untouched. The destination
filter is **deliberately unchanged** — reaffirmed by the owner the same day
(§5) — and `liste.test.ts` and `faza7-kapija.test.ts` pass without edits,
which is the evidence that it did not move. The note now reaches one more
reader, the driver, through this message; it still reaches no list, filter,
sort or search (§4).

**11.09.2026** — a one-way ride home from abroad (§1, §5) now resolves to
↓ Povratak instead of ↑ Odlazak, everywhere direction is read from: the list
tab, the same-day sort tie-break, and the *Detalji* chip. Scoped to genuine
cross-border homecomings — *Kuda* Serbian, *Odakle* not — so an ordinary
domestic one-way (Kopaonik with no return date yet) is unaffected.

**09.09.2026** — two tabs: *Odlasci* and *Povratak*, no sort, a theme switch,
the region only where it earns a tap, and the form and filter restyled from a
design canvas.

- **§6, screens 2 and 3, rebuilt from `Rezervacije UI.dc.html`** — a Claude
  Design canvas of the owner's, imported through the design MCP. The form leads
  with the route as two readable rows and puts the cascade behind them in a
  sheet; the filter trades its checkbox tree for chip groups. A petrol accent
  arrives with them, as its own palette (`--akcenat`) used **only on those two
  screens** — the owner scoped the change to them, so Lista, Detalji and
  Podešavanja stay neutral.
- Two things the canvas could not decide, because an artboard is a still
  picture, and the owner did: tapping a route row opens the cascade rather than
  replacing it, and a region chip still opens its towns, so filtering down to
  Hanioti alone survives (SPEC §3).

- **§5: the *Odlazak* leg drops the region** wherever it narrows nothing. The
  owner asked for Srbija; the rule he approved is "more than one region, and
  some region holding more than one town", which today means Grčka and Hrvatska
  keep it and Srbija, Makedonija, Italija, BiH and Slovenija lose it. A rule
  rather than a country name, per §5's own instruction, with the current answer
  pinned by a test on the seed data.
- **§6 gains *Izgled*** — *Svetla* / *Tamna* in Podešavanja, on every account,
  stored per phone in `localStorage`. `globals.css` moves to the two-branch
  form its own note had been describing since the dark palette went in: a
  `prefers-color-scheme` branch guarded by `:not(.svetla)`, plus a `.tamna`
  branch. Two buttons and no *Sistemski*, so an untouched app still follows the
  phone.
- **§3 loses the sort**, at the owner's request, later the same day. The
  *Sortiranje* section of the filter sheet is gone — date or destination,
  ascending or descending — and with it the `sort` and `smer` URL parameters,
  the `Sortiranje` types, and the flat no-headings list shape that only the
  destination sort produced. The order is fixed in §2: by date, soonest first.
  An old link still carrying `?sort=` opens on that one order.
- **§2 is now the tabs**, at the owner's request. A row on the list is a **leg**,
  not a booking, so a round trip appears in both tabs — under its departure date
  in one and its return date in the other. Swipeable with a thumb; the tab lives
  in the URL as `?tab=povratak`.
- **§1's rule no longer picks the row for the list**, and that is a supersession,
  not a clarification. It is recorded as one. The rule is unchanged and still
  owns *Detalji* and the direction chip — what changed is that a homecoming is
  now visible before the van has left, which is the whole reason the tabs were
  asked for.
- **All three modes stayed**, and are now distinguished by their horizon alone:
  today forward, inside the chosen range, or none at all. The *Polasci /
  Povratci* split inside a day in **Dan** is gone — the tabs are that split.
- **§1's accepted trade was put to the owner again and stands.** Asked whether a
  booking that departed with no return date should be surfaced on *Povratak*
  under "Povratak nije dogovoren", he chose to leave it as it is. Reaffirmed
  twice now: 01.09.2026 and 09.09.2026.

**07.09.2026** — address, price and note.

- **§4 gains three columns** at the owner's request: `adresa` (the pickup
  address in Belgrade), `cena` (whole euros) and `napomena` (a free-text
  description). Migration `0005`.
- **`napomena` reverses "no notes"**, which §4 had stated and 01.09.2026 had
  reaffirmed. Recorded as a reversal, with what the original decision was
  protecting and why that still holds — see §4.
- **Standing rule 2's forbidden list shortens by one.** No `status` and no
  timestamps, still. `src/db/kolone.test.ts` remains the guard and its column
  list is still exhaustive.
- **§6 gains "Povuci da osvežiš"** on every screen, so one crew member sees
  another's booking without closing the app. Same root cause as the Viber bug
  below: standalone mode has no browser chrome, so anything the browser would
  normally provide has to be built.
- **Also fixed, from the same day:** the *Viber* button did nothing when
  tapped. The link was correct all along; iOS drops a custom-scheme
  navigation that comes from an anchor when the app runs from the home screen
  (`display: "standalone"`), so it is now performed by script in a click
  handler. `tel:` is exempt from that rule, which is why *Pozovi* never
  broke. See `src/components/dugmad-kontakta.tsx`.

**06.09.2026** — teams and roles. The app stops being a two-person book.

- **§4 gains a tenth column**, `tim_id`, and **standing rule 2 was amended** to
  say what it always meant: the nine columns *describing the trip* are fixed.
  The forbidden list is unchanged — no `status`, no `napomena`, no timestamps.
- **§9 gains "Who sees what"**: `admin` and `korisnik`, teams as the unit of
  visibility, `aktivan` as the only working revocation.
- **The design was reversed once, before any of it shipped.** Visibility was
  first derived from the booking's author, which is elegant and wrong here: the
  owners are the dispatchers, so every booking they entered would have been
  invisible to the driver who had to drive it — silently, because an absent
  booking is indistinguishable from a quiet day. That is the same failure §1's
  edge case already accepts once, and once is enough. Recorded because the
  reasoning is the useful part.
- **§9 now states where the boundary is.** RLS is not in the app's read path at
  all. Under a flat book that was a footnote; with teams it is the whole thing.

**01.09.2026** — this document was brought back in line with the code after
Phases 3–5. It had drifted in six places, and one of them was a security
property (§9) asserted as fact that was not true. Changes: three list modes
(§2), no `password_hash` and no origin column (§4), 45 destinations with Beograd
and Niš as the two Serbian pickup points (§5), the *Jednosmerna vožnja* option
(§5), route on the cards (§6), `profiles` as the access list and backups built
and restore-verified (§9).

**04.09.2026** — corrections from the Phase 7 verification gate. The gate found
no defect in the domain core; everything below is this document being wrong about
code that was right.

- **§5, the destination filter is scoped to the leg, not the booking.** The
  earlier wording — "matches bookings that reference it from either column" —
  read as row-scoped and contradicted §1's own worked example. The owner settled
  it in favour of the leg. The consequence is now stated in full, including the
  booking that cannot be reached by filter at all.
- **§5, counts.** "44 rows" → **45**; single-city regions "33" → **11**. The 33
  was true only during the hours the withdrawn Serbian towns were in the file.
  Recounted from `data/destinacije.json`: 7 countries · 18 regions · 45 cities ·
  11 single-city regions, which is what the section heading already said.
- **§9, CI was listed as a service in use. It does not exist.** `.github/` holds
  only the nightly backup. Given a new subsection, because nothing running the
  suite on push is a real gap, not a formality.
- **§9, the verified restore returned 67 destinacije (45 after the trim)**, not
  44. `RUNBOOK.md` carried the same stale figure and was corrected with it.

**Standing rule:** if the code and this file disagree, that is a bug in one of
them — report it rather than quietly following whichever is nearer.
