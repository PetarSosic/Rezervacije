"use client";

/**
 * Selection mode on the list — retiring the Viber group.
 *
 * Every booking used to be posted to a Viber group and forwarded to whichever
 * driver was taking it. The owner is dropping that group: he taps *Izaberi*
 * in the header, ticks legs across cards and day headings, and *Kopiraj*
 * drops a plain-text message for one driver onto the clipboard, ready to
 * paste. `sastaviPoruku` (`src/domen/poruka.ts`) does the composing; this
 * file only holds the phone-side selection and the two pieces of UI that
 * drive it.
 *
 * **Every leg on screen is preformatted on the server, in full, up front.**
 * `IzborProvider` is handed a `Record<string, StavkaPoruke>` built once in
 * `page.tsx` from both tabs. That is not a convenience — it is what makes the
 * clipboard write legal on iOS at all: Safari only allows
 * `navigator.clipboard.writeText` **synchronously inside the tap that asked
 * for it**, so by the time `Kopiraj` is pressed there must be nothing left to
 * fetch, parse or `await`. `kopiraj()` below calls it with no `await` and no
 * `startTransition` ahead of it, on purpose.
 *
 * **The selection stores the `StavkaPoruke` values themselves, not just the
 * keys.** The owner's own workflow requires it: he ticks Grčka's departures,
 * then changes the filter to a date on the *Povratak* tab — at which point
 * the ticked cards are no longer rendered anywhere, `stavke` no longer
 * carries their keys, and a selection kept as bare strings would have nothing
 * left to print. Keeping the value means a tick survives its card leaving the
 * screen. `kopiraj()` still prefers `stavke[k]` over the stored value when
 * both exist, so a pull-to-refresh that changed a price or a note is what
 * gets printed, not a stale copy.
 *
 * **Why a card is `inert` with a transparent sibling button on top, rather
 * than the tap doing double duty.** Interactive content inside a `<button>`
 * (the card's own `<Link>`) is invalid HTML and unreliable to boot, so the
 * checkbox button is a sibling that sits on top of the whole row instead;
 * `inert` on the card underneath is what stops the `<Link>` beneath it from
 * still being reachable by keyboard or a screen reader while the button
 * covers it.
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { CheckIcon, CopyIcon, ListChecksIcon, MinusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DugmeNove } from "@/components/tabovi-liste";
import { sastaviPoruku, type StavkaPoruke } from "@/domen/poruka";
import { T, putnika, vanEkranaTekst } from "@/lib/tekst";
import type { StanjeUrl } from "@/lib/url-stanje";
import { cn } from "@/lib/utils";

/** How long a status line stays up before it clears itself. */
const TRAJANJE_STATUSA_MS = 4000;

type Status = "kopirano" | "greska" | null;

type Kontekst = {
  ukljucen: boolean;
  /** Everything on the current screen, both tabs — for labels and lookups. */
  stavke: Record<string, StavkaPoruke>;
  izabrani: Map<string, StavkaPoruke>;
  prebaci: (kljuc: string) => void;
  prebaciDan: (kljucevi: readonly string[]) => void;
  ukljuci: () => void;
  iskljuci: () => void;
  vanEkrana: number;
  status: Status;
  kopiraj: () => void;
};

const KontekstIzbora = createContext<Kontekst | null>(null);

function useIzbor(): Kontekst {
  const kontekst = useContext(KontekstIzbora);
  if (!kontekst) {
    throw new Error(
      "IzborStavke, IzborDana, DugmeIzbora i DnoListe moraju biti unutar <IzborProvider>.",
    );
  }
  return kontekst;
}

/**
 * Holds the selection for the whole screen. Rendered once around the list in
 * `page.tsx`, so it survives the filter, search and tab navigations that
 * change nothing but the URL (see that file's header comment on why the
 * client tree beneath it is not remounted).
 */
