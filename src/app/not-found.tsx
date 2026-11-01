import Link from "next/link";
import { BrandMark } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="flex min-h-[100svh] flex-col items-center justify-center px-6 text-center">
      <BrandMark />
      <p className="eyebrow mt-16">Fehler 404</p>
      <h1 className="display mt-5 text-5xl md:text-6xl">Diese Seite existiert nicht.</h1>
      <p className="mt-5 max-w-md text-ivory/70">Möglicherweise wurde die Adresse falsch eingegeben oder die Seite wurde verschoben.</p>
      <Link href="/" className="btn btn-gold mt-10">
        Zur Startseite
      </Link>
    </main>
  );
}
