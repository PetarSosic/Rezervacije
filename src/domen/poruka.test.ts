/**
 * The driver's message — `stavkaPoruke` on the server, `sastaviPoruku` on the
 * phone.
 *
 * Every selection here is taken from the real list views (`prikaziListu`,
 * `danView`, `rasporedView`), the way the owner takes it off the screen, so
 * these tests prove the message and the list agree on order rather than that
 * the message agrees with a hand-built array.
 *
 * The fixture builder cannot set address, price or note (see `red()` in
 * `fiksture.ts`), so `sa()` spreads them onto a copy here instead.
 */
import { describe, expect, it } from "vitest";
import { naslovDana } from "@/lib/datum";
import {
  DANAS,
  HANIOTI,
  KATALOG,
  R1,
  R3,
  R4,
  R5,
  R6,
  R8,
  R9,
  R10,
  SARTI,
  SVI,
  dan,
  imena,
  red,
} from "./fiksture";
import { kljucDrzave } from "./destinacije";
import { opsegZaDan } from "./filteri";
import { danView, grupisiPoSmeru, prikaziListu, rasporedView } from "./liste";
import { sastaviPoruku, uporediStavkePoruke, type StavkaPoruke } from "./poruka";
import { sortirajStavke } from "./sortiranje";
import { stavkaPoruke } from "./stavka-poruke";
import type { Reservation, RezervacijaRed, StavkaListe } from "./tipovi";

type Dodaci = Partial<Pick<Reservation, "adresa" | "cena" | "napomena">>;

/** A copy of a fixture row with address, price or note filled in. */
function sa(r: RezervacijaRed, dodaci: Dodaci): RezervacijaRed {
  return { ...r, rezervacija: { ...r.rezervacija, ...dodaci } };
}

/** What the phone would hold after ticking these legs, in any order. */
const izaberi = (...grupe: (readonly StavkaListe[])[]): StavkaPoruke[] =>
  grupe.flat().map(stavkaPoruke);

const danOpcije = (d: string) => ({ danas: DANAS, opseg: opsegZaDan(d) });

/** `1. Marko Petrović · 4 putnika` → { broj: 1, ime: "Marko Petrović" }. */
function stavkeIzPoruke(poruka: string): { broj: number; ime: string }[] {
  const obrazac = /^(\d+)\. (.+) · \d+ putnika?$/;
  return poruka.split("\n").flatMap((linija) => {
    const m = obrazac.exec(linija);
    return m ? [{ broj: Number(m[1]), ime: m[2] }] : [];
  });
}

const zaglavlja = (poruka: string): string[] =>
  poruka.split("\n").filter((l) => /^(POLAZAK|POVRATAK) · /.test(l));

/** Four more departures to Hanioti on dan(2), named so a byte sort fails. */
const CVETA = red({
  n: 41,
  ime: "Cveta Lazić",
  telefon: "+381601110041",
  destinacija: HANIOTI,
  datumPolaska: dan(2),
  datumPovratka: dan(16),
  brojPutnika: 2,
});
const CEDOMIR = red({
  n: 42,
  ime: "Čedomir Rakić",
  telefon: "+381601110042",
  destinacija: HANIOTI,
  datumPolaska: dan(2),
  datumPovratka: dan(9),
  brojPutnika: 3,
});
const ZORAN = red({
  n: 43,
  ime: "Zoran Ćosić",
  telefon: "+381601110043",
  destinacija: HANIOTI,
  datumPolaska: dan(2),
  datumPovratka: null,
  brojPutnika: 1,
});

