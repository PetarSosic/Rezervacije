"use server";

/**
 * Account and team management — admins only.
 *
 * **This is the only module in the app allowed to import
 * `src/lib/supabase/admin.ts`.** That file's header used to say the secret-key
 * client was never to be imported by a route, Server Action or Server
 * Component, and that rule was right while there was no way to create an
 * account from inside the app. Creating one is now the owners' job, from their
 * phone, and `auth.admin.createUser` is the only API that can do it. The rule
 * has been rewritten there rather than quietly broken here.
 *
 * Every exported action begins with `zahtevajAdmina()`, which `notFound()`s a
 * driver rather than returning 403 — a 403 would confirm that `/nalozi` is a
 * real screen, and the owners asked that a driver not learn what exists
 * outside their own team.
 */
import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  izmeniProfil,
  napraviTim as upisiTim,
  upisiProfil,
} from "@/db/queries";
import { zahtevajAdmina } from "@/lib/auth";
import { IME_TAJNOG_KLJUCA } from "@/env";
import { supabaseAdmin } from "@/lib/supabase/admin";
import { T } from "@/lib/tekst";

export type StanjeNaloga = { ok: true } | { ok: false; greska: string } | undefined;

/** Long enough that a guessed password is not the way in. */
const NAJKRACA_LOZINKA = 12;

const TimSchema = z.object({
  naziv: z.string().trim().min(1, T.timovi.nazivObavezan).max(60),
});

const NalogSchema = z.object({
  ime: z.string().trim().min(1, T.timovi.imeObavezno).max(60),
  email: z.email({ message: T.timovi.emailNeispravan }),
  lozinka: z.string().min(NAJKRACA_LOZINKA, T.timovi.lozinkaKratka),
  boja: z.string().regex(/^#[0-9a-fA-F]{6}$/, T.timovi.bojaNeispravna),
  timId: z.uuid({ message: T.timovi.timObavezan }),
});

export async function napraviTim(
  _prethodno: StanjeNaloga,
  formData: FormData,
): Promise<StanjeNaloga> {
  await zahtevajAdmina();

  const polja = TimSchema.safeParse({ naziv: formData.get("naziv") ?? "" });
  if (!polja.success) {
    return { ok: false, greska: polja.error.issues[0]?.message ?? T.greske.neuspelo };
  }

  try {
    await upisiTim(polja.data.naziv);
  } catch {
    // Almost certainly the unique constraint on `naziv`. The detail names a
    // constraint, which is no use to the person reading it.
    return { ok: false, greska: T.timovi.timPostoji };
  }

  revalidatePath("/nalozi");
  return { ok: true };
}

/**
 * Creates the `auth.users` account and its `profiles` row.
 *
 * A write across two systems that cannot share a transaction, so the order and
 * the failure path both matter: the auth account is created first, and **if
 * the profile insert then fails the auth account is deleted again**. Leaving
 * it would strand an account that can authenticate and has no profile. It
 * would be refused everywhere — `je_clan()` and `profilPoId` both require the
 * row — so it fails closed, but it is invisible rubbish in `auth.users` that
 * nothing else ever cleans up.
 *
 * A new account is always a driver on a real team. There is no way to create
 * an admin from this screen: promoting one is a separate, deliberate edit of
 * an account that already exists, which is a decision worth making twice.
 */
export async function napraviNalog(
  _prethodno: StanjeNaloga,
  formData: FormData,
): Promise<StanjeNaloga> {
  await zahtevajAdmina();

  const polja = NalogSchema.safeParse({
    ime: formData.get("ime") ?? "",
    email: formData.get("email") ?? "",
    lozinka: formData.get("lozinka") ?? "",
    boja: formData.get("boja") ?? "",
    timId: formData.get("timId") ?? "",
  });
  if (!polja.success) {
    return { ok: false, greska: polja.error.issues[0]?.message ?? T.greske.neuspelo };
  }
  const { ime, email, lozinka, boja, timId } = polja.data;

  // `supabaseAdmin()` throws when SUPABASE_SECRET_KEY is missing, and it is a
  // *deployment* fault rather than anything the owner typed — so it is caught
  // here and named, instead of unwinding into Next's error page. That is
  // exactly how this failed the first time it was used in production: the key
  // was never added to Vercel, and creating an account crashed the screen with
  // nothing to indicate why.
  let supabase: ReturnType<typeof supabaseAdmin>;
  try {
    supabase = supabaseAdmin();
  } catch {
    return { ok: false, greska: T.timovi.nedostajeKljuc(IME_TAJNOG_KLJUCA) };
  }

  const { data, error } = await supabase.auth.admin.createUser({
    email,
    password: lozinka,
    // Nobody is going to click a confirmation link on a shared work phone, and
    // the owner has just typed the address themselves.
    email_confirm: true,
  });

  if (error || !data.user) {
    // One message whatever went wrong. Supabase distinguishes "already
    // registered" from the rest, and passing that through would turn this form
    // into a way to ask whether an address has an account.
    return { ok: false, greska: T.timovi.nalogNeuspeo };
  }

  try {
    const upisan = await upisiProfil({
      id: data.user.id,
      ime,
      boja,
      uloga: "korisnik",
      timId,
    });
    if (!upisan) throw new Error("profil nije upisan");
  } catch {
    // Roll the auth account back so a failed create leaves nothing behind.
    await supabase.auth.admin.deleteUser(data.user.id);
    return { ok: false, greska: T.timovi.nalogNeuspeo };
  }

  revalidatePath("/nalozi");
  return { ok: true };
}

/**
 * Lock an account, or let it back in.
 *
 * This is what "removing a person" means here, and it is not a euphemism for a
 * missing delete: `reservations.kreirao -> profiles.id` is `ON DELETE
 * RESTRICT` and `profiles.id -> auth.users.id` is `ON DELETE CASCADE`, so once
 * somebody has entered a booking they cannot be deleted from either end. The
 * bookings they entered stay visible to their team, which is what the team
 * needs after that person stops working.
 */
export async function promeniAktivnost(
  id: string,
  aktivan: boolean,
): Promise<void> {
  const admin = await zahtevajAdmina();

  // An admin locking themselves out is a support call nobody can answer, and
  // if they are the last admin it is unrecoverable from inside the app.
  if (id === admin.id) return;

  await izmeniProfil(id, { aktivan });
  revalidatePath("/nalozi");
}

/**
 * Move somebody to another crew. Their existing bookings do not move.
 *
 * Takes `FormData` rather than the id directly because it is bound as a form
 * action — `promeniTim.bind(null, id)` leaves the form's own payload as the
 * second argument.
 */
export async function promeniTim(
  id: string,
  formData: FormData,
): Promise<void> {
  await zahtevajAdmina();

  const timId = formData.get("timId");
  // A driver must end up on a real team: the `profiles_tim_prema_ulozi` check
  // would reject anything else anyway, and failing here says so sooner.
  if (typeof timId !== "string" || !z.uuid().safeParse(timId).success) return;

  await izmeniProfil(id, { uloga: "korisnik", timId });
  revalidatePath("/nalozi");
}
