/**
 * Every user-facing string in the app, Serbian, Latin script.
 *
 * One file so the wording can be read and corrected in one sitting, and so
 * "zero Serbian strings inlined in JSX" is a rule a reviewer can actually
 * check. Components import from here; they never spell a word themselves.
 */

export const T = {
  app: {
    naziv: "Kombi Rezervacije",
    /** What fits under a home screen icon. iOS truncates past ~12 characters. */
    kratakNaziv: "Rezervacije",
    opis: "Zajednička knjiga rezervacija za kombi prevoz.",
  },

  prijava: {
    naslov: "Prijava",
    email: "Email",
    lozinka: "Lozinka",
    dugme: "Prijavi se",
    uToku: "Prijavljivanje…",
    greska: "Pogrešan email ili lozinka.",
    odjava: "Odjavi se",
  },

  lista: {
    naslov: "Raspored",
    /** Headings for the other two list shapes — SPEC §2 and the Phase 3 note. */
    naslovDan: "Dan",
    naslovPretraga: "Pretraga",
    /**
     * Six silences: one per tab, times the three reasons a tab can be empty.
     *
     * Since the list is split into *Odlasci* and *Povratak* (SPEC §2, amended
     * 09.09.2026) an empty panel is a narrower statement than it used to be —
     * "there are no departures" while the other tab is full of returns. One
     * message for both would read as "there is nothing at all", which is
     * exactly the thing this app must never say when it is not true.
     */
    prazno: {
      odlazak: {
        raspored: "Nema nadolazećih odlazaka.",
        filter: "Nijedan odlazak ne odgovara filteru.",
        pretraga: "Nema odlazaka za ovu pretragu.",
      },
      povratak: {
        raspored: "Nema nadolazećih povrataka.",
        filter: "Nijedan povratak ne odgovara filteru.",
        pretraga: "Nema povrataka za ovu pretragu.",
      },
    },
    novaRezervacija: "Nova rezervacija",
    pretraga: "Pretraži ime, telefon ili destinaciju",
    obrisiPretragu: "Obriši pretragu",
    ucitavanje: "Učitavanje…",
    /** Screen-reader label on the card link; the card itself shows the name. */
    otvori: "Otvori rezervaciju",
  },

  nav: {
    nazad: "Nazad",
    podesavanja: "Podešavanja",
    /**
     * The ✕ on a Dialog or a Sheet. Lives here rather than under `filter`
     * because both primitives render it — the delete confirmation uses it too,
     * and a filter-namespaced string on a delete dialog reads as a mistake.
     */
    zatvori: "Zatvori",
  },

  smer: {
    odlazak: "Odlazak",
    povratak: "Povratak",
    /** Chips carry the arrow; the arrow is content, not decoration. */
    odlazakSaStrelicom: "↑ Odlazak",
    povratakSaStrelicom: "↓ Povratak",
  },

  /**
   * The two tabs — SPEC §2, amended 09.09.2026 at the owner's request.
   *
   * His words, kept as he said them: the departures tab is plural (*Odlasci*)
   * and the returns tab is singular (*Povratak*). It is not a slip to tidy up
   * — *Povratak* is what the direction chip and the form already say, and the
   * tab naming the same thing twice over is worth more than symmetry.
   */
  tabovi: {
    odlasci: "Odlasci",
    povratak: "Povratak",
    /** Read out before either tab name, so the pair has a name of its own. */
    izbor: "Odlasci ili povratak",
  },

  filter: {
    naslov: "Filter",
    dugme: "Filter",
    primeni: "Primeni",
    obrisiSve: "Obriši sve",
    datum: "Datum",
    danas: "danas",
    ovaNedelja: "ova nedelja",
    ovajMesec: "ovaj mesec",
    opseg: "Izaberi opseg",
    odDatuma: "Od",
    doDatuma: "Do",
    destinacija: "Destinacija",
    sveDrzave: "Sve države",
    aktivnihFiltera: "aktivnih filtera",
  },

  /*
   * `sortiranje` stood here — Sortiranje, Po datumu, Po destinaciji, Rastuće,
   * Opadajuće — until 09.09.2026, when the owner asked for the sort controls
   * to go. The list has one order and it is not a choice, so there is nothing
   * left to name.
   */

  forma: {
    naslovNova: "Nova rezervacija",
    naslovIzmena: "Izmeni rezervaciju",
    ime: "Ime",
    imePlaceholder: "Ime i prezime",
    telefon: "Telefon",
    telefonPlaceholder: "064 123 4567",
    telefonPomoc: "Čuva se kao +381… da bi radilo i iz inostranstva.",
    /** The doorstep in Belgrade — SPEC §4, amended 07.09.2026. */
    adresa: "Adresa preuzimanja",
    adresaPlaceholder: "npr. Bulevar kralja Aleksandra 73, ulaz 2",
    adresaPomoc: "Odakle se putnici pokupe u Beogradu.",
    brojPutnika: "Broj putnika",
    cena: "Cena (€)",
    cenaPomoc: "Ceo iznos u evrima, bez para.",
    napomena: "Napomena",
    napomenaPomoc: "Nije obavezno — sve što treba da se zna o vožnji.",
    napomenaPlaceholder: "npr. dva velika kofera, plaćeno unapred",
    odlazak: "Odlazak",
    povratak: "Povratak",
    drzava: "Država",
    regija: "Regija",
    grad: "Grad",
    izaberi: "Izaberi…",
    /** The last option of the region and city dropdowns (SPEC §5, amended). */
    drugoRucno: "Drugo — upiši ručno",
    nazivRegije: "Naziv regije",
    /** Blank is allowed: an unnamed region makes the town its own (SPEC §5). */
    nazivRegijeOpciono: "Naziv regije (nije obavezno)",
    nazivMesta: "Naziv mesta",
    nazivMestaPomoc: "Dodaje se u listu mesta i ostaje tu za sledeći put.",
    nazivMestaPlaceholder: "npr. Novi Marmaras",
    datumPolaska: "Datum polaska",
    datumPovratka: "Datum povratka",
    datumPovratkaPomoc: "Ostavi prazno ako povratak još nije dogovoren.",
    jednosmerno: "Jednosmerna vožnja",
    jednosmernoPomoc: "Bez povratka — samo jedan put i jedan datum.",
    odakle: "Odakle",
    kuda: "Kuda",
    zameni: "Zameni polazak i povratak",
    /** Closes the destination sheet and writes the choice into the form. */
    potvrdi: "Potvrdi",
    /** The stepper beside Broj putnika — screen-reader labels for ± . */
    manjePutnika: "Jedan putnik manje",
    visePutnika: "Jedan putnik više",
    sacuvaj: "Sačuvaj",
    cuvanje: "Čuvanje…",
    odustani: "Odustani",
  },

  detalji: {
    naslov: "Rezervacija",
    pozovi: "Pozovi",
    viber: "Viber",
    /* Shown only when the hand-off to Viber produced nothing — see
       `src/components/dugmad-kontakta.tsx` for why that can happen. */
    viberNijeOtvoren: "Viber se nije otvorio.",
    kopirajBroj: "Kopiraj broj",
    brojKopiran: "Kopirano",
    izmeni: "Izmeni",
    obrisi: "Obriši",
    uneo: "Uneo",
    adresa: "Adresa preuzimanja",
    cena: "Cena",
    napomena: "Napomena",
    /**
     * Shown in place of a value on the bookings entered before these three
     * fields existed, and wherever a note was left blank. A dash rather than
     * a blank cell, so the row reads as "nothing here" instead of looking
     * like a rendering fault.
     */
    nemaPodatka: "—",
    polazak: "Polazak",
    povratak: "Povratak",
    bezPovratka: "Povratak nije dogovoren",
    odakle: "Odakle",
    kuda: "Kuda",
    jednosmerno: "Jednosmerna vožnja",
  },

  /**
   * The plain-text message for one driver, composed from the legs ticked on
   * the list and pasted into Viber — see `src/domen/poruka.ts`.
   *
   * Separate from `detalji` although some words repeat, because this is a
   * different reader: a driver on a chat screen, not someone looking at the
   * app. The labels are therefore short (*Tel*, not *Telefon*) and *Adresa*
   * drops the *preuzimanja* the form needs — in a pickup list for a driver
   * every address is a pickup.
   *
   * The two section headings are stored already in capitals rather than
   * passed through `toUpperCase()`. Case mapping is locale-sensitive, and a
   * heading that shouts is a wording choice, so it belongs here where the
   * wording is read — not in code that could run under another locale.
   */
  poruka: {
    polazak: "POLAZAK",
    povratak: "POVRATAK",
    adresa: "Adresa",
    telefon: "Tel",
    cena: "Cena",
    napomena: "Napomena",
  },

  /**
   * Selection mode on the list — SPEC's Viber-retirement feature. The owner
   * taps *Izaberi*, ticks legs, and *Kopiraj* puts `sastaviPoruku`'s text on
   * the clipboard. See `src/components/izbor-za-vozaca.tsx`.
   */
  izbor: {
    izaberi: "Izaberi",
    /** The whole-day toggle in a date heading, spoken after the date itself. */
    ceoDan: "ceo dan",
    otkazi: "Otkaži",
    kopiraj: "Kopiraj",
    kopirano: "Kopirano — nalepi u Viber",
    greska: "Kopiranje nije uspelo. Pokušaj ponovo.",
  },

  brisanje: {
    naslov: "Obrisati rezervaciju?",
    /** No undo, no recycle bin — the dialog is the only guard (SPEC §8). */
    poruka: "Brisanje je trajno. Rezervacija se ne može vratiti.",
    potvrdi: "Obriši",
    odustani: "Odustani",
  },

  podesavanja: {
    naslov: "Podešavanja",
    /**
     * The theme switch — SPEC §6, added 09.09.2026. *Izgled* rather than
     * *Tema*: "tema" in Serbian is first of all the subject of a conversation,
     * and this is about how the screen looks.
     */
    izgled: "Izgled",
    svetlaTema: "Svetla",
    tamnaTema: "Tamna",
    /**
     * Says the two things the two buttons cannot: that this is *this* phone,
     * and that until one is tapped the phone's own setting is still in charge.
     */
    izgledPomoc:
      "Važi samo na ovom telefonu. Dok ne izabereš, prati podešavanje telefona.",
    podrazumevaniGrad: "Podrazumevano mesto povratka",
    podrazumevaniGradPomoc:
      "Unapred se popunjava u polju povratka kod nove rezervacije.",
    sacuvano: "Sačuvano.",
  },

  mreza: {
    offline: "Nema veze sa internetom",
    /** The bar says what is on screen, not only what is missing. */
    offlineOpis: "Prikazani su poslednji poznati podaci.",
    offlineCuvanje: "Za čuvanje je potrebna internet veza.",
    offlineBrisanje: "Za brisanje je potrebna internet veza.",
  },

  instalacija: {
    naslov: "Dodaj na početni ekran",
    opis: "Otvara se kao aplikacija, preko celog ekrana, bez adresne trake.",
    dugme: "Dodaj",
    /*
     * iOS has no install prompt and no API to trigger one, so on iPhone the
     * only thing that can be offered is the instruction. It names the icon by
     * shape rather than by label, because Safari's own wording depends on the
     * phone's language and this phone may well be in English.
     */
    uputstvoIos:
      "U Safariju dodirni dugme za deljenje (kvadrat sa strelicom naviše), pa „Add to Home Screen“.",
    odbaci: "Ne sada",
  },

  /**
   * Pull-to-refresh. Four states, because the gesture answers four different
   * questions: is it armed, has it fired, did it work, and is there even a
   * connection to work with.
   */
  osvezavanje: {
    povuci: "Povuci da osvežiš",
    pusti: "Pusti da osvežiš",
    uToku: "Osvežavam…",
    bezMreze: "Nema mreže — nije osveženo",
  },

  greske: {
    imeObavezno: "Unesi ime.",
    telefonObavezan: "Unesi broj telefona.",
    telefonNeispravan: "Broj telefona nije ispravan.",
    destinacijaObavezna: "Izaberi destinaciju.",
    /** "Drugo — upiši ručno" was chosen and the box left empty. */
    nazivMestaObavezan: "Upiši naziv mesta.",
    nazivPredugacak: "Naziv je predugačak.",
    /** The id parsed, but names a destination that is no longer offered. */
    destinacijaNijeUPonudi: "Ta destinacija više nije u ponudi.",
    datumPolaskaObavezan: "Izaberi datum polaska.",
    datumNeispravan: "Datum nije ispravan.",
    povratakPrePolaska: "Povratak ne može biti pre polaska.",
    brojPutnikaObavezan: "Unesi broj putnika.",
    /**
     * Covers zero, negatives, decimals and exponent/hex notation in one
     * sentence. The old wording said only "greater than zero", which was the
     * wrong reason for `1.5`.
     */
    brojPutnikaNeispravan: "Broj putnika mora biti ceo broj veći od nule.",
    brojPutnikaPrevelik: "Najviše 100 putnika po rezervaciji.",
    adresaObavezna: "Unesi adresu preuzimanja.",
    adresaPredugacka: "Adresa je predugačka.",
    cenaObavezna: "Unesi cenu.",
    /** Covers decimals too: the owner chose whole euros, so 120,50 is refused
        rather than rounded. */
    cenaNeispravna: "Cena mora biti ceo broj evra, bez para.",
    cenaPrevelika: "Cena je prevelika.",
    napomenaPredugacka: "Napomena je predugačka.",
    nijeNadjeno: "Rezervacija nije pronađena.",
    neuspelo: "Čuvanje nije uspelo. Pokušaj ponovo.",
    /**
     * A hand-built POST naming a team the signed-in person may not file under.
     * The dropdown never offers one, so nobody reaches this by tapping.
     */
    timNijeDozvoljen: "Nemaš pravo da rezervaciju dodeliš tom timu.",
  },

  /** Teams and roles — the admin's own screens. */
  timovi: {
    naslov: "Nalozi",
    tim: "Tim",
    timovi: "Timovi",
    korisnici: "Nalozi",
    noviTim: "Novi tim",
    naziv: "Naziv tima",
    dodaj: "Dodaj",
    noviNalog: "Novi nalog",
    ime: "Ime",
    email: "E-mail",
    lozinka: "Lozinka",
    lozinkaPomoc: "Najmanje 12 znakova. Reci je vozacu licno.",
    boja: "Boja bedza",
    napravi: "Napravi nalog",
    administrator: "Administrator",
    vozac: "Vozač",
    aktivan: "Ima pristup",
    neaktivan: "Nema pristup",
    zakljucaj: "Oduzmi pristup",
    otkljucaj: "Vrati pristup",
    bezTima: "Bez tima",
    nemaNaloga: "Još nema naloga.",
    nemaTimova: "Napravi prvo tim, pa onda nalog.",
    /**
     * Deletion is impossible here and saying so is kinder than a button that
     * fails: `reservations.kreirao` is ON DELETE RESTRICT.
     */
    zastoNemaBrisanja:
      "Nalog se ne briše — rezervacije koje je uneo moraju da ostanu. Oduzmi mu pristup.",
    nazivObavezan: "Unesi naziv tima.",
    imeObavezno: "Unesi ime.",
    emailNeispravan: "E-mail nije ispravan.",
    lozinkaKratka: "Lozinka mora imati najmanje 12 znakova.",
    bojaNeispravna: "Izaberi boju.",
    timObavezan: "Izaberi tim.",
    timPostoji: "Tim sa tim nazivom već postoji.",
    nalogNeuspeo: "Nalog nije napravljen. Proveri e-mail i pokušaj ponovo.",
    /**
     * A deployment fault, not a typing mistake — so it says so, and names the
     * thing to fix. Anything vaguer sends the owner round the form again.
     *
     * The variable name is passed in by the server action rather than written
     * here: this object ships to the phone with every client component, and
     * the name in it tripped CI's secret gate. See `IME_TAJNOG_KLJUCA` in
     * `src/env.ts`.
     */
    nedostajeKljuc: (promenljiva: string) =>
      "Server nema Supabase tajni ključ, pa ne može da napravi nalog. " +
      `Dodaj ${promenljiva} na Vercel.`,
    /** The dropdown option that files a booking away from every driver. */
    samoAdmini: "Samo administratori",
    /**
     * Shown on the form whenever the chosen team is "administrators only".
     * The owners chose to keep that option; this is what stops it becoming a
     * trip nobody driving can see.
     */
    samoAdminiUpozorenje:
      "Ovu rezervaciju neće videti nijedan vozač — samo administratori.",
    zaKoga: "Ko vidi rezervaciju",
  },
} as const;