describe("sastaviPoruku — the exact text", () => {
  it("a Greek tour: one departure and one return on different days, in full", () => {
    // The owner's workflow: Grčka on dan(2) in Odlasci, then the Povratak tab
    // filtered by dan(9) alone — the Grčka filter would never show a return,
    // whose destination is Beograd.
    const redovi = SVI.map((r) =>
      r === R8
        ? sa(R8, {
            adresa: "  Bulevar kralja Aleksandra 73 ",
            cena: 480,
            napomena: "dva velika kofera\nplaćeno unapred",
          })
        : r,
    );
    const grcka = prikaziListu(redovi, {
      ...danOpcije(dan(2)),
      destinacije: [kljucDrzave(HANIOTI)],
      katalog: KATALOG,
    });
    const povratakDana9 = prikaziListu(redovi, danOpcije(dan(9)));

    expect(sastaviPoruku(izaberi(grcka.odlasci, povratakDana9.povratci))).toBe(
      [
        "POLAZAK · subota, 17.01.2026. · 6 putnika",
        "",
        "1. Aleksandar Cvetković · 6 putnika",
        "Beograd → Hanioti",
        "Adresa: Bulevar kralja Aleksandra 73",
        "Tel: +381 62 8889900",
        "Cena: 480 €",
        "Napomena: dva velika kofera",
        "plaćeno unapred",
        "",
        "POVRATAK · subota, 24.01.2026. · 5 putnika",
        "",
        "2. Porodica Jovanović · 5 putnika",
        "Siviri → Beograd",
        "Tel: +381 65 2223344",
      ].join("\n"),
    );
  });

  it("a round trip ticked on both tabs is in each section once, arrow reversed", () => {
    const lista = prikaziListu(SVI, { danas: DANAS });
    const marko = (s: readonly StavkaListe[]) =>
      s.filter((x) => x.red.rezervacija.id === R1.rezervacija.id);

    expect(sastaviPoruku(izaberi(marko(lista.povratci), marko(lista.odlasci)))).toBe(
      [
        "POLAZAK · četvrtak, 29.01.2026. · 4 putnika",
        "",
        "1. Marko Petrović · 4 putnika",
        "Beograd → Hanioti",
        "Tel: +381 64 1234567",
        "",
        "POVRATAK · četvrtak, 12.02.2026. · 4 putnika",
        "",
        "2. Marko Petrović · 4 putnika",
        "Hanioti → Beograd",
        "Tel: +381 64 1234567",
      ].join("\n"),
    );
  });

  it("an empty selection is an empty string", () => {
    expect(sastaviPoruku([])).toBe("");
  });

  it("never ends in a newline", () => {
    const poruka = sastaviPoruku(izaberi(danView(SVI, danOpcije(dan(2)))));
    expect(poruka.endsWith("\n")).toBe(false);
    expect(poruka.startsWith("\n")).toBe(false);
  });
});

describe("sastaviPoruku — order follows the list, not the order of tapping", () => {
  const redovi = [...SVI, R9, R10, CVETA, CEDOMIR, ZORAN];

  it("the same legs in any order give the same text", () => {
    const izbor = izaberi(danView(redovi, danOpcije(dan(2))));
    const tekst = sastaviPoruku(izbor);
    expect(sastaviPoruku([...izbor].reverse())).toBe(tekst);
    expect(sastaviPoruku([...izbor.slice(3), ...izbor.slice(0, 3)])).toBe(tekst);
    expect(sastaviPoruku([izbor[4], izbor[0], izbor[5], izbor[2], izbor[1], izbor[3]])).toBe(
      tekst,
    );
  });

  it("one day reads exactly as sortirajStavke orders it — destination, then name in sr-Latn", () => {
    const stavke = danView(redovi, danOpcije(dan(2)));
    const poruka = sastaviPoruku(izaberi([...stavke].reverse()));

    expect(stavkeIzPoruke(poruka).map((s) => s.ime)).toEqual(
      imena(sortirajStavke(stavke)),
    );
    expect(stavkeIzPoruke(poruka).map((s) => s.ime)).toEqual([
      "Aleksandar Cvetković", // Hanioti — four departures to one place, by name
      "Cveta Lazić",
      "Čedomir Rakić", // Č after C, not after Z
      "Zoran Ćosić",
      "Dragan Đorđević", // Kopaonik — the destination decides first
      "Dragan Đorđević", // and his return the same day, in POVRATAK
    ]);
    // Proves the case bites: a byte sort would put Čedomir after Zoran.
    expect("Čedomir Rakić" > "Zoran Ćosić").toBe(true);
  });

  it("the whole message is Odlasci top to bottom, then Povratak top to bottom", () => {
    // Every leg from dan(-30) to dan(60), past included, across both tabs.
    const lista = danView(redovi, {
      danas: DANAS,
      opseg: { od: dan(-30), do: dan(60) },
    });
    const { polasci, povratci } = grupisiPoSmeru(lista);
    const izbor = izaberi([...lista].reverse());

    expect([...izbor].sort(uporediStavkePoruke).map((s) => s.kljuc)).toEqual(
      [...polasci, ...povratci].map((s) => s.kljuc),
    );
    expect(stavkeIzPoruke(sastaviPoruku(izbor)).map((s) => s.ime)).toEqual(
      imena([...polasci, ...povratci]),
    );
  });

  it("sections come before dates — a dan(3) departure is above a dan(2) return", () => {
    const poruka = sastaviPoruku(
      izaberi(danView(SVI, danOpcije(dan(3))), danView(SVI, danOpcije(dan(2)))),
    );
    expect(zaglavlja(poruka)).toEqual([
      "POLAZAK · subota, 17.01.2026. · 27 putnika",
      "POLAZAK · nedelja, 18.01.2026. · 3 putnika",
      "POVRATAK · subota, 17.01.2026. · 21 putnik",
    ]);
  });

  it("does not sort the caller's selection in place", () => {
    const izbor = izaberi(danView(redovi, danOpcije(dan(2)))).reverse();
    const pre = izbor.map((s) => s.kljuc);
    // Frozen, so an in-place sort would throw rather than pass quietly.
    expect(() => sastaviPoruku(Object.freeze([...izbor]))).not.toThrow();
    sastaviPoruku(izbor);
    expect(izbor.map((s) => s.kljuc)).toEqual(pre);
  });

  it("a leg ticked from two filtered renders reaches the driver once", () => {
    const grcka = prikaziListu(SVI, {
      ...danOpcije(dan(2)),
      destinacije: [kljucDrzave(HANIOTI)],
      katalog: KATALOG,
    });
    const samoDatum = prikaziListu(SVI, danOpcije(dan(2)));
    const poruka = sastaviPoruku(izaberi(grcka.odlasci, samoDatum.odlasci));
    expect(stavkeIzPoruke(poruka)).toEqual([
      { broj: 1, ime: "Aleksandar Cvetković" },
      { broj: 2, ime: "Dragan Đorđević" },
    ]);
  });
});

