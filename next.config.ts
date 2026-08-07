import os from "node:os";
import type { NextConfig } from "next";

/**
 * Hosts allowed to pull /_next/* off the dev server. Next blocks these
 * cross-origin by default and the failure is confusing: the document renders
 * but CSS, hydration and HMR are all refused, so the page arrives unstyled with
 * every scroll-reveal stuck invisible. Only the literal hostname "localhost" is
 * exempt — reaching the same server as 127.0.0.1, or by LAN address from a
 * phone, trips it. Derived from the machine's own interfaces because a DHCP
 * address goes stale on the next lease. Production ignores this key.
 */
const allowedDevOrigins =
  process.env.NODE_ENV === "production"
    ? undefined
    : [
        "127.0.0.1",
        ...Object.values(os.networkInterfaces())
          .flat()
          .filter((iface) => iface?.family === "IPv4" && !iface.internal)
          .map((iface) => iface!.address),
        ...(process.env.NEXT_DEV_ORIGINS?.split(",").map((s) => s.trim()).filter(Boolean) ?? []),
      ];

/*
 * next dev serves the React refresh runtime as an eval'd blob, so 'unsafe-eval'
 * is required there and deliberately absent from production.
 */
const DEV_SCRIPT_SRC = process.env.NODE_ENV === "production" ? "" : " 'unsafe-eval'";

const CONTENT_SECURITY_POLICY = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${DEV_SCRIPT_SRC}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:",
  // next/font/google downloads and self-hosts at build time; nothing is fetched
  // from fonts.gstatic.com at runtime, so no third-party font origin is needed.
  "font-src 'self' data:",
  "connect-src 'self'",
  "frame-src 'none'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  /*
   * Production only. This rewrites every subresource URL to https, and
   * `next dev` serves plain http — so over a LAN address the browser upgrades
   * CSS and JS to a port with no TLS behind it and the page renders unstyled.
   * localhost hides it; a phone on the network does not.
   */
  ...(process.env.NODE_ENV === "production" ? ["upgrade-insecure-requests"] : []),
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: CONTENT_SECURITY_POLICY },
  /*
   * Two years, subdomains included, preload-eligible — matching the sibling
   * 2600i sites. Safe because every 2600i.com host is already HTTPS-only.
   */
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  /*
   * This site is entirely public marketing — no record identifiers in any URL —
   * so the stricter no-referrer-when-downgrade posture the sibling app needs is
   * not required. strict-origin-when-cross-origin still sends nothing when
   * leaving HTTPS for HTTP.
   */
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), browsing-topics=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // Emits .next/standalone — a self-contained `node server.js` with only the
  // dependencies actually reached, which is what the Dockerfile's runner copies.
  output: "standalone",
  allowedDevOrigins,
  // Advertising the framework version tells a scanner which CVEs to try.
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
  // The dev overlay badge sits over the footer controls and shows up in design
  // screenshots; the overlay stays available via keyboard.
  devIndicators: false,
};

export default nextConfig;
