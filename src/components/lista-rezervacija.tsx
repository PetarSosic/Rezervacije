/**
 * The body of one tab — SPEC §2 and §6, screen 1.
 *
 * A Server Component with no state of its own. It is handed an already
 * resolved and already sorted `StavkaListe[]`, all of it one direction, and
 * decides only how to break it into headings.
 *
 * Cards are always grouped under day headings, because there is always exactly
 * one order — by date, soonest first. Until 09.09.2026 the list could also be
 * sorted by destination, which scattered the dates and made grouping by day
 * emit a column of one-row groups; that branch went with the sort controls.
 *
 * There is no *Polasci / Povratci* split inside a day any more either, and
 * nothing for one to do: the two directions are the two tabs, so every row on
 * this screen already points the same way.
 *
 * The day heading and each card are wrapped by `IzborDana` / `IzborStavke`
 * (`src/components/izbor-za-vozaca.tsx`), which read the selection-mode
 * context above this tree and, out of that mode, render through to exactly
 * what was here before.
 */
import { IzborDana, IzborStavke } from "@/components/izbor-za-vozaca";
import { KarticaRezervacije } from "@/components/kartica-rezervacije";
import { grupisiPoDanu } from "@/domen/liste";
import type { StavkaListe } from "@/domen/tipovi";
import { naslovDana, type Datum } from "@/lib/datum";

export function ListaRezervacija({
  stavke,
  danas,
  povratak,
}: {
  stavke: StavkaListe[];
  danas: Datum;
  povratak: string;
}) {
  if (stavke.length === 0) return null;

  return (
    <div className="flex flex-col gap-5">
      {grupisiPoDanu(stavke).map((grupa) => (
        <section key={grupa.datum}>
          <IzborDana
            kljucevi={grupa.stavke.map((s) => s.kljuc)}
            className="mb-2 text-sm font-semibold text-muted-foreground"
          >
            {naslovDana(grupa.datum, danas)}
          </IzborDana>
          <ul className="flex flex-col gap-2">
            {grupa.stavke.map((s) => (
              <li key={s.kljuc}>
                <IzborStavke kljuc={s.kljuc}>
                  <KarticaRezervacije stavka={s} povratak={povratak} />
                </IzborStavke>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
