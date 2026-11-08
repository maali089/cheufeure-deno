# DEENO – Einrichtung & Betrieb

## Lokal starten

```bash
npm install
npm run db:local          # lokale PostgreSQL-kompatible Test-DB (PGlite) auf Port 5433 – separates Terminal
DATABASE_URL="postgresql://postgres:postgres@127.0.0.1:5433/postgres?sslmode=disable" npx prisma migrate deploy
npm run build && npm start   # http://localhost:3000
```

`.env.local` ist für die lokale Entwicklung vorbereitet (E-Mails werden dort nur in der Konsole ausgegeben, **nicht** versendet).
Lokaler Admin-Zugang: `/admin` · Benutzer `deeno` · Passwort `deeno-local-admin-2026` · 2FA-Code aus `ADMIN_TOTP_SECRET` in `.env.local` (nur lokal – für Produktion neu erzeugen!). Sicherheitsdetails und Deployment-Schritte: `SECURITY_AUDIT.md`.

## Tests

```bash
npm run typecheck        # TypeScript
npm run lint             # ESLint
npm run test:unit        # Validierung, Sicherheit, Animations-Engine
npm run test:e2e         # Browser-Tests (Desktop + Mobil) – benötigt laufende DB
npm run test:visual      # Screenshots nach test-results/visual
```

## Benötigte externe Dienste (Produktion)

| Dienst | Zweck | Variablen | Status |
|---|---|---|---|
| PostgreSQL (z. B. Neon, Supabase, Vercel Postgres) | Speicherung der Anfragen | `DATABASE_URL` | **fehlt** |
| Resend (resend.com) | E-Mail an Betreiber + Eingangsbestätigung an Kunden | `RESEND_API_KEY`, `MAIL_FROM` | **fehlt** |
| Eigene Domain bei Resend verifizieren | Absenderadresse (nicht @yahoo.com möglich) | `MAIL_FROM` | **fehlt** |
| Google Maps Platform (Places API New, optional Routes API) | Adress-Autovervollständigung, später Routen | `GOOGLE_MAPS_API_KEY`, `ROUTE_CALCULATION_ENABLED` | optional |
| Stripe (stripe.com) | Online-Zahlung (Karte, Apple Pay, Google Pay über Stripe Checkout) | `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET` | **fehlt** (lokal nur Dummy-Werte für Webhook-Tests) |
| Preisregeln | Festpreise – Voraussetzung für Online-Zahlung | `PRICING_RULES_JSON` | **fehlt** – von DEENO festzulegen |
| Admin-Zugang | `/admin` | `ADMIN_USERNAME`, `ADMIN_PASSWORD_HASH` (`npm run admin:hash -- "Passwort"`), `ADMIN_SESSION_SECRET` | neu erzeugen |
| 2FA (Pflicht in Produktion) | `/admin` | `ADMIN_TOTP_SECRET` (`npm run admin:totp`, in Authenticator-App eintragen) | neu erzeugen |
| Bot-Schutz (empfohlen) | Formulare | `NEXT_PUBLIC_TURNSTILE_SITE_KEY`, `TURNSTILE_SECRET_KEY` (Cloudflare Turnstile) | optional |

Ohne `RESEND_API_KEY` werden Anfragen trotzdem gespeichert; die Website behauptet dann **keinen** erfolgreichen E-Mail-Versand.

## Online-Zahlung aktivieren (Stripe)

Die Zahlung ist vollständig vorbereitet, aber bewusst **deaktiviert**. Solange eine Voraussetzung fehlt, endet das Buchungsfenster mit „Unverbindliches Angebot anfordern“ – es wird keine Zahlung ausgelöst und kein Bezahlbutton angezeigt.

Voraussetzungen (alle nötig):
1. `STRIPE_SECRET_KEY` und `STRIPE_WEBHOOK_SECRET` gesetzt. Webhook im Stripe-Dashboard auf `https://<domain>/api/stripe/webhook` mit den Ereignissen `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.async_payment_failed`, `checkout.session.expired`.
2. `PRICING_RULES_JSON` mit von DEENO bestätigten Preisen (Struktur siehe `.env.example`). Streckenpreise zusätzlich nur mit `GOOGLE_MAPS_API_KEY` + `ROUTE_CALCULATION_ENABLED="true"` (echte Routenberechnung, keine Schätzung).
3. `INSTANT_BOOKING_ENABLED="true"` – nur, wenn DEENO Fahrten ohne manuelle Prüfung verbindlich annehmen kann.
4. Fahrzeugklasse im Admin unter „Flotte“ als **bestätigt** markiert.
5. Fahrt mindestens `MIN_LEAD_HOURS` (Standard 24) in der Zukunft.

Ablauf: Preis wird nur serverseitig berechnet → Buchung gespeichert (Zahlung „ausstehend“) → Weiterleitung zu Stripe Checkout → Webhook prüft Signatur, Betrag und Session-Zuordnung → Buchung „bezahlt/bestätigt“ + Bestätigungs-E-Mails. Doppelte Webhook-Ereignisse werden ignoriert. Kartendaten erreichen den eigenen Server nie. Apple Pay / Google Pay müssen im Stripe-Dashboard aktiviert sein (Apple Pay: Domain verifizieren).

Test im Stripe-Testmodus: `sk_test_…`-Schlüssel setzen, `stripe listen --forward-to localhost:3000/api/stripe/webhook` (Stripe CLI) und Testkarte `4242 4242 4242 4242`.

## Deployment auf Vercel

1. Projekt in ein Git-Repository legen und bei Vercel importieren (Framework: Next.js).
2. Alle Variablen aus `.env.example` in Vercel → Settings → Environment Variables eintragen.
3. Build Command: `npm run vercel-build` (führt Migrationen aus und baut).
4. Domain verbinden, `NEXT_PUBLIC_SITE_URL` auf die finale Domain setzen.

## Vor Veröffentlichung von DEENO zu klären

- Impressum: USt-IdNr., PBefG-Genehmigung + zuständige Behörde, ggf. Handelsregister, Erklärung zur Verbraucherschlichtung (auf der Seite markiert).
- Datenschutz: Anbieter (Hosting, DB, E-Mail, ggf. Google), Löschfristen – fachliche Prüfung.
- Bestätigung: angebotene Fahrzeuge (im Admin unter „Flotte“ freischalten), Einsatzgebiet, WhatsApp-Nummer.
- Eigene Fahrzeugfotos (aktuell lizenzfreie Unsplash-Symbolbilder, siehe `/bildnachweise`).
- Preisregeln, falls später automatische Preise gewünscht (`src/lib/pricing.ts`).
