"use client";

import { useActionState, useState } from "react";
import { loginAction, type LoginState } from "../actions";

export function LoginForm({ mfa }: { mfa: boolean }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, undefined);
  // Kontrollierte Felder: React setzt Formulare nach einer Action sonst zurück
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totp, setTotp] = useState("");
  return (
    <form action={action} className="space-y-6">
      <div>
        <label htmlFor="username" className="field-label">
          Benutzername
        </label>
        <input id="username" name="username" className="field" autoComplete="username" required value={username} onChange={(e) => setUsername(e.target.value)} />
      </div>
      <div>
        <label htmlFor="password" className="field-label">
          Passwort
        </label>
        <input id="password" name="password" type="password" className="field" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </div>
      {mfa && (
        <div>
          <label htmlFor="totp" className="field-label">
            Bestätigungscode (Authenticator-App)
          </label>
          <input
            id="totp"
            name="totp"
            className="field"
            inputMode="numeric"
            autoComplete="one-time-code"
            pattern="[0-9]{6}"
            maxLength={6}
            required
            value={totp}
            onChange={(e) => setTotp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          />
        </div>
      )}
      {state?.error && (
        <p className="field-error" role="alert">
          {state.error}
        </p>
      )}
      <button type="submit" className="btn btn-gold w-full" disabled={pending}>
        {pending ? "Anmeldung …" : "Anmelden"}
      </button>
    </form>
  );
}