describe("sastaviPoruku — numbering and headers", () => {
  it("numbers straight through POLAZAK into POVRATAK, never restarting", () => {
    const lista = rasporedView(SVI, { danas: DANAS });
    const brojevi = stavkeIzPoruke(sastaviPoruku(izaberi(lista))).map((s) => s.broj);
    expect(brojevi).toEqual(lista.map((_, i) => i + 1));
    expect(brojevi.length).toBeGreaterThan(6); // both sections, several days
  });

  it("each (section, date) header sums only its own passengers", () => {
    // dan(2): R8 (6) and R6 (21) depart, R6 (21) comes home.
    const poruka = sastaviPoruku(izaberi(danView(SVI, danOpcije(dan(2)))));
    expect(zaglavlja(poruka)).toEqual([
      "POLAZAK · subota, 17.01.2026. · 27 putnika",
      "POVRATAK · subota, 17.01.2026. · 21 putnik",
    ]);
  });

  it("uses the Serbian plural — 1 putnik, 21 putnik — in the item and the header", () => {
    // R4 departed with no return date: only Dan mode on its past day reaches it.
    const r4 = sastaviPoruku(izaberi(danView(SVI, danOpcije(dan(-3)))));
    expect(r4.split("\n").slice(0, 3)).toEqual([
      "POLAZAK · ponedeljak, 12.01.2026. · 1 putnik",
      "",
      "1. Stefan Nikolić · 1 putnik",
    ]);

    const r6 = danView(SVI, danOpcije(dan(2))).filter(
      (s) => s.red.rezervacija.id === R6.rezervacija.id && s.smer === "odlazak",
    );
    expect(sastaviPoruku(izaberi(r6)).split("\n").slice(0, 3)).toEqual([
      "POLAZAK · subota, 17.01.2026. · 21 putnik",
      "",
      "1. Dragan Đorđević · 21 putnik",
    ]);
  });

  it("writes the date in full even for today and tomorrow — never danas or sutra", () => {
    const sutra = red({
      n: 44,
      ime: "Mila Petković",
      telefon: "+381601110044",
      destinacija: SARTI,
      datumPolaska: dan(1),
      brojPutnika: 2,
    });
    // The list's own headings would say "danas" and "sutra" for these days.
    expect(naslovDana(dan(0), DANAS)).toBe("danas");
    expect(naslovDana(dan(1), DANAS)).toBe("sutra");

    const poruka = sastaviPoruku(
      izaberi(
        prikaziListu([...SVI, sutra], danOpcije(dan(0))).odlasci,
        prikaziListu([...SVI, sutra], danOpcije(dan(1))).odlasci,
      ),
    );
    expect(zaglavlja(poruka)).toEqual([
      "POLAZAK · četvrtak, 15.01.2026. · 2 putnika",
      "POLAZAK · petak, 16.01.2026. · 2 putnika",
    ]);
    expect(poruka).not.toMatch(/danas|sutra/i);
  });
});

