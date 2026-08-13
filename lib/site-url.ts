/**
 * The absolute public origin of this deployment.
 *
 * Every other URL on the site is relative, deliberately. This exists for the
 * places that cannot be: metadataBase, the canonical tag, and the OG image URL
 * a scraper needs to resolve. All are read outside the request that produced
 * them, so a relative path has nothing to resolve against.
 *
 * It must come from configuration rather than the incoming request. Behind a
 * reverse proxy in a container the request's own origin is
 * `http://localhost:3000` — correct from inside the container, useless to a
 * crawler, and the sort of bug that only shows up in production because it is
 * right on a laptop.
 *
 * aimtp.net is canonical. Note that the site does not own that whole origin:
 * /schemas/, /spec/ and /runtime/schemas/ are the `$id` namespace of the
 * protocol's JSON Schemas and are served from disk by Caddy, in a block that is
 * mutually exclusive with the one proxying here. See docs/deployment.md.
 */
const FALLBACK = "http://localhost:3000";

/** Trailing slashes are stripped so callers can always write `${siteUrl()}/path`. */
export function siteUrl(): string {
  const configured = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  return (configured || FALLBACK).replace(/\/+$/, "");
}
