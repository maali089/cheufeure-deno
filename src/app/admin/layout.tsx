import type { Metadata } from "next";

export const metadata: Metadata = {
  title: { default: "Verwaltung", template: "%s | DEENO Verwaltung" },
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-[100dvh] bg-ink">{children}</div>;
}