describe("sastaviPoruku — a missing value is a missing line", () => {
  const prvi = (poruka: string) => poruka.split("\n\n")[1].split("\n");

  it("null and whitespace-only address, price and note drop the whole line", () => {
    const prazno = sa(R1, { adresa: "   ", cena: null, napomena: " \n\t " });
    const [odlazak] = rasporedView([prazno], { danas: DANAS });
    const poruka = sastaviPoruku([stavkaPoruke(odlazak)]);
    expect(prvi(poruka)).toEqual([
      "1. Marko Petrović · 4 putnika",
      "Beograd → Hanioti",
      "Tel: +381 64 1234567",
    ]);
    expect(poruka).not.toContain("—");
    expect(poruka).not.toMatch(/:\s*$/m);
  });

  it("a whitespace-only price handed in preformatted is dropped too", () => {
    const [odlazak] = rasporedView([R1], { danas: DANAS });
    const poruka = sastaviPoruku([{ ...stavkaPoruke(odlazak), cena: "  " }]);
    expect(poruka).not.toContain("Cena");
  });

  it("trims address and note, and keeps a multi-line note's lines as typed", () => {
    // A form submits CRLF; the message uses one kind of line break throughout.
    const r = sa(R1, {
      adresa: "  Cara Dušana 12  ",
      cena: 1200,
      napomena: "\r\n  prvi red\r\n  drugi red  \r\n",
    });
    const [odlazak] = rasporedView([r], { danas: DANAS });
    const poruka = sastaviPoruku([stavkaPoruke(odlazak)]);
    expect(prvi(poruka)).toEqual([
      "1. Marko Petrović · 4 putnika",
      "Beograd → Hanioti",
      "Adresa: Cara Dušana 12",
      "Tel: +381 64 1234567",
      "Cena: 1.200 €",
      "Napomena: prvi red",
      "  drugi red",
    ]);
    expect(poruka).not.toContain("\r");
  });
});

describe("stavkaPoruke — the server's half", () => {
  it("carries the list's own key, tab direction, date and sort destination", () => {
    const [odlazak, povratak] = rasporedView([R1], { danas: DANAS });
    expect(stavkaPoruke(odlazak)).toMatchObject({
      kljuc: `${R1.rezervacija.id}#odlazak`,
      smer: "odlazak",
      datum: dan(14),
      mesto: "Hanioti",
      ime: "Marko Petrović",
      brojPutnika: 4,
    });
    expect(stavkaPoruke(povratak)).toMatchObject({
      kljuc: `${R1.rezervacija.id}#povratak`,
      smer: "povratak",
      datum: dan(28),
      mesto: "Beograd",
      ruta: "Hanioti → Beograd",
    });
  });

  it("formats phone and price, and passes address and note through untouched", () => {
    const [odlazak] = rasporedView(
      [sa(R8, { adresa: "  Cara Dušana 12 ", cena: 1200, napomena: null })],
      { danas: DANAS },
    );
    expect(stavkaPoruke(odlazak)).toMatchObject({
      telefon: "+381 62 8889900",
      cena: "1.200 €",
      adresa: "  Cara Dušana 12 ",
      napomena: null,
    });

    const [bezCene] = rasporedView([R8], { danas: DANAS });
    expect(stavkaPoruke(bezCene)).toMatchObject({
      cena: null,
      adresa: null,
      napomena: null,
    });
  });

  it("a one-way ride home from abroad goes under POVRATAK and still reads Solun → Beograd", () => {
    const { odlasci, povratci } = prikaziListu([R9], danOpcije(dan(3)));
    expect(odlasci).toHaveLength(0);
    const stavka = stavkaPoruke(povratci[0]);
    expect(stavka).toMatchObject({ smer: "povratak", ruta: "Solun → Beograd" });

    const poruka = sastaviPoruku([stavka]);
    expect(zaglavlja(poruka)).toEqual([
      "POVRATAK · nedelja, 18.01.2026. · 2 putnika",
    ]);
    expect(poruka).toContain("\nSolun → Beograd\n");
  });

  it("the same place at both ends is one name, not an arrow to itself", () => {
    // R5: Beograd in both columns, one-way.
    const [stavka] = rasporedView([R5], { danas: DANAS });
    expect(stavkaPoruke(stavka).ruta).toBe("Beograd");
    expect(sastaviPoruku([stavkaPoruke(stavka)]).split("\n")).toContain("Beograd");
    expect(sastaviPoruku([stavkaPoruke(stavka)])).not.toContain("→");
  });

  it("a domestic one-way drop-off stays a departure", () => {
    // R10: Kopaonik with no return yet — the homecoming carve-out must not fire.
    const [stavka] = rasporedView([R10], { danas: DANAS });
    expect(stavkaPoruke(stavka)).toMatchObject({
      smer: "odlazak",
      ruta: "Beograd → Kopaonik",
    });
  });

  it("a departed booking's return, picked on Povratak, reads from where it was", () => {
    // R3 left five days ago; only its return is on the list.
    const [stavka] = rasporedView([R3], { danas: DANAS });
    expect(stavkaPoruke(stavka)).toMatchObject({
      smer: "povratak",
      ruta: "Siviri → Beograd",
      mesto: "Beograd",
    });
  });

  it("is what R4 looks like when reached by its past departure date", () => {
    const [stavka] = danView([R4], danOpcije(dan(-3)));
    expect(stavkaPoruke(stavka)).toMatchObject({
      smer: "odlazak",
      datum: dan(-3),
      ruta: "Beograd → Zagreb",
    });
  });
});
