import type { Metadata, Viewport } from "next";
import "@fontsource/anton/400.css";
import "@fontsource/permanent-marker/400.css";
import "@fontsource-variable/archivo/index.css";
import "./globals.css";
import { SITE } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(process.env.APP_URL || SITE.url),
  title: {
    default: `${SITE.name} | Customer portal`,
    template: `%s | ${SITE.name}`,
  },
  description: SITE.description,
  // A private portal: never listed by search engines.
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false } },
  // Opening from the home screen on iPhone: full screen, with this name under the icon.
  appleWebApp: { capable: true, title: SITE.shortName, statusBarStyle: "black" },
};

export const viewport: Viewport = {
  themeColor: "#0d0d0d",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en-NZ">
      <body>{children}</body>
    </html>
  );
}
