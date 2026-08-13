/**
 * RFC 9116 security.txt.
 *
 * The protocol repository's SECURITY.md says, in bold, not to open a public
 * issue for a security report. That instruction only helps someone who has
 * already found the file. A researcher who finds a flaw by poking at this site
 * starts at the origin, not at a GitHub repository, and until now had nothing
 * here pointing anywhere — so the likeliest next step was the thing the policy
 * asks them not to do.
 *
 * Both contacts are real and in preference order: GitHub's private
 * vulnerability reporting is enabled on that repository, and the mailbox is the
 * fallback SECURITY.md already names. Neither is aspirational — an unmonitored
 * address here is worse than no file, because it converts a report into
 * silence.
 *
 * Served from a route handler rather than public/ so the media type and charset
 * are set explicitly. RFC 9116 requires text/plain; a static file leaves that
 * to whatever the host infers.
 */
export const dynamic = "force-static";

const REPO = "https://github.com/2600i/AIMTP";

/*
 * Required by RFC 9116, and deliberately a literal rather than "now + 1 year".
 * A computed expiry can never lapse, which sounds like the safer choice and is
 * exactly the problem: the field exists to say when someone should stop
 * trusting this file, and a value that renews itself asserts freshness no one
 * has checked. This is a commitment to re-read the contacts before the date.
 */
const EXPIRES = "2027-08-01T00:00:00.000Z";

const BODY = [
  "# Security contact for AIMTP by 2600i (https://aimtp.net)",
  "# Please do not open a public issue for a security report.",
  "",
  `Contact: ${REPO}/security/advisories/new`,
  "Contact: mailto:steve@2600i.com",
  `Expires: ${EXPIRES}`,
  `Policy: ${REPO}/blob/main/SECURITY.md`,
  "Preferred-Languages: en",
  "Canonical: https://aimtp.net/.well-known/security.txt",
  "",
  "# Email reports: put AIMTP SECURITY in the subject.",
  "# Acknowledgement within 5 business days; please allow 90 days before",
  "# public disclosure, and say so if you intend to publish sooner.",
  "",
  "# This is a developer preview. The Agent Trust Gateway is an experimental",
  "# authorization boundary, not a hardened production control. Scope, and the",
  "# issues already known and accepted, are in the policy above.",
  "",
].join("\n");

export async function GET() {
  return new Response(BODY, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  });
}
