/**
 * One row of the list (SPEC §6, screen 1).
 *
 * It renders a `StavkaListe` — a *leg*, not a reservation. That distinction is
 * the whole point of the domain layer: in Dan mode a same-day round trip
 * produces two of these cards for one booking, one departure and one return,
 * each showing its own date and its own destination. The card never re-derives
 * which leg to show; it is told.
 *
 * `stavka.kljuc` (`<id>#<smer>`) is the React key the caller must use — the
 * reservation id alone is not unique here.
 */
import Link from "next/link";
import { ChevronRightIcon } from "lucide-react";
import { BedzAutora } from "@/components/bedz-autora";
import { CipSmera } from "@/components/cip-smera";
import { imeDestinacije } from "@/domen/destinacije";
import { jeIstaTacka, rutaEtape, strukturniSmer } from "@/domen/glavna-etapa";
import type { StavkaListe } from "@/domen/tipovi";
import { T, putnika } from "@/lib/tekst";

/**
 * A card never carries its own date. It used to, when the list could be sorted
 * by destination and the dates were scattered with no day heading to read them
 * off; the sort controls went on 09.09.2026 and every card is under a heading
 * again, where a date on the card would only repeat it.
 */
export function KarticaRezervacije({
  stavka,
  povratak,
}: {
  stavka: StavkaListe;
  /** Where the detail screen should send the user back to — the filtered list. */
  povratak: string;
}) {
  const { rezervacija, autor } = stavka.red;
  // Both ends of this leg, so a return says where they are coming *from* and
  // not just that they are arriving. Inferred from the two destination
  // columns — see `rutaEtape`. `stavka.smer` can be relabelled for a ride
  // home from abroad, so the route formula goes through `strukturniSmer`
  // rather than `stavka.smer` directly.
  const ruta = rutaEtape(stavka.red, strukturniSmer(stavka.red, stavka));

  return (
    <Link
      href={`/rezervacija/${rezervacija.id}?nazad=${encodeURIComponent(povratak)}`}
      // min-h-16 keeps the whole card well past the 44px touch target even
      // when a name is short enough to wrap to one line.
      className="flex min-h-16 items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 transition-colors active:bg-muted hover:bg-muted/60"
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <div className="flex min-w-0 items-center gap-2">
          <span className="truncate font-medium">{rezervacija.ime}</span>
          <BedzAutora autor={autor} className="ml-auto" />
        </div>
        <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
          <CipSmera smer={stavka.smer} />
          {jeIstaTacka(ruta) ? (
            // Both ends are the same place — a one-way ride home, where no
            // origin was ever stored. One name is the whole truth.
            <span className="truncate">{imeDestinacije(ruta.do)}</span>
          ) : (
            <span className="flex min-w-0 items-center gap-1">
              {/* The origin is the half that ellipsizes: the destination is
                  what the driver is being told, so it never shrinks. */}
              <span className="truncate text-muted-foreground/80">
                {imeDestinacije(ruta.od)}
              </span>
              <span className="shrink-0 text-muted-foreground/60">→</span>
              <span className="shrink-0 font-medium text-foreground">
                {imeDestinacije(ruta.do)}
              </span>
            </span>
          )}
          <span aria-hidden="true">·</span>
          <span className="shrink-0">{putnika(rezervacija.brojPutnika)}</span>
        </div>
      </div>
      {/* `data-strelica` lets selection mode hide the arrow — see
          `IzborStavke` in izbor-za-vozaca.tsx. */}
      <ChevronRightIcon
        aria-hidden="true"
        data-strelica=""
        className="size-4 shrink-0 text-muted-foreground"
      />
      <span className="sr-only">{T.lista.otvori}</span>
    </Link>
  );
}
