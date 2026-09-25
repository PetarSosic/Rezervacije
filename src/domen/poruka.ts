/**
 * The driver's message — the plain text that replaces the Viber group.
 *
 * Every booking used to be posted to a Viber group and forwarded to whichever
 * driver was taking it. The owner is retiring that group: on the list he
 * enters a selection mode, ticks legs, taps *Kopiraj*, and a message for one
 * driver lands on the clipboard to be pasted into Viber by hand. Several vans
 * leave for different countries on the same day, so one message is one tour —
 * the Greek driver's departures *and* his returns, and nothing else.
 *
 * **Why this is split in two files.** iOS Safari lets a page write to the
 * clipboard only synchronously inside the tap that asked for it; await a
 * network round trip first and the write is refused. So the message must be
 * composable on the phone with no request and no `await`. The **server**
 * preformats each leg into a small plain `StavkaPoruke` — the phone number
 * through libphonenumber, the price through `formatCena`, the route off the
 * two destination columns — in `stavka-poruke.ts`; this file, which ships to
 * the phone, only sorts and joins. That is why it imports nothing heavier
 * than the date and text helpers, and never `src/lib/telefon.ts`.
 *
 * **The selection is phone state only.** Nothing is stored: there is no
 * "poslato" column and there will not be one — standing rule 2 forbids a
 * `status`, and `src/db/kolone.test.ts` is the guard. A message that was sent
 * is a fact about a Viber chat, not about the booking.
 *
 * **The destination filter is deliberately unchanged** (the owner's decision,
 * 25.09.2026). Filtering Grčka shows only departures to Grčka, because a
 * return's destination is Beograd; he picks the returns on the *Povratak* tab
 * filtered by date alone. One message is therefore assembled across several
 * filtered renders, which is why the selection has to survive a filter change
 * and why the order below cannot be a position on screen.
 *
 * Not in the `index.ts` barrel: its server half drags libphonenumber, so both halves are imported by path.
 */
import { formatDatum, imeDana } from "@/lib/datum";
import { T, putnika, uporediTekst } from "@/lib/tekst";
import { uporediDatume } from "./sortiranje";
import type { Datum, Smer } from "./tipovi";

/**
 * One ticked leg, already formatted by the server — everything the message
 * needs and nothing the phone would have to compute with a library.
 *
 * Plain strings, numbers and nulls only, so it crosses the Server → Client
 * Component boundary as it is.
 */
export type StavkaPoruke = {
  /** StavkaListe.kljuc — `<id>#<smer>`. Identity, and the last sort key. */
  kljuc: string;
  /** The leg's smer as the TAB shows it (so a one-way ride home from abroad is "povratak"). Picks the section. */
  smer: Smer;
  datum: Datum;
  /** imeDestinacije(stavka.destinacija) — the list's own sort key 3 (SPEC §2). */
  mesto: string;
  ime: string;
  brojPutnika: number;
  /** Already formatted: "Beograd → Hanioti", or just "Beograd" when both ends are the same place. */
  ruta: string;
  adresa: string | null;
  /** Already formatted with formatTelefon: "+381 64 123 4567". */
  telefon: string;
  /** Already formatted with formatCena: "240 €", or null. */
  cena: string | null;
  napomena: string | null;
};

/** Departures are one section, returns the next — the driver's day in order. */
const REDOSLED_ODELJAKA: Record<Smer, number> = { odlazak: 0, povratak: 1 };

const NASLOV_ODELJKA: Record<Smer, string> = {
  odlazak: T.poruka.polazak,
  povratak: T.poruka.povratak,
};

/** Between the parts of a heading or an item line — the card's own `·`. */
const TACKA = " · ";

/** Between blocks. A blank line is the only structure a chat message keeps. */
const RAZMAK = "\n\n";

/**
 * The message order — **it follows the list, not the order of tapping**.
 *
 *   1. Section — departures, then returns
 *   2. Date ascending
 *   3. Destination A–Z   ┐
 *   4. Name A–Z          ├ the list's own keys 3–5 (`sortiranje.ts`)
 *   5. Reservation id    ┘
 *
 * Keys 2–5 reproduce `sortirajStavke` inside one (section, date) group, so a
 * driver reads a day's pickups in the order the owner saw them on screen.
 * Key 1 is the one place this departs from the list, which puts date first:
 * a message is two sections, not one timeline.
 *
 * **An explicit comparator, not a screen index.** The selection is gathered
 * across several filtered renders — Grčka on *Odlasci*, then a date on
 * *Povratak* — and the position of a card under one filter cannot be compared
 * with its position under another. Comparing the legs themselves can.
 *
 * Key 5 compares `kljuc` rather than a bare id. Inside one section every key
 * ends in the same `#<smer>`, and the id in front of it is a fixed-length
 * uuid, so this is exactly the list's id tiebreak.
 */
