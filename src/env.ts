/**
 * Environment access. Server-only values throw on read when missing rather
 * than silently producing `undefined` deep inside a query.
 */
function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Nedostaje promenljiva okruženja: ${name}. Vidi .env.example.`,
    );
  }
  return value;
}

/** Pooled connection (port 6543 in production). Used by the running app. */
export const databaseUrl = () => required("DATABASE_URL");

/**
 * Direct connection (port 5432 in production). Migrations and seeds only —
 * drizzle-kit cannot run migrations over the pooler.
 */
export const directUrl = () => process.env.DIRECT_URL ?? required("DATABASE_URL");

export const supabaseUrl = () => required("NEXT_PUBLIC_SUPABASE_URL");

/**
 * Publishable key (`sb_publishable_…`) — the successor to the legacy `anon`
 * JWT. Low privilege, respects RLS, and is meant to reach the browser.
 *
 * Read from the inlined literal rather than a computed lookup: Next replaces
 * `process.env.NEXT_PUBLIC_*` at build time only when it appears verbatim,
 * so `process.env[name]` would come back undefined in a client component.
 */
export const supabasePublishableKey = () => {
  const value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
  if (!value) {
    throw new Error(
      "Nedostaje promenljiva okruženja: NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY. " +
        "Vidi .env.example.",
    );
  }
  return value;
};

/**
 * The secret key's variable *name*, for the one message that has to say it —
 * `T.timovi.nedostajeKljuc`, shown to an owner when the key is missing on
 * Vercel. Spelled here, in server code, and not in `src/lib/tekst.ts`: every
 * client component imports `T` whole, so a name written there ships to the
 * phone and fails CI's "Nijedna tajna u klijentskom paketu" gate. That gate is
 * right to look for the name — a stray `process.env.…` read in client code
 * looks exactly like it in a bundle — so the name stays out rather than the
 * gate being loosened.
 */
export const IME_TAJNOG_KLJUCA = "SUPABASE_SECRET_KEY";

/**
 * Secret key (`sb_secret_…`) — the successor to `service_role`.
 *
 * BYPASSES ROW LEVEL SECURITY. Only ever read this from server code. It has
 * no `NEXT_PUBLIC_` prefix, so Next will not inline it into a client bundle;
 * importing this function from a client component fails the build, which is
 * the intended outcome.
 */
export const supabaseSecretKey = () => required(IME_TAJNOG_KLJUCA);