/**
 * Serbian plural selection.
 *
 * Three forms, and the boundaries are not where an English speaker expects:
 * 21 takes the *singular* (`21 putnik`), 5 takes the many form, and 11–14 are
 * an exception to the rule that would otherwise catch them.
 */
export function srpskiOblik(n: number): "jedan" | "malo" | "mnogo" {
  const apsolutno = Math.abs(Math.trunc(n));
  const desetice = apsolutno % 100;
  const jedinice = apsolutno % 10;

  if (jedinice === 1 && desetice !== 11) return "jedan";
  if (jedinice >= 2 && jedinice <= 4 && (desetice < 12 || desetice > 14)) {
    return "malo";
  }
  return "mnogo";
}

function pluralizuj(
  n: number,
  oblici: { jedan: string; malo: string; mnogo: string },
): string {
  return `${n} ${oblici[srpskiOblik(n)]}`;
}

/** `1 putnik` · `2 putnika` · `5 putnika` · `21 putnik`. */
export function putnika(n: number): string {
  return pluralizuj(n, {
    jedan: "putnik",
    malo: "putnika",
    mnogo: "putnika",
  });
}

/**
 * `1 izabrana nije na ekranu` · `2 izabrane nisu na ekranu` ·
 * `5 izabranih nije na ekranu` · `21 izabrana nije na ekranu`.
 *
 * Reminds the owner, while copying a driver's message, that some of what he
 * ticked came from an earlier filter and is no longer among the cards on
 * screen — see `src/components/izbor-za-vozaca.tsx`. The verb agrees with the
 * count the way `srpskiOblik`'s three categories already split it: singular
 * for "jedan" and "mnogo" (a genitive-plural quantity is grammatically
 * singular), plural only for "malo".
 */
