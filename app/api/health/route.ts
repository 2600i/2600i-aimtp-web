/**
 * Liveness probe for the container HEALTHCHECK. Deliberately trivial: it
 * answers "is this process serving HTTP", not "is everything downstream well",
 * because there is nothing downstream — this site is static marketing.
 */
export const dynamic = "force-dynamic";

export function GET() {
  return Response.json({ status: "ok", service: "aimtp-web" });
}
