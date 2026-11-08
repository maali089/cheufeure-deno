import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BrandMark } from "@/components/brand";
import { getAdminSession, isAdminConfigured, mfaStatus } from "@/lib/server/auth";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Anmeldung" };

export default async function LoginPage() {
  if (await getAdminSession()) redirect("/admin");
  const mfa = mfaStatus();
  return (
    <main className="flex min-h-[100dvh] items-center justify-center px-5">
      <div className="w-full max-w-sm">
        <BrandMark />
        <h1 className="display mt-12 text-4xl">Verwaltung</h1>
        <p className="mt-3 text-sm text-mist">Geschützter Bereich für Buchungsanfragen.</p>
        {!isAdminConfigured() && (
          <p className="mt-6 border-l-2 border-gold bg-gold/[0.06] px-4 py-3 text-sm text-ivory/80">
            Noch nicht eingerichtet: Bitte ADMIN_PASSWORD_HASH und ADMIN_SESSION_SECRET setzen (siehe docs/EINRICHTUNG.md).
          </p>
        )}
        {isAdminConfigured() && mfa === "required" && (
          <p className="mt-6 border-l-2 border-gold bg-gold/[0.06] px-4 py-3 text-sm text-ivory/80">
            Anmeldung gesperrt: Die Zwei-Faktor-Anmeldung ist vorgeschrieben, aber noch nicht eingerichtet (ADMIN_TOTP_SECRET, siehe SECURITY_AUDIT.md).
          </p>
        )}
        <div className="mt-10">
          <LoginForm mfa={mfa === "enabled"} />
        </div>
      </div>
    </main>
  );
}
