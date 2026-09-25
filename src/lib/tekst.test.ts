import { describe, expect, it } from "vitest";
import {
  filtera,
  putnika,
  rezervacija,
  srpskiOblik,
  T,
  uporediTekst,
  vanEkranaTekst,
} from "./tekst";

describe("srpskiOblik", () => {
  it.each([
    [1, "jedan"],
    [2, "malo"],
    [3, "malo"],
    [4, "malo"],
    [5, "mnogo"],
    [10, "mnogo"],
    [11, "mnogo"], // the 11–14 exception
    [12, "mnogo"],
    [13, "mnogo"],
    [14, "mnogo"],
    [21, "jedan"],
    [22, "malo"],
    [25, "mnogo"],
    [101, "jedan"],
    [111, "mnogo"],
    [0, "mnogo"],
  ])("%i → %s", (n, ocekivano) => {
    expect(srpskiOblik(n)).toBe(ocekivano);
  });
});

describe("putnika", () => {
  // The five values the build plan calls out by name.
  it.each([
    [1, "1 putnik"],
    [2, "2 putnika"],
    [4, "4 putnika"],
    [5, "5 putnika"],
    [21, "21 putnik"],
  ])("%i → %s", (n, ocekivano) => {
    expect(putnika(n)).toBe(ocekivano);
  });
});

describe("rezervacija", () => {
  it.each([
    [1, "1 rezervacija"],
    [2, "2 rezervacije"],
    [5, "5 rezervacija"],
    [21, "21 rezervacija"],
  ])("%i → %s", (n, ocekivano) => {
    expect(rezervacija(n)).toBe(ocekivano);
  });
});

describe("filtera", () => {
  it.each([
    [1, "1 filter"],
    [3, "3 filtera"],
    [7, "7 filtera"],
  ])("%i → %s", (n, ocekivano) => {
    expect(filtera(n)).toBe(ocekivano);
  });
});

describe("vanEkranaTekst", () => {
  it.each([
    [1, "1 izabrana nije na ekranu"],
    [2, "2 izabrane nisu na ekranu"],
    [5, "5 izabranih nije na ekranu"],
    [21, "21 izabrana nije na ekranu"],
  ])("%i → %s", (n, ocekivano) => {
    expect(vanEkranaTekst(n)).toBe(ocekivano);
  });
});

describe("uporediTekst", () => {
  it("uses Serbian Latin order, not ASCII and not Cyrillic order", () => {
    const reci = ["Šabac", "Sarti", "Cetinje", "Čačak", "Ćuprija", "Zagreb", "Žabalj", "Đakovo", "Drvar"];
    expect([...reci].sort(uporediTekst)).toEqual([
      "Cetinje",
      "Čačak",
      "Ćuprija",
      "Drvar",
      "Đakovo",
      "Sarti",
      "Šabac",
      "Zagreb",
      "Žabalj",
    ]);
  });

  it("sorts the real destination names correctly", () => {
    expect([...["Solun", "Sarti", "Siviri", "Split"]].sort(uporediTekst)).toEqual([
      "Sarti",
      "Siviri",
      "Solun",
      "Split",
    ]);
  });

  it("is case-insensitive in ordering but not blind to diacritics", () => {
    expect(uporediTekst("čačak", "Cetinje")).toBeGreaterThan(0);
    expect(uporediTekst("Cetinje", "cetinje")).not.toBe(0);
  });
});

describe("T", () => {
  it("has no Cyrillic anywhere — the app is Latin script", () => {
    const cirilica = /[\u0400-\u04FF]/;
    const provera = (v: unknown, put: string) => {
      if (typeof v === "string") {
        expect(cirilica.test(v), `${put}: ${v}`).toBe(false);
      } else if (v && typeof v === "object") {
        for (const [k, val] of Object.entries(v)) {
          expect(cirilica.test(k), `ključ ${put}.${k}`).toBe(false);
          provera(val, `${put}.${k}`);
        }
      }
    };
    provera(T, "T");
  });
});