export function IzborProvider({
  stavke,
  children,
}: {
  stavke: Record<string, StavkaPoruke>;
  children: ReactNode;
}) {
  const [ukljucen, setUkljucen] = useState(false);
  const [izabrani, setIzabrani] = useState<Map<string, StavkaPoruke>>(
    () => new Map(),
  );
  const [status, setStatus] = useState<Status>(null);
  const tajmer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const obrisiTajmer = useCallback(() => {
    if (tajmer.current !== null) {
      clearTimeout(tajmer.current);
      tajmer.current = null;
    }
  }, []);

  useEffect(() => obrisiTajmer, [obrisiTajmer]);

  const postaviStatus = useCallback(
    (sledeci: Status) => {
      obrisiTajmer();
      setStatus(sledeci);
      if (sledeci !== null) {
        tajmer.current = setTimeout(() => setStatus(null), TRAJANJE_STATUSA_MS);
      }
    },
    [obrisiTajmer],
  );

  const prebaci = useCallback(
    (kljuc: string) => {
      postaviStatus(null);
      setIzabrani((prethodni) => {
        const sledeci = new Map(prethodni);
        if (sledeci.has(kljuc)) {
          sledeci.delete(kljuc);
        } else {
          const stavka = stavke[kljuc];
          if (stavka) sledeci.set(kljuc, stavka);
        }
        return sledeci;
      });
    },
    [stavke, postaviStatus],
  );

  const prebaciDan = useCallback(
    (kljucevi: readonly string[]) => {
      postaviStatus(null);
      setIzabrani((prethodni) => {
        const svePostavljene = kljucevi.every((k) => prethodni.has(k));
        const sledeci = new Map(prethodni);
        if (svePostavljene) {
          for (const k of kljucevi) sledeci.delete(k);
        } else {
          for (const k of kljucevi) {
            const stavka = stavke[k];
            if (stavka) sledeci.set(k, stavka);
          }
        }
        return sledeci;
      });
    },
    [stavke, postaviStatus],
  );

  const ukljuci = useCallback(() => setUkljucen(true), []);

  const iskljuci = useCallback(() => {
    setUkljucen(false);
    setIzabrani(new Map());
    postaviStatus(null);
  }, [postaviStatus]);

  const vanEkrana = [...izabrani.keys()].filter(
    (k) => !Object.hasOwn(stavke, k),
  ).length;

  const kopiraj = useCallback(() => {
    // Synchronous, start to finish: sastaviPoruku is pure and the write below
    // has no await in front of it — see the file header for why that is not
    // optional on iOS.
    const tekst = sastaviPoruku(
      [...izabrani].map(([k, v]) => stavke[k] ?? v),
    );
    if (!navigator.clipboard) {
      postaviStatus("greska");
      return;
    }
    // Only what went into this message is cleared: a leg ticked while the
    // write was still settling was not copied, and must not vanish with it.
    const kopirani = [...izabrani.keys()];
    navigator.clipboard.writeText(tekst).then(
      () => {
        setIzabrani((prethodni) => {
          const sledeci = new Map(prethodni);
          for (const k of kopirani) sledeci.delete(k);
          return sledeci;
        });
        postaviStatus("kopirano");
      },
      () => postaviStatus("greska"),
    );
  }, [izabrani, stavke, postaviStatus]);

  return (
    <KontekstIzbora.Provider
      value={{
        ukljucen,
        stavke,
        izabrani,
        prebaci,
        prebaciDan,
        ukljuci,
        iskljuci,
        vanEkrana,
        status,
        kopiraj,
      }}
    >
      {children}
    </KontekstIzbora.Provider>
  );
}

/** The header icon that turns selection mode on and off. */
export function DugmeIzbora({ className }: { className?: string }) {
  const { ukljucen, ukljuci, iskljuci } = useIzbor();

  return (
    <button
      type="button"
      aria-label={T.izbor.izaberi}
      aria-pressed={ukljucen}
      onClick={() => (ukljucen ? iskljuci() : ukljuci())}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-lg text-muted-foreground active:bg-muted",
        ukljucen && "bg-muted text-foreground",
        className,
      )}
    >
      <ListChecksIcon className="size-5" />
    </button>
  );
}

/** The circle drawn in the gutter — shared visual for a card and a day heading. */
function KruzicIzbora({
  stanje,
  className,
}: {
  stanje: boolean | "mixed";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full border-2 transition-colors",
        stanje === false
          ? "border-border bg-background"
          : "border-primary bg-primary text-primary-foreground",
        className,
      )}
    >
      {stanje === true ? <CheckIcon className="size-4" /> : null}
      {stanje === "mixed" ? <MinusIcon className="size-4" /> : null}
    </span>
  );
}

/**
 * Wraps one server-rendered card. Always renders the same outer element so
 * toggling the mode never remounts the card underneath.
 */
