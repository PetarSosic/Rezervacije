/**
 * The server half of the driver's message: one list leg → one `StavkaPoruke`.
 *
 * **Why the message is built in two places.** iOS Safari lets a page write to
 * the clipboard only synchronously inside the tap that asked for it, so the
 * text the owner pastes into Viber has to be composed on the phone with no
 * request and no `await` (see `poruka.ts`). Everything that needs a library
 * or the joined row is therefore done **here, on the server**, ahead of time:
 * the phone number through libphonenumber, the price through `formatCena`,
 * the route off both destination columns. The phone receives plain strings
 * and only sorts and joins them.
 *
 * Imported only by Server Components, by convention. It does not carry
 * `import "server-only"`, because that import throws under a plain vitest run
 * — the same reason `tipovi.ts` declares its row type structurally instead of
 * importing it from `src/db/queries.ts`.
 *
 * **The selection is phone state only.** Nothing here writes: no "poslato"
 * column exists and none is coming — standing rule 2 forbids a `status`, and
 * `src/db/kolone.test.ts` is the guard.
 *
 * **The destination filter is deliberately unchanged** (the owner's decision,
 * 25.09.2026): filtering Grčka shows only departures to Grčka, because a
 * return's destination is Beograd, and he picks the returns on the *Povratak*
 * tab filtered by date alone. One message is assembled across several
 * filtered renders, so the selection must survive a filter change — which is
 * why a `StavkaPoruke` is self-contained: it carries everything the message
 * needs, and a leg ticked under one filter can still be printed after the
 * next filter has taken its card off the screen.
 *
 * Not in the `index.ts` barrel: this file drags libphonenumber, so both halves are imported by path.
 */
import { formatCena } from "@/lib/novac";
import { formatTelefon } from "@/lib/telefon";
import { imeDestinacije } from "./destinacije";
import { jeIstaTacka, rutaEtape, strukturniSmer } from "./glavna-etapa";
import type { StavkaPoruke } from "./poruka";
import type { StavkaListe } from "./tipovi";

/**
 * One list leg, formatted for the message.
 *
 * `smer` is the leg's **tab** direction, so a one-way ride home from abroad
 * (SPEC §1, amended 11.09.2026) lands under *POVRATAK* exactly as it lands on
 * the *Povratak* tab. The **route**, though, goes through `strukturniSmer`,
 * never `s.smer`: that relabelled `smer` fed to `rutaEtape` would draw the
 * ride home backwards. The route text is what `kartica-rezervacije.tsx`
 * draws — both ends, or one name when both ends are the same place — so the
 * driver reads the same route the owner ticked.
 *
 * `adresa` and `napomena` pass through untouched, `null` included; deciding
 * that a blank one prints nothing is `sastaviPoruku`'s job, in one place.
 */
export function stavkaPoruke(s: StavkaListe): StavkaPoruke {
  const { rezervacija } = s.red;
  const ruta = rutaEtape(s.red, strukturniSmer(s.red, s));

  return {
    kljuc: s.kljuc,
    smer: s.smer,
    datum: s.datum,
    mesto: imeDestinacije(s.destinacija),
    ime: rezervacija.ime,
    brojPutnika: rezervacija.brojPutnika,
    ruta: jeIstaTacka(ruta)
      ? imeDestinacije(ruta.do)
      : `${imeDestinacije(ruta.od)} → ${imeDestinacije(ruta.do)}`,
    adresa: rezervacija.adresa,
    telefon: formatTelefon(rezervacija.telefon),
    cena: rezervacija.cena === null ? null : formatCena(rezervacija.cena),
    napomena: rezervacija.napomena,
  };
}