export function uporediStavkePoruke(a: StavkaPoruke, b: StavkaPoruke): number {
  return (
    REDOSLED_ODELJAKA[a.smer] - REDOSLED_ODELJAKA[b.smer] ||
    uporediDatume(a.datum, b.datum) ||
    uporediTekst(a.mesto, b.mesto) ||
    uporediTekst(a.ime, b.ime) ||
    (a.kljuc < b.kljuc ? -1 : a.kljuc > b.kljuc ? 1 : 0)
  );
}

/**
 * The value to print, or `null` when there is nothing to print.
 *
 * Blank and whitespace-only count as absent: an empty `Adresa:` line reads as
 * something missing from the message rather than something never given, and
 * the driver would ask. Line endings are brought to `\n` so a note saved from
 * a form (which submits CRLF) does not mix two kinds into one message; the
 * lines themselves are kept exactly as typed.
 */
function vrednost(v: string | null): string | null {
  if (v === null) return null;
  const ociscena = v.replace(/\r\n?/g, "\n").trim();
  return ociscena === "" ? null : ociscena;
}

/** `Adresa: …` — or nothing at all. Never a dash, never an empty label. */
function linija(oznaka: string, v: string | null): string[] {
  const tekst = vrednost(v);
  return tekst === null ? [] : [`${oznaka}: ${tekst}`];
}

/**
 * `POLAZAK · nedelja, 27.09.2026. · 6 putnika`.
 *
 * The date is always written out in full — never *danas* or *sutra*. The
 * message is read the next morning, by someone else, in a chat that keeps it
 * for weeks; a relative date would be wrong by then. That is also why nothing
 * here takes `danas`: the function cannot say "today" because it does not
 * know what today is.
 */
function zaglavlje(smer: Smer, datum: Datum, stavke: readonly StavkaPoruke[]): string {
  const ukupno = stavke.reduce((zbir, s) => zbir + s.brojPutnika, 0);
  return [
    NASLOV_ODELJKA[smer],
    `${imeDana(datum)}, ${formatDatum(datum)}`,
    putnika(ukupno),
  ].join(TACKA);
}

function blokStavke(broj: number, s: StavkaPoruke): string {
  return [
    `${broj}. ${s.ime}${TACKA}${putnika(s.brojPutnika)}`,
    s.ruta,
    ...linija(T.poruka.adresa, s.adresa),
    ...linija(T.poruka.telefon, s.telefon),
    ...linija(T.poruka.cena, s.cena),
    ...linija(T.poruka.napomena, s.napomena),
  ].join("\n");
}

type Grupa = { smer: Smer; datum: Datum; stavke: StavkaPoruke[] };

/** Consecutive runs of one (section, date) — so it must be fed sorted legs. */
function grupisi(stavke: readonly StavkaPoruke[]): Grupa[] {
  const grupe: Grupa[] = [];
  for (const s of stavke) {
    const poslednja = grupe[grupe.length - 1];
    if (poslednja && poslednja.smer === s.smer && poslednja.datum === s.datum) {
      poslednja.stavke.push(s);
    } else {
      grupe.push({ smer: s.smer, datum: s.datum, stavke: [s] });
    }
  }
  return grupe;
}

/**
 * The whole message, ready for the clipboard. Empty selection → `""`.
 *
 * One heading per (section, date), each carrying its own date, so a departure
 * on the 27th and a return on the 28th sit correctly in one message. Items are
 * numbered 1, 2, 3 … straight through both sections, so a number names one
 * passenger in the whole message; one that restarted under *POVRATAK* would
 * name two.
 *
 * Synchronous and free of I/O on purpose; see the file header for the iOS
 * clipboard rule that requires it.
 */
export function sastaviPoruku(stavke: readonly StavkaPoruke[]): string {
  // A copy: the caller's array is the selection as the phone holds it, and
  // sorting it in place would reorder that state behind the caller's back.
  // Deduplicated by `kljuc`, because one leg can be ticked from two filtered
  // renders and must still reach the driver once.
  const jedinstvene = new Map<string, StavkaPoruke>();
  for (const s of stavke) {
    if (!jedinstvene.has(s.kljuc)) jedinstvene.set(s.kljuc, s);
  }
  const redom = [...jedinstvene.values()].sort(uporediStavkePoruke);

  const blokovi: string[] = [];
  let broj = 0;
  for (const grupa of grupisi(redom)) {
    blokovi.push(zaglavlje(grupa.smer, grupa.datum, grupa.stavke));
    for (const s of grupa.stavke) {
      broj += 1;
      blokovi.push(blokStavke(broj, s));
    }
  }
  return blokovi.join(RAZMAK);
}
