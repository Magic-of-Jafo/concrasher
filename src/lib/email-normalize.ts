// Canonicalize an email to a single dedup key, defeating the "same inbox, many
// addresses" trick used to mint duplicate accounts. Gmail ignores dots and
// everything after a "+" in the local part, so jo.hn+spam@gmail.com and
// john@gmail.com are ONE inbox; other providers ignore "+tag" subaddressing
// but treat dots as significant.
//
// The canonical form is a MATCH KEY only — never shown to users and never used
// for delivery. Keep the address the user actually typed for login and email.

const GMAIL_DOMAINS = new Set(['gmail.com', 'googlemail.com']);

/**
 * Reduce an email to its canonical inbox key. Returns a lowercased
 * local@domain; on anything unparseable it returns the trimmed lowercase input
 * so callers still get a stable, comparable value.
 */
export function canonicalizeEmail(raw: string): string {
    const trimmed = (raw || '').trim().toLowerCase();
    const at = trimmed.lastIndexOf('@');
    if (at <= 0 || at === trimmed.length - 1) return trimmed; // not an address we can split

    let local = trimmed.slice(0, at);
    let domain = trimmed.slice(at + 1);

    // "+tag" subaddressing is ignored by Gmail and every major provider that
    // supports it, so it never distinguishes a real inbox.
    const plus = local.indexOf('+');
    if (plus !== -1) local = local.slice(0, plus);

    if (GMAIL_DOMAINS.has(domain)) {
        domain = 'gmail.com';       // googlemail.com is an alias of gmail.com
        local = local.replace(/\./g, ''); // Gmail ignores dots in the local part
    }

    return `${local}@${domain}`;
}

/** True when two addresses resolve to the same inbox. */
export function sameInbox(a: string, b: string): boolean {
    return canonicalizeEmail(a) === canonicalizeEmail(b);
}