export function IzborStavke({
  kljuc,
  children,
}: {
  kljuc: string;
  children: ReactNode;
}) {
  const { ukljucen, izabrani, stavke, prebaci } = useIzbor();

  const izabran = ukljucen && izabrani.has(kljuc);
  const podaci = stavke[kljuc];

  // The card's own wrapper is rendered in both modes and only its `inert`
  // changes, so the card keeps its place in the tree and is never remounted.
  //
  // In the mode the card's › is hidden. It says "opens Detalji", which a tap
  // no longer does, and the gutter has just taken 40px from the card: at
  // 390px that squeezed the origin of a return — the half of the route that
  // tells Perea from Neos Marmaras, which is the whole question on the
  // *Povratak* tab — down to its first letter. The arrow's 28px give it back.
  return (
    <div
      className={cn(
        "relative transition-[padding]",
        ukljucen && "pl-10 [&_[data-strelica]]:hidden",
      )}
    >
      {ukljucen ? (
        <span className="pointer-events-none absolute top-1/2 left-2 -translate-y-1/2">
          <KruzicIzbora stanje={izabran} />
        </span>
      ) : null}
      <div
        inert={ukljucen}
        className={cn(izabran && "rounded-xl ring-2 ring-primary")}
      >
        {children}
      </div>
      {ukljucen ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={izabran}
          aria-label={
            podaci
              ? `${podaci.ime}, ${podaci.ruta}, ${putnika(podaci.brojPutnika)}`
              : undefined
          }
          onClick={() => prebaci(kljuc)}
          className="absolute inset-0 rounded-xl active:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
        />
      ) : null}
    </div>
  );
}

/**
 * The day heading. Renders the `<h2>` itself, because a `<button>` may hold
 * an `<h2>` but not the other way around, and the whole-day toggle has to be
 * a `role="checkbox"` button living inside it.
 */
export function IzborDana({
  kljucevi,
  children,
  className,
}: {
  kljucevi: readonly string[];
  children: string;
  className?: string;
}) {
  const { ukljucen, izabrani, prebaciDan } = useIzbor();

  if (!ukljucen) return <h2 className={className}>{children}</h2>;

  const broj = kljucevi.filter((k) => izabrani.has(k)).length;
  const stanje: boolean | "mixed" =
    broj === 0 ? false : broj === kljucevi.length ? true : "mixed";

  return (
    <h2 className={className}>
      <button
        type="button"
        role="checkbox"
        aria-checked={stanje}
        aria-label={`${children} — ${T.izbor.ceoDan}`}
        onClick={() => prebaciDan(kljucevi)}
        className="-mx-1 flex min-h-11 w-[calc(100%+0.5rem)] items-center gap-2 rounded-lg px-1 active:bg-muted"
      >
        {/* w-10 from the button's left edge centres the circle on the same
            vertical line as the cards' circles (left-2 in a pl-10 gutter). */}
        <span className="flex w-10 shrink-0 items-center justify-center">
          <KruzicIzbora stanje={stanje} />
        </span>
        <span className="flex-1 text-left">{children}</span>
        <span className="shrink-0 text-xs font-normal text-muted-foreground">
          {T.izbor.ceoDan}
        </span>
      </button>
    </h2>
  );
}

/** The status row plus the two action buttons, in mode. */
function TrakaIzbora() {
  const { izabrani, vanEkrana, status, iskljuci, kopiraj } = useIzbor();
  const broj = izabrani.size;

  const poruka =
    status === "kopirano"
      ? T.izbor.kopirano
      : status === "greska"
        ? T.izbor.greska
        : vanEkrana > 0
          ? vanEkranaTekst(vanEkrana)
          : null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-20 border-t border-border bg-background/95 px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
      {/* Always present in the mode, empty or not: a live region has to exist
          before its text changes to be announced, and a fixed line keeps the
          bar from jumping when "Kopirano" appears. */}
      <p
        aria-live="polite"
        className="mb-2 min-h-5 text-center text-sm text-muted-foreground"
      >
        {poruka}
      </p>
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-12 flex-1 text-base"
          onClick={iskljuci}
        >
          {T.izbor.otkazi}
        </Button>
        <Button
          type="button"
          className="h-12 flex-[2] gap-2 text-base"
          disabled={broj === 0}
          onClick={kopiraj}
        >
          <CopyIcon className="size-5" />
          {`${T.izbor.kopiraj} (${broj})`}
        </Button>
      </div>
    </div>
  );
}

/**
 * The fixed bottom bar. Out of mode it is exactly `DugmeNove`; in mode it is
 * the selection's own actions. One export so `page.tsx` never has to decide
 * which of the two belongs on screen.
 */
export function DnoListe({ stanje }: { stanje: StanjeUrl }) {
  const { ukljucen } = useIzbor();
  return ukljucen ? <TrakaIzbora /> : <DugmeNove stanje={stanje} />;
}
