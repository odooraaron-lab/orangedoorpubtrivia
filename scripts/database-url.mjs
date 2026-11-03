// Finds the Neon connection string, whatever name Vercel gave it.
// Vercel's Neon integration adds DATABASE_URL, or <PREFIX>_DATABASE_URL when a
// custom prefix was chosen while connecting the database.
// Used by scripts/migrate.mjs and src/db/index.ts.

const PREFERRED = ["DATABASE_URL", "POSTGRES_URL", "NEON_DATABASE_URL"];

/**
 * Neon's connection strings say sslmode=require. The pg driver treats that as verify-full
 * (check the certificate) and logs a warning on every new connection that this will change.
 * Saying verify-full outright keeps the same, stricter behaviour and stops the warning.
 */
export function withVerifiedSsl(url) {
  return url.replace(/([?&]sslmode=)(prefer|require|verify-ca)(?=&|$)/, "$1verify-full");
}

/** @returns {{ key: string, url: string } | null} */
export function findDatabaseUrl(env = process.env) {
  const found = findRawDatabaseUrl(env);
  return found ? { key: found.key, url: withVerifiedSsl(found.url) } : null;
}

function findRawDatabaseUrl(env) {
  for (const key of PREFERRED) {
    if (env[key]) return { key, url: env[key] };
  }
  const prefixed = Object.keys(env)
    .filter((k) => /_(DATABASE_URL|POSTGRES_URL)$/.test(k) && !/UNPOOLED|NON_POOLING/.test(k) && env[k])
    .sort();
  if (prefixed.length) return { key: prefixed[0], url: env[prefixed[0]] };
  // Last resort: the direct (unpooled) connection still works, just less efficiently.
  const direct = Object.keys(env)
    .filter((k) => /(DATABASE_URL_UNPOOLED|POSTGRES_URL_NON_POOLING)$/.test(k) && env[k])
    .sort();
  return direct.length ? { key: direct[0], url: env[direct[0]] } : null;
}
