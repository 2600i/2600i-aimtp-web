import type { Metadata } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import { siteUrl } from "@/lib/site-url";
import "./globals.css";

/*
 * The same pairing the sibling homeschool property runs, so the two sites set
 * type identically. Archivo is the closest widely-available stand-in for
 * spacex.com's D-DIN: tall x-height, engineered grotesque, holds up in all-caps
 * at display sizes.
 *
 * Geist Mono carries the load-bearing detail here — envelopes, verdicts, audit
 * rows and the version in the bar are all set in it.
 */
const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

const TITLE = "AIMTP by 2600i";
const DESCRIPTION =
  "The trust layer for AI agents. AIMTP is an open protocol for verifiable intent, identity and authority between agents and the systems they act on — and the Agent Trust Gateway is its first enforcement point.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: TITLE, template: `%s — ${TITLE}` },
  description: DESCRIPTION,
  applicationName: "AIMTP",
  // aimtp.net is canonical; every page declares it so a vanity domain or a
  // proxy copy cannot split ranking against the real host.
  alternates: { canonical: "/" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    siteName: TITLE,
    url: "/",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: TITLE, description: DESCRIPTION },
  /*
   * No `icons` key: app/icon.png and app/apple-icon.png are picked up by Next's
   * file conventions and served at content-hashed URLs, which naming them by
   * hand here would defeat. Both come out of scripts/build-brand-assets.mjs.
   */
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${archivo.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