export function vanEkranaTekst(n: number): string {
  return pluralizuj(n, {
    jedan: "izabrana nije na ekranu",
    malo: "izabrane nisu na ekranu",
    mnogo: "izabranih nije na ekranu",
  });
}

/** `1 rezervacija` · `2 rezervacije` · `5 rezervacija` · `21 rezervacija`. */
export function rezervacija(n: number): string {
  return pluralizuj(n, {
    jedan: "rezervacija",
    malo: "rezervacije",
    mnogo: "rezervacija",
  });
}

/** `1 filter` · `2 filtera` · `5 filtera`. */
export function filtera(n: number): string {
  return pluralizuj(n, {
    jedan: "filter",
    malo: "filtera",
    mnogo: "filtera",
  });
}

/**
 * The one collator for the whole app.
 *
 * `sr-Latn` puts Č after C, Ć after Č, Đ after D, Š after S and Ž after Z.
 * Plain `sr` is the Cyrillic order and gets Latin text wrong (`Čačak` sorts
 * before `Cetinje`), and a default `localeCompare()` gets it wrong differently
 * depending on where it runs. Sorting must not depend on the machine.
 */
const kolator = new Intl.Collator("sr-Latn", {
  numeric: true,
  sensitivity: "variant",
});

export function uporediTekst(a: string, b: string): number {
  return kolator.compare(a, b);
}
