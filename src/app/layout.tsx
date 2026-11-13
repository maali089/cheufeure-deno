import type { Metadata, Viewport } from "next";
import { Cormorant_Garamond, Manrope } from "next/font/google";
import { company, siteIndexable, siteUrl } from "@/config/company";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  variable: "--font-cormorant",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-manrope",
  display: "swap",
});

const title = "DEENO Chauffeurservice Maisach & München | Limousinenservice";
const ogTitle = "DEENO – Chauffeur- & Limousinenservice in München";
const description =
  "Chauffeur- und Limousinenservice aus Maisach: Flughafentransfer München, Business-, Event- und Hochzeitsfahrten. Fahrt jetzt online anfragen.";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: title, template: "%s | DEENO Chauffeurservice" },
  description,
  applicationName: "DEENO",
  keywords: [
    "Chauffeurservice Maisach",
    "Limousinenservice Maisach",
    "Chauffeurservice München",
    "Flughafentransfer München",
    "Business Chauffeurservice",
    "Limousinenservice München",
  ],
  authors: [{ name: company.legalName }],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "de_DE",
    url: siteUrl,
    siteName: "DEENO Chauffeur- & Limousinenservice",
    title: ogTitle,
    description,
  },
  twitter: { card: "summary_large_image", title: ogTitle, description },
  robots: siteIndexable ? { index: true, follow: true } : { index: false, follow: false },
  formatDetection: { telephone: false, email: false, address: false },
};

export const viewport: Viewport = {
  themeColor: "#090909",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className={`${cormorant.variable} ${manrope.variable}`}>
      <body className="bg-ink text-ivory antialiased">{children}</body>
    </html>
  );
}
