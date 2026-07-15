// Normalize an organizer-entered URL for use as an external link href.
//
// Organizers routinely paste bare domains ("marriott.com/…", "example.com")
// with no scheme. A bare-domain value in an anchor href is treated as a
// *relative* path by the browser, so "marriott.com/x" resolves against the
// current page (…/conventions/slug/marriott.com/x) and 404s. Prefixing
// https:// makes it an absolute link. Values that already carry a scheme
// (http/https/mailto/tel) or protocol-relative "//" URLs are left untouched.
export function toAbsoluteUrl(raw: string): string;
export function toAbsoluteUrl(raw?: string | null): string | undefined;
export function toAbsoluteUrl(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const url = raw.trim();
  if (!url) return undefined;
  // Already absolute (any scheme like http:, https:, mailto:, tel:) or
  // protocol-relative — leave as-is.
  if (/^[a-z][a-z0-9+.-]*:/i.test(url) || url.startsWith('//')) return url;
  return `https://${url}`;
}
