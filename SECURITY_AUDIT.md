# Security Audit – DEENO Chauffeur-Website

| | |
|---|---|
| Datum | 06.11.2026 |
| Stand des Codes | Branch `main`, Basis-Commit `21d53bc` + Änderungen dieses Audits (noch nicht committet) |
| Umfang | Gesamtes Repository: Next.js-Frontend/Backend, API-Routen, Server Actions, Adminbereich, Prisma/PostgreSQL (Supabase), Konfiguration, Abhängigkeiten |
| Prüfmaßstab | OWASP Top 10 (2021), OWASP ASVS 4.0 Level 2 (Auswahl), OWASP API Security Top 10 (2023), Supabase-Sicherheitsempfehlungen |
| Testumgebung | Lokal: `next start` (Produktionsmodus) + lokale PGlite-Datenbank (PostgreSQL-kompatibel). **Kein Zugriff auf Vercel oder das Supabase-Projekt.** |

> **Wichtig:** Alle Änderungen sind **nur lokal** umgesetzt und getestet. Nichts davon ist produktiv aktiv, bevor die Schritte in **Abschnitt E** ausgeführt wurden.

---

## A. Executive Summary

### Gesamtbewertung

Die Anwendung war bereits ordentlich gebaut: Eingaben werden serverseitig mit Zod geprüft, Datenbankzugriffe laufen ausschließlich parametrisiert über Prisma, Preise entstehen nur auf dem Server, Stripe-Webhooks werden signiert, idempotent und mit Betragsabgleich verarbeitet, E-Mail-Inhalte werden HTML-escaped, und Row Level Security war für alle Tabellen aktiv. Es gab **keine kritische Lücke** (keine SQL-Injection, kein XSS, kein offener Admin-Endpunkt, keine Secrets im Git-Verlauf).

Schwächen gab es vor allem beim **Adminbereich** (kein echtes Abmelden, keine Zwei-Faktor-Anmeldung), beim **Missbrauchsschutz der öffentlichen Formulare** (Rate-Limit nur pro Serverinstanz, Bestätigungsmails an beliebige Adressen, schwacher Bot-Schutz) und bei der **Supabase-Härtung** (Standardrechte der öffentlichen API-Rollen).

**Nach dem Audit:** 2 hohe, 5 mittlere und 6 niedrige Schwachstellen sind lokal behoben und durch automatisierte Tests abgesichert. Produktiv aktiv werden sie erst durch die Schritte in Abschnitt E.

### Kritische Risiken

Keine kritischen Risiken gefunden.

### Wichtigste behobene Probleme (lokal)

1. **Admin-Sitzungen werden jetzt serverseitig gespeichert und beim Abmelden widerrufen.** Ein gestohlenes Cookie ist nach dem Logout wertlos. Zusätzlich gibt es eine Leerlauf-Abmeldung nach 30 Minuten (SEC-01).
2. **Die Zwei-Faktor-Anmeldung (TOTP) ist für den Adminbereich Pflicht.** Ohne eingerichteten 2FA-Schlüssel bleibt die Anmeldung in Produktion gesperrt (SEC-02).
3. **Das Rate-Limit wirkt jetzt zentral über die Datenbank** und damit über alle Serverless-Instanzen hinweg (Formulare, Login, Adress-API) (SEC-03).
4. **Das Buchungsformular kann nicht mehr für Mail-Bombing oder Spam missbraucht werden:** Bestätigungen an dieselbe Adresse sind begrenzt, Freitext wird nicht an Dritte gespiegelt (SEC-04).
5. **Supabase:** Die API-Rollen `anon`/`authenticated` verlieren per Migration alle Tabellenrechte, auch für künftige Tabellen (SEC-05).

### Verbleibende Risiken (Kurzfassung)

- **2FA-Schlüssel muss in Vercel gesetzt werden.** Sonst ist der Adminbereich nach dem Deployment gesperrt (gewollt: fail closed).
- **Supabase Data API sollte deaktiviert werden** (manuell, Dashboard). Der Produktionszustand der Grants und Policies wurde **nicht** geprüft (kein Zugriff).
- **Bot-Schutz (Turnstile) ist eingebaut, aber erst aktiv, wenn die Schlüssel gesetzt sind.** Vorher muss die Datenschutzerklärung angepasst werden.
- **Die CSP erlaubt `'unsafe-inline'` für Skripte** (bewusst akzeptiert, siehe SEC-13).
- **Die App verbindet sich vermutlich als Rolle `postgres`** (umgeht RLS). Eine eigene Rolle mit minimalen Rechten wird empfohlen (SEC-05, Folgeschritt).
- **Es gibt keine automatische Löschung alter Kundendaten** (DSGVO, SEC-16).

---

## Inventar & Threat Model

### Tatsächliche Architektur

| Komponente | Technik | Bemerkung |
|---|---|---|
| Frontend + Backend | Next.js 16 (App Router), React 19, gehostet auf **Vercel** (Projekt `cheufeure-deno`, Region `dub1`) | Proxy (`src/proxy.ts`) als erste Schutzschicht für `/admin` |
| Datenbank | PostgreSQL bei **Supabase** (eu-west-1), Zugriff **nur serverseitig** über Prisma 7 + `pg` mit TLS-Zertifikatsprüfung | Migrationen laufen beim Vercel-Build (`scripts/vercel-build.mjs` → `prisma migrate deploy`) |
| **Supabase Auth** | **nicht verwendet** | Admin-Login ist eine eigene Implementierung (ein Konto aus Umgebungsvariablen) |
| **Supabase Edge Functions** | **nicht vorhanden** | – |
| **Supabase Storage** | **nicht verwendet** | Es gibt keine Datei-Uploads |
| Supabase REST/GraphQL (Data API) | **von der App nicht verwendet**, aber standardmäßig öffentlich erreichbar | Siehe SEC-05 |
| Supabase-Schlüssel (anon/service_role) | **nicht im Projekt verwendet** | Kein `@supabase/*`-Paket, kein Schlüssel im Code |
| E-Mail | Resend (serverseitig) | Betreiber- und Kundenbenachrichtigungen |
| Zahlung | Stripe Checkout + Webhook | Aktuell deaktiviert (`INSTANT_BOOKING_ENABLED=false`) |
| Adressen/Routen | Google Places/Routes (serverseitiger Proxy) | Schlüssel nur auf dem Server |
| Bot-Schutz | Honeypot + Mindest-Ausfülldauer; **neu:** optional Cloudflare Turnstile | |

### Angriffsfläche (Endpunkte)

| Endpunkt | Zugriff | Auth | Schutzmaßnahmen (nach Audit) |
|---|---|---|---|
| `POST /api/booking` | öffentlich | – | Origin-Prüfung, nur JSON, max. 20 KB, Zod (unbekannte Felder werden verworfen), DB-Rate-Limit 5/10 min/IP, Honeypot + Zeitprüfung, optional Turnstile, Duplikatschutz 15 min, Empfänger-Limit 3 Mails/24 h |
| `POST /api/booking/quote` | öffentlich | – | Origin, JSON, max. 12 KB, Zod, DB-Rate-Limit 30/min/IP |
| `POST /api/contact` | öffentlich | – | Origin, JSON, max. 12 KB, Zod, DB-Rate-Limit 4/10 min/IP, Honeypot, optional Turnstile; Mail nur an den Betreiber |
| `GET /api/places` | öffentlich | – | Ablehnung fremder Websites (`Sec-Fetch-Site`), DB-Rate-Limit 60/min/IP, Eingabe gekürzt |
| `POST /api/stripe/webhook` | Stripe | Signatur (`STRIPE_WEBHOOK_SECRET`) | Idempotenz-Tabelle, Betragsabgleich, nur PENDING→PAID |
| `/admin/*` (Seiten) | Admin | Sitzung (Cookie + DB) | Proxy prüft Signatur, jede Seite ruft `requireAdmin()` |
| Server Actions (`src/app/admin/actions.ts`) | Admin | Sitzung (Cookie + DB) | Jede Aktion ruft `requireAdmin()`; Next.js prüft Origin = Host (CSRF); Cookie `SameSite=Strict`; Zod-Prüfung |
| `loginAction` | öffentlich | Passwort + TOTP | DB-Rate-Limit 8/15 min/IP und 100/15 min global, einmalige TOTP-Codes, generische Fehlermeldung |
| Supabase REST/GraphQL | Internet (mit öffentlichem anon-Key) | Supabase-Rollen | RLS ohne Policies (vorher und nachher) + **neu:** keine Grants für anon/authenticated |

### Trust Boundaries

1. **Browser ↔ Next.js-Server:** Alle Eingaben sind nicht vertrauenswürdig und werden serverseitig geprüft. Frontend-Prüfungen dienen nur der Bedienbarkeit.
2. **Next.js-Server ↔ PostgreSQL:** Verbindung über TLS mit geprüftem Supabase-CA-Zertifikat. Der Server ist die einzige vorgesehene Datenbank-Clientin.
3. **Internet ↔ Supabase Data API:** Grenze zwischen öffentlichem anon-Key und Datenbank. Geschützt durch RLS und (neu) fehlende Grants. Empfehlung: API ganz abschalten.
4. **Stripe/Google/Resend/Cloudflare ↔ Server:** Ausgehende Aufrufe nur an feste URLs (kein SSRF möglich: Nutzer können keine Ziel-URL bestimmen). Eingehend nur der signierte Stripe-Webhook.
5. **Admin ↔ Adminbereich:** Hochprivilegiert (Zugriff auf alle personenbezogenen Daten).

### Threat Model (STRIDE, Kurzform)

| Bedrohung | Szenario | Gegenmaßnahme |
|---|---|---|
| Spoofing | Passwort-Brute-Force, Credential Stuffing auf `/admin/login` | scrypt-Hash, Rate-Limits (IP + global), **2FA**, generische Fehlermeldung |
| Spoofing | Gestohlenes Sitzungs-Cookie (Malware, geteilter Rechner) | HttpOnly, Secure, `__Host-`-Präfix, SameSite=Strict, **serverseitiger Widerruf**, Leerlauf-Timeout 30 min, max. 8 h |
| Tampering | Manipulierte Formularfelder (Status, Preis, Zahlungsstatus) | Zod verwirft unbekannte Felder, Datensatz wird explizit zusammengesetzt, Preis nur serverseitig |
| Tampering | Direkte Änderungen über die Supabase-API mit anon-Key | RLS ohne Policies, keine Grants (neu), Data API abschalten (manuell) |
| Repudiation | Wer hat welchen Status geändert? | `BookingStatusChange` protokolliert Benutzer, Zeit und Notiz |
| Information Disclosure | Auslesen fremder Anfragen | Keine öffentliche Leseschnittstelle; Bestätigungsseite zeigt nur die (nicht erratbare) Nummer; Fehlermeldungen generisch; Logs ohne personenbezogene Daten (neu) |
| Denial of Service / Kosten | Massenanfragen, Google-API-Kosten, Mail-Bombing | Zentrales Rate-Limit, Empfänger-Limit, Turnstile (optional), Größenlimits |
| Elevation of Privilege | Server Action ohne Login aufrufen | `requireAdmin()` in jeder Aktion, per Test nachgewiesen |

---

## B. Findings

Schweregrad nach Auswirkung × Ausnutzbarkeit für dieses konkrete System.

### SEC-01 – Admin-Logout ohne serverseitigen Widerruf, kein Leerlauf-Timeout · **High** · Lokal behoben

- **Betroffen:** `src/lib/server/session-token.ts`, `src/lib/server/auth.ts`, `src/app/admin/actions.ts`
- **Ursache:** Die Sitzung war ein rein zustandsloses, signiertes Token (8 h gültig). Beim Logout wurde nur das Cookie im Browser gelöscht, das Token selbst blieb bis zum Ablauf gültig. Es gab keinen Leerlauf-Timeout, und eine Passwortänderung beendete bestehende Sitzungen nicht.
- **Auswirkung:** Wer ein Admin-Cookie erbeutet (Malware, geteilter Rechner, Browser-Sync), hat bis zu 8 Stunden vollen Zugriff auf alle Kundendaten, auch nach dem Abmelden des Admins.
- **Lösung:**
  - Neue Tabelle `AdminSession`. Gespeichert wird nur der SHA-256-Hash einer zufälligen 256-Bit-Sitzungs-ID.
  - `requireAdmin()` prüft jetzt Signatur **und** Datenbankeintrag (nicht widerrufen, nicht abgelaufen, Benutzername passt).
  - Logout widerruft die Sitzung in der Datenbank.
  - Leerlauf-Timeout 30 Minuten, absolute Höchstdauer weiterhin 8 Stunden.
  - Im Token steckt ein Fingerabdruck von Passwort-Hash, 2FA-Schlüssel und Benutzername. Ändert sich einer davon, werden **alle Sitzungen ungültig**.
  - Cookie in Produktion mit `__Host-`-Präfix (nur HTTPS, kein Domain-Attribut).
  - Fail closed: Ohne Datenbankverbindung gibt es keine gültige Admin-Sitzung.
- **Test:** ✅ `tests/e2e/security.spec.ts`: Logout-Widerruf, Replay nach Logout, signiertes aber nicht ausgestelltes Token, abgelaufenes Token, manipulierter Benutzername, Leerlauf-Timeout, Cookie-Attribute. ✅ `tests/unit/logic.spec.ts`: Signatur, Manipulation, Ablauf, Schlüsselwechsel, Passwortwechsel.

### SEC-02 – Keine Zwei-Faktor-Anmeldung für den Adminbereich · **High** · Lokal behoben, Deployment ausstehend

- **Betroffen:** Admin-Login (`src/app/admin/actions.ts`, `src/app/admin/login/*`)
- **Ursache:** Die Anmeldung verlangte nur Benutzername und Passwort.
- **Auswirkung:** Ein einziges kompromittiertes Passwort (Phishing, Wiederverwendung) gibt Zugriff auf alle Kundendaten.
- **Lösung:**
  - TOTP nach RFC 6238 (`src/lib/server/totp.ts`, ohne neue Abhängigkeit, kompatibel mit Google/Microsoft Authenticator, 1Password, Bitwarden).
  - Jeder Code ist nur einmal gültig (Tabelle `AdminTotpUse`, Schutz vor Replay).
  - Toleranz ±30 s.
  - Neues Skript `npm run admin:totp` zum Erzeugen des Schlüssels.
  - **Fail closed:** In Produktion (`NODE_ENV=production`) ist die Anmeldung ohne `ADMIN_TOTP_SECRET` gesperrt. Ein Notfall-Schalter `ADMIN_MFA_OPTIONAL=true` existiert, wird aber nicht empfohlen.
- **Test:** ✅ Unit: RFC-6238-Testvektoren, Zeitfenster, Formatprüfung, Schlüsselgenerator. ✅ E2E: falscher Code, wiederverwendeter Code, erfolgreicher Login mit Code.

### SEC-03 – Rate-Limit nur pro Serverinstanz (In-Memory) · **Medium** · Lokal behoben

- **Betroffen:** `src/lib/server/rate-limit.ts`, alle öffentlichen Endpunkte, Login
- **Ursache:** Die Zähler lagen im Arbeitsspeicher der jeweiligen Funktionsinstanz. Auf Vercel laufen parallel mehrere Instanzen, und nach jedem Kaltstart beginnen die Zähler bei null.
- **Auswirkung:** Limits für Formulare, Google-API-Aufrufe und Login-Versuche waren durch Parallelität oder Wartezeiten umgehbar (Spam, Kosten, Brute-Force).
- **Lösung:**
  - Zentrales Rate-Limit in PostgreSQL (Tabelle `RateLimitBucket`) mit einem einzigen atomaren `INSERT … ON CONFLICT`, daher ohne Race Conditions.
  - Schlüssel werden per HMAC pseudonymisiert, es gibt also keine Klartext-IPs oder E-Mail-Adressen in der Datenbank.
  - Alte Einträge werden automatisch aufgeräumt.
  - Bei Datenbankfehlern greift das In-Memory-Limit als Rückfallebene (nie ganz ungeschützt).
  - Login: 8 Versuche pro IP und 15 Minuten, zusätzlich 100 global für das Konto (gegen verteilte Angriffe). Der globale Wert ist bewusst nicht niedriger, damit Angreifer den Admin nicht absichtlich aussperren können.
- **Test:** ✅ Rate-Limit Buchung (`api.spec.ts`), Kontakt und Login-Brute-Force (`security.spec.ts`), keine Klartext-Schlüssel in der Tabelle.

### SEC-04 – Missbrauch der Bestätigungs-E-Mails (Mail-Bombing, Spam-Relay) · **Medium** · Lokal behoben

- **Betroffen:** `src/app/api/booking/route.ts`, `src/lib/mail/templates.ts`
- **Ursache:** Jede Buchungsanfrage löste eine Bestätigung an die **frei eingegebene** E-Mail-Adresse aus. Die Mail enthielt alle Freitextfelder, darunter „Hinweise zur Fahrt“ mit bis zu 1000 Zeichen.
- **Auswirkung:** Angreifer konnten beliebige Texte (Links, Phishing) über die DEENO-Absenderdomain an fremde Adressen schicken. Das schadet der Absender-Reputation (Spam-Listen) und belästigt Dritte.
- **Lösung:**
  - Höchstens 3 Bestätigungen pro Empfängeradresse in 24 Stunden. Die Anfrage selbst wird trotzdem gespeichert, und der Betreiber wird benachrichtigt.
  - Die Kundenmail enthält „Hinweise zur Fahrt“ nur noch als „übermittelt“. Der Betreiber erhält den Text weiterhin vollständig.
  - Zusätzlich wirken der Duplikatschutz (SEC-08) und optional Turnstile (SEC-06).
  - Nebenbei behoben: doppeltes HTML-Escaping im Mail-Titel. Namen mit „&“ wurden als „&amp;amp;“ angezeigt.
- **Test:** ✅ Unit: Kundenmail ohne Freitext, Betreibermail mit Freitext, HTML wird escaped.

### SEC-05 – Supabase: Standardrechte für API-Rollen, Data API öffentlich · **Medium** · Teilweise lokal behoben, manuelle Schritte erforderlich

- **Betroffen:** Supabase-Projekt, `prisma/migrations/*`
- **Ursache:** Supabase vergibt standardmäßig `ALL`-Rechte (auch `TRUNCATE`, das **nicht** unter RLS fällt) auf neue Tabellen im Schema `public` an die Rollen `anon` und `authenticated`. Die Data API (REST/GraphQL) ist mit dem öffentlichen anon-Key erreichbar. Bisher schützte allein „RLS aktiv, keine Policies“. Das wirkt korrekt, ist aber nur eine einzige Schutzschicht. Ein später versehentlich angelegtes Policy oder eine Tabelle ohne RLS würde Kundendaten sofort öffentlich machen.
- **Auswirkung (aktuell):** Über die REST-API waren keine Daten lesbar oder änderbar (RLS ohne Policies), und `TRUNCATE` ist über PostgREST nicht erreichbar. Daher kein akuter Datenabfluss, aber ein hohes Folgerisiko bei künftigen Änderungen.
- **Lösung (lokal):** Neue Migration `20261106000000_security_hardening`:
  - aktiviert RLS für alle neuen Tabellen,
  - entzieht `anon` und `authenticated` **alle** Rechte auf Tabellen, Sequenzen und Funktionen in `public`,
  - setzt die Default Privileges so, dass auch künftige Tabellen keine Rechte erhalten,
  - der Block läuft nur, wenn die Rollen existieren (also nur bei Supabase).
- **Manuell (Abschnitt E):** Data API deaktivieren, Grants und RLS in Produktion prüfen, Supabase-Registrierung abschalten, mittelfristig eine eigene Datenbankrolle mit minimalen Rechten statt `postgres` einrichten.
- **Test:** ✅ Lokal: RLS ist für **alle** Tabellen aktiv (`security.spec.ts`), die Migration läuft fehlerfrei. ⚠️ Der REVOKE-Block konnte lokal nicht ausgeführt werden (PGlite kennt die Supabase-Rollen nicht). Das muss in Produktion per SQL geprüft werden (E-6).

### SEC-06 – Bot-Schutz nur durch Honeypot und vom Client gelieferten Zeitstempel · **Medium** · Lokal umgesetzt, Aktivierung ausstehend

- **Betroffen:** Buchungs- und Kontaktformular
- **Ursache:** `startedAt` kommt vom Client und lässt sich beliebig setzen. Der Honeypot hält nur einfache Bots ab.
- **Auswirkung:** Automatisierte Massenanfragen bis an die Rate-Limit-Grenze, verteilt über viele IPs auch darüber hinaus.
- **Lösung:**
  - Cloudflare Turnstile integriert (`src/lib/server/turnstile.ts`, `src/components/ui/turnstile.tsx`).
  - Aktiv nur, wenn **beide** Schlüssel gesetzt sind. Dann gilt fail closed, und das Token wird serverseitig bei Cloudflare geprüft (inkl. `action`).
  - Die CSP erlaubt `challenges.cloudflare.com` nur bei aktivem Schlüssel.
  - Das Formular wartet beim Absenden bis zu 15 s auf das Token.
- **Test:** ✅ Mit den offiziellen Cloudflare-Testschlüsseln geprüft: Anfrage ohne Token wird abgelehnt, mit gültigem Token angenommen. Buchungs- und Kontaktformular samt Dialog laufen auf Desktop und Mobil durch (12 E2E-Tests). Ohne Schlüssel verhält sich alles wie bisher (komplette Suite grün).
- **Hinweis:** Turnstile überträgt Daten (u. a. die IP) an Cloudflare. Vor der Aktivierung muss die **Datenschutzerklärung** ergänzt werden.

### SEC-07 – Personenbezogene Daten in Server-Logs · **Medium** · Lokal behoben

- **Betroffen:** `src/app/api/booking/route.ts`, `src/app/api/contact/route.ts`, `src/app/api/stripe/webhook/route.ts`, `src/lib/server/fleet-settings.ts`
- **Ursache:** Fehler wurden mit `e.message` geloggt. Prisma-Fehlermeldungen enthalten die übergebenen Werte (Name, E-Mail, Telefon, Adresse).
- **Auswirkung:** Kundendaten landen in den Vercel-Logs (DSGVO: Zweckbindung, Datenminimierung; Logs haben andere Zugriffs- und Aufbewahrungsregeln).
- **Lösung:** Neuer Helfer `logError()` (`src/lib/server/log.ts`) protokolliert nur Fehlertyp und Fehlercode.
- **Test:** ✅ Code-Review (alle `console.error`-Stellen geprüft). ✅ E2E: API-Fehlerantworten enthalten keine internen Details.

### SEC-08 – Doppelte Übermittlung / Replay von Anfragen · **Low** · Lokal behoben

- **Betroffen:** `POST /api/booking`
- **Ursache:** Identische Anfragen (Doppelklick, Zurück-Taste, wiederholter Request) wurden mehrfach gespeichert und verschickt.
- **Lösung:** Gleiche E-Mail, Abholdatum, Uhrzeit, Abholadresse und Fahrzeugklasse innerhalb von 15 Minuten führen zu `409` mit verständlicher Meldung. Die Anfragenummer wird dabei **nicht** preisgegeben.
- **Test:** ✅ `security.spec.ts` („Doppelte Übermittlung (Replay) wird erkannt“).

### SEC-09 – Adress-API als offener Proxy für fremde Websites · **Low** · Lokal behoben (teilweise)

- **Betroffen:** `GET /api/places`
- **Ursache:** Der kostenpflichtige Google-Places-Proxy war von jeder Website per Browser nutzbar.
- **Lösung:** Browser-Anfragen mit `Sec-Fetch-Site: cross-site` bzw. `same-site` werden mit 403 abgelehnt. Dazu kommt das zentrale Rate-Limit (SEC-03).
- **Rest-Risiko:** Nicht-Browser-Clients können den Header weglassen, sind aber durch das Rate-Limit begrenzt. Empfehlung: in der Google Cloud ein Tages-Kontingent (Quota) und einen Budget-Alarm setzen.
- **Test:** ✅ `security.spec.ts`.

### SEC-10 – Passwort-Hash-Parameter unter OWASP-Empfehlung · **Low** · Lokal behoben

- **Betroffen:** `scripts/hash-password.mjs`, `src/lib/server/password.ts`
- **Ursache:** scrypt mit N=2^14. OWASP empfiehlt N=2^17.
- **Lösung:** Neue Hashes mit N=2^17, r=8, p=1. Bestehende Hashes bleiben gültig. Die Prüfung erzwingt plausible Parameter (keine schwachen Werte unter 2^14, kein Speicher-DoS durch extreme Werte).
- **Manuell:** Admin-Passwort neu hashen (E-2). Das erhöht den Schutz des Hashes und beendet gleichzeitig alle alten Sitzungen.
- **Test:** ✅ Unit (neue Parameter, Ablehnung manipulierter Parameter).

### SEC-11 – Cookie ohne `__Host-`-Präfix · **Low** · Lokal behoben (Teil von SEC-01)

Das Cookie heißt in Produktion jetzt `__Host-deeno_admin`. Der Browser erzwingt damit HTTPS, `Path=/` und kein Domain-Attribut, sodass Subdomains das Cookie nicht setzen oder überschreiben können. ✅ E2E geprüft.

### SEC-12 – JSON-Endpunkte akzeptierten beliebigen Content-Type · **Low** · Lokal behoben

`readJson()` verlangt jetzt `application/json`. HTML-Formulare fremder Seiten können diesen Typ nicht ohne CORS-Preflight senden (zusätzliche CSRF-Schutzschicht neben der Origin-Prüfung). ✅ E2E.

### SEC-13 – CSP erlaubt `'unsafe-inline'` für Skripte · **Low** · Nicht behoben (bewusst akzeptiert)

- **Ursache:** Next.js benötigt Inline-Skripte für die Hydration. Eine Nonce-basierte CSP würde **jede Seite dynamisch** machen (kein statisches Rendering bzw. Caching mehr). Das kostet spürbar Leistung.
- **Bewertung:** Es gibt keine XSS-Senke im Code. React escaped alle Ausgaben, das einzige `dangerouslySetInnerHTML` (JSON-LD) escaped `<`. Es gibt keine externen Skripte, dazu kommen `object-src 'none'`, `base-uri 'self'` und `frame-ancestors 'none'`. Das Rest-Risiko ist gering.
- **Empfehlung:** Neu bewerten, falls künftig nutzergenerierte Inhalte öffentlich angezeigt werden.

### SEC-14 – Moderate Schwachstellen in Entwicklungsabhängigkeiten · **Info** · Nicht behoben

`npm audit` meldet 8 moderate Treffer, alle in `minimatch` innerhalb der ESLint-/TypeScript-ESLint-Werkzeuge (nur Entwicklung, nicht im ausgelieferten Code). `npm audit --omit=dev`: **0 Schwachstellen**. Der Fix erfordert ein Breaking Update der Lint-Werkzeuge und ist bei Gelegenheit nachzuziehen.

### SEC-15 – HSTS mit `preload` und `includeSubDomains` · **Info**

Der Header ist korrekt gesetzt. Hinweis für den Betrieb: Wird die Domain in die HSTS-Preload-Liste eingetragen, müssen **alle Subdomains dauerhaft HTTPS** können (z. B. auch Mail-Webinterfaces). Eintragung nur nach bewusster Prüfung.

### SEC-16 – Keine Lösch- und Aufbewahrungsfristen für Kundendaten · **Info** · Nicht behoben

Buchungs- und Kontaktanfragen werden unbegrenzt gespeichert, und es gibt keine Löschfunktion im Admin (DSGVO Art. 5 Abs. 1 lit. e, Art. 17). Empfehlung: Aufbewahrungsfrist festlegen (z. B. handels- und steuerrechtliche Fristen nur für tatsächlich durchgeführte Fahrten) und eine Lösch- bzw. Anonymisierungsfunktion oder einen geplanten Job ergänzen. Das ist eine fachliche Entscheidung des Betreibers.

### SEC-17 – Vertrauen in `X-Forwarded-For` · **Info**

Die Client-IP für Rate-Limits stammt aus `X-Forwarded-For`. Auf **Vercel** setzt bzw. überschreibt die Plattform diesen Header, er ist dort also vertrauenswürdig. Bei einem Wechsel des Hostings muss ein vorgelagerter Proxy den Header ebenfalls überschreiben (dokumentiert in `request-guard.ts`).

### SEC-18 – Ein gemeinsames Admin-Konto, keine Rollen · **Low** · Nicht behoben (Designentscheidung)

Es gibt genau ein Admin-Konto aus Umgebungsvariablen, also keine Benutzerverwaltung, keine Rollen und keine Eskalationsmöglichkeit über Requests (getestet: manipulierter Benutzername wird abgelehnt). Statusänderungen werden mit Benutzername protokolliert. Sollen künftig mehrere Personen arbeiten, empfehlen sich eigene Konten (z. B. Supabase Auth oder Auth.js) mit Rollen und Audit-Log.

### Positiv geprüft (keine Änderung nötig)

| Prüfpunkt | Ergebnis |
|---|---|
| SQL-Injection | Ausschließlich Prisma-Abfragen bzw. Tagged-Template-`$queryRaw` (parametrisiert), kein `*Unsafe`. ✅ E2E mit Payloads |
| XSS | React escaped, Mail-Templates escapen alle Werte, JSON-LD escaped. ✅ E2E mit Payloads im Adminbereich |
| Mass Assignment | Zod-Schemas verwerfen unbekannte Felder; der Datensatz wird explizit zusammengesetzt. ✅ Unit + E2E |
| IDOR / fremde Anfragen | Keine öffentliche Lese-, Änderungs- oder Löschschnittstelle; Anfragenummer mit ~30 Bit Zufall, Bestätigungsseite ohne Daten. ✅ E2E |
| CSRF | Origin-Prüfung (API), Next.js-Origin-Prüfung (Server Actions), SameSite=Strict. ✅ E2E |
| SSRF | Ausgehende Requests nur an feste Hosts (Google, Stripe, Resend, Cloudflare) |
| Open Redirect | Redirects nur auf feste interne Pfade; Stripe-URL wird im Client gegen `https://checkout.stripe.com/` geprüft |
| E-Mail-Header-Injection | Betreff wird bereinigt, Adressen per Zod validiert. ✅ Unit (CRLF in E-Mail abgelehnt) |
| Stripe | Signaturprüfung, Idempotenz, Betrags- und Währungsabgleich, Session-ID-Abgleich. ✅ bestehende E2E |
| Secrets im Git-Verlauf | Keine (nur Platzhalter und lokale Test-DB-URL). `.env*` in `.gitignore` und `.vercelignore` |
| Client-Bundle | Nur `NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WHATSAPP_NUMBER` und neu `NEXT_PUBLIC_TURNSTILE_SITE_KEY` (alle öffentlich); keine Client-Komponente importiert Server-Code (`server-only`) |
| Source Maps / Debug | Keine Browser-Source-Maps, `X-Powered-By` aus, keine Debug-Endpunkte |
| Security Header | CSP, HSTS, X-Frame-Options DENY, frame-ancestors 'none', nosniff, Referrer-Policy, Permissions-Policy, COOP; **neu:** CORP `same-site`, `X-Permitted-Cross-Domain-Policies: none` |
| Datei-Uploads | Nicht vorhanden |
| DB-Verbindung | TLS mit Zertifikatsprüfung (`rejectUnauthorized: true`, Supabase-CA) |

---

## C. Supabase Security Report

> Ohne Zugriff auf das Supabase-Projekt konnte der **produktive** Zustand nicht geprüft werden. Die Angaben beruhen auf den Migrationen im Repository und auf dem lokalen Test. Die SQL-Abfragen in E-6 liefern den tatsächlichen Stand.

### Tabellen und RLS-Status (laut Migrationen, nach Audit)

| Tabelle | Inhalt | RLS | Policies | Grants anon/authenticated (nach Migration) |
|---|---|---|---|---|
| `BookingRequest` | Buchungsanfragen inkl. Kundendaten | ✅ aktiv | keine (= kein API-Zugriff) | keine |
| `BookingStatusChange` | Statusverlauf | ✅ | keine | keine |
| `ContactMessage` | Kontaktanfragen | ✅ | keine | keine |
| `FleetSetting` | Fahrzeugfreigaben | ✅ | keine | keine |
| `StripeEvent` | Webhook-Idempotenz | ✅ | keine | keine |
| `_prisma_migrations` | Migrationsverlauf | ✅ | keine | keine |
| `AdminSession` *(neu)* | Hashes der Admin-Sitzungen | ✅ | keine | keine |
| `AdminTotpUse` *(neu)* | verbrauchte 2FA-Zeitschritte | ✅ | keine | keine |
| `RateLimitBucket` *(neu)* | pseudonymisierte Zähler | ✅ | keine | keine |

Views, Trigger, SQL-Funktionen, RPCs und `SECURITY DEFINER`-Funktionen: **keine vorhanden** (geprüft: alle Migrationen). `search_path`-Risiken entfallen damit.

### Berechtigungsmatrix

| Rolle / Zugriffsweg | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | Bemerkung |
|---|---|---|---|---|---|---|
| `anon` (öffentlicher Key, Data API) – **vorher** | ✗ (RLS) | ✗ (RLS) | ✗ (RLS) | ✗ (RLS) | Grant vorhanden, über API nicht erreichbar | nur RLS als Schutz |
| `anon` – **nachher** | ✗ | ✗ | ✗ | ✗ | ✗ | kein Grant + RLS |
| `authenticated` – vorher/nachher | wie `anon` | | | | | Supabase Auth wird nicht genutzt |
| `service_role` (Secret Key) | ✓ | ✓ | ✓ | ✓ | ✓ | umgeht RLS; **von der App nicht genutzt** – Key niemals weitergeben |
| `postgres` (App-Verbindung, vermutlich) | ✓ | ✓ | ✓ | ✓ | ✓ | Eigentümer der Tabellen → RLS greift nicht. Empfehlung: eigene Rolle (E-8) |
| Öffentliche Website-Besucher (über Next.js) | ✗ | nur Buchung/Kontakt über validierte API | ✗ | ✗ | ✗ | |
| Admin (über Next.js, 2FA) | ✓ | ✓ (Statusverlauf) | ✓ (Status, Notizen, Flotte, Nachrichten) | ✗ (keine Löschfunktion) | ✗ | Export: nicht vorhanden |

### Edge Functions

Keine vorhanden, daher keine Prüfung nötig. Das Repository enthält keinen `supabase/`-Ordner.

### Secrets und Schlüssel

| Secret | Verwendung | Status |
|---|---|---|
| Supabase anon / publishable Key | nicht verwendet | – |
| Supabase service_role / secret Key | nicht verwendet | darf nirgends im Projekt oder in Vercel stehen |
| `DATABASE_URL` / `DIRECT_URL` | nur Server/Build | nicht im Git-Verlauf ✅ |
| `ADMIN_SESSION_SECRET`, `ADMIN_PASSWORD_HASH`, **`ADMIN_TOTP_SECRET` (neu)** | nur Server | in Vercel pflegen |
| `STRIPE_*`, `RESEND_API_KEY`, `GOOGLE_MAPS_API_KEY`, **`TURNSTILE_SECRET_KEY` (neu)** | nur Server | in Vercel pflegen |
| JWT-Konfiguration | nicht relevant (kein Supabase Auth) | – |

**Rotation:** Es gibt keine Hinweise auf kompromittierte Schlüssel (Git-Verlauf sauber, lokale `.env`-Dateien enthalten nur Test- bzw. leere Werte). Eine Pflicht-Rotation ist daher nicht nötig. Empfohlen: Admin-Passwort neu hashen (SEC-10). Hat der Supabase-**service_role**-Key oder das Datenbankpasswort je außerhalb von Vercel/Supabase gelegen (Chat, E-Mail, Dokument), sollten beide rotiert werden (E-9).

### Offene Supabase-Risiken

1. Die Data API ist (vermutlich) aktiv. Deaktivieren, da sie nicht genutzt wird (E-7).
2. Die App-Verbindung läuft als Tabelleneigentümer bzw. `postgres` und umgeht RLS. Ein Fehler in der App hätte damit vollen Datenbankzugriff. Eigene Rolle empfohlen (E-8).
3. Die Supabase-Registrierung („Allow new users to sign up“) ist vermutlich aktiv. Abschalten (E-7).
4. Der Produktionszustand von Grants und RLS ist nicht verifiziert (E-6).

---

## D. Test Report

### Ausgeführt (lokal, 06.11.2026)

| Prüfung | Ergebnis |
|---|---|
| `npm run typecheck` | ✅ keine Fehler |
| `npm run lint` | ✅ keine Fehler |
| `npm run build` (Produktions-Build) | ✅ erfolgreich |
| `npm audit --omit=dev` | ✅ 0 Schwachstellen |
| Unit-Tests (`--project=unit`) | ✅ **28/28** (davon 7 neu bzw. erweitert für Sicherheit) |
| Komplette Suite (Unit + Desktop + Mobil) gegen Produktions-Build | ✅ **96 bestanden, 0 fehlgeschlagen, 4 übersprungen** (mobil-spezifische Tests im Desktop-Projekt, vorher genauso) |
| Neue Sicherheitssuite `tests/e2e/security.spec.ts` | ✅ **19/19** |
| Formulare mit aktivem Turnstile (Cloudflare-Testschlüssel), Desktop + Mobil | ✅ 12/12 |

### Abdeckung der geforderten Szenarien

| # | Szenario | Test | Ergebnis |
|---|---|---|---|
| 1 | Anonymer Zugriff auf Admin-Endpunkte | `api.spec.ts` „Admin-Seiten ohne Anmeldung“, `security.spec.ts` Server-Action-POST ohne Cookie | ✅ |
| 2 | Ungültige/abgelaufene Sessions | `security.spec.ts` (abgelaufen, gefälscht, leer, signiert aber nicht ausgestellt), Unit | ✅ |
| 3 | Manipulierte Benutzerrollen | `security.spec.ts` (anderer Benutzername mit gültiger Signatur), Unit (manipulierte Nutzlast) | ✅ |
| 4 | Zugriff auf fremde Anfragen | `security.spec.ts` (keine GET/PUT/PATCH/DELETE-API, Bestätigungsseite ohne Daten) | ✅ |
| 5 | SQL-Injection | `security.spec.ts` (Payloads in Formular + Admin-Suche), Unit | ✅ |
| 6 | XSS-Payloads | `security.spec.ts` (Darstellung im Admin, kein Script/kein `img`), Unit (Mail) | ✅ |
| 7 | Manipulierte Formularparameter | `api.spec.ts` (Fahrzeugklasse), `security.spec.ts` (Mass Assignment), Unit | ✅ |
| 8 | Ungültige und übergroße Eingaben | `api.spec.ts` (422, >20 KB), `security.spec.ts` (Content-Type, kaputtes JSON), Unit (Längen) | ✅ |
| 9 | Wiederholte Formularübermittlung | `security.spec.ts` (409 bei Duplikat) | ✅ |
| 10 | Rate-Limit-Überschreitung | `api.spec.ts` (Buchung), `security.spec.ts` (Kontakt, Login) | ✅ |
| 11 | Direkte Supabase-API-Aufrufe ohne Berechtigung | – | ⚠️ **Nicht ausführbar** (kein Supabase-Zugriff); manuelle Prüfung E-6/E-7. Lokal geprüft: RLS auf allen Tabellen aktiv |
| 12 | Unberechtigte INSERT/UPDATE/DELETE | `security.spec.ts` (Status-Update per Server Action ohne bzw. mit widerrufener Sitzung → DB unverändert); DB-Ebene: siehe 11 | ✅ App / ⚠️ DB-API manuell |
| 13 | Missbrauch von Edge Functions | – | n. a. (keine Edge Functions vorhanden) |
| 14 | Session-Invalidierung nach Logout | `security.spec.ts` (Cookie-Replay nach Logout auf 3 Seiten + Server Action) | ✅ |
| 15 | Fehlerhafte/fehlende Authentifizierung | `booking.spec.ts` (falsches Passwort), `security.spec.ts` (falscher/wiederverwendeter 2FA-Code, Brute-Force-Sperre) | ✅ |
| – | Stripe-Webhook ohne/mit falscher Signatur | `stripe-webhook.spec.ts` (bestehend) | ✅ |

### Nicht ausführbare Tests / Einschränkungen

- **Produktion nicht getestet.** Es fanden keine Tests gegen Vercel oder Supabase statt (kein Zugriff, außerdem gewollt: keine Angriffe auf Produktivsysteme).
- **Supabase-spezifische Rollen** (`anon`, `authenticated`) existieren in der lokalen PGlite-Datenbank nicht. Der REVOKE-Block der Migration wird lokal übersprungen und muss in Produktion per SQL geprüft werden (E-6).
- **E-Mail-Versand** wurde nicht real getestet (lokal ist kein Resend-Schlüssel gesetzt). Geprüft wurde, dass die App ehrlich „nicht versendet“ meldet und die Templates korrekt erzeugt werden.
- **Turnstile** wurde nur mit den offiziellen Testschlüsseln von Cloudflare geprüft.
- Es gab keine Lasttests (bewusst).
- Testdaten: nur fiktive Adressen und `@example.com`-Mails in der lokalen Datenbank.

### Tests selbst ausführen

```bash
# Im Projektverzeichnis, Terminal 1: lokale Testdatenbank
npm run db:local
# Terminal 2: Migrationen + Build + Tests (nutzt .env.local)
npx prisma migrate deploy
npm run build
npm test
```

Für die Tests muss `.env.local` den lokalen 2FA-Testschlüssel `ADMIN_TOTP_SECRET` enthalten. Er wurde in diesem Audit lokal ergänzt und darf **nicht** in Produktion verwendet werden.

---

## E. Deployment Guide

> **Wer:** der Betreiber bzw. Entwickler mit Zugriff auf GitHub (`maali089/cheufeure-deno`), Vercel (Projekt `cheufeure-deno`) und das Supabase-Projekt.
> **Wo:** Alle Befehle im Projektverzeichnis (Ordner mit `package.json`). Beispiele für PowerShell (Windows) und bash.
> **Wichtig:** `scripts/vercel-build.mjs` führt bei **jedem Vercel-Deployment** automatisch `prisma migrate deploy` aus. **Ein Push nach `main` deployt also Code UND Datenbankmigration.** Deshalb erst E-1 bis E-4 erledigen, dann pushen.

### E-1 · Änderungen prüfen und committen (lokal)

- **Warum:** Die Änderungen sind noch nicht committet.
- **Befehl:**
  ```bash
  git checkout -b security-hardening
  git add -A
  git status            # .env/.env.local dürfen NICHT auftauchen (sind ignoriert)
  git commit -m "Security-Härtung: Admin-Sitzungen, 2FA, zentrales Rate-Limit, Supabase-Grants, Bot-Schutz"
  git push -u origin security-hardening
  ```
- **Erfolg:** Branch auf GitHub. Vercel erstellt ggf. ein **Preview**-Deployment. Achtung: Auch das führt die Migration aus, falls Preview-Deployments dieselbe `DATABASE_URL` nutzen. Die Migration ist rückwärtskompatibel (siehe Risiken), das ist also unkritisch.
- **Rollback:** Branch löschen.

### E-2 · Neue Admin-Zugangsdaten erzeugen (lokal)

- **Warum:** 2FA ist in Produktion Pflicht (SEC-02). Ein neuer Passwort-Hash nutzt die stärkeren Parameter (SEC-10) und beendet alle alten Sitzungen.
- **Voraussetzung:** Node.js ≥ 20.9, Authenticator-App auf dem Smartphone.
- **Befehle:**
  ```bash
  npm run admin:hash -- "NEUES-langes-Passwort-mind-12-Zeichen"
  npm run admin:totp
  ```
- Den TOTP-Schlüssel in der Authenticator-App eintragen: „Schlüssel manuell eingeben“, zeitbasiert, 6 Ziffern. Die `otpauth://`-Adresse **nicht** in Online-QR-Generatoren einfügen.
- **Sicher aufbewahren:** den TOTP-Schlüssel zusätzlich im Passwortmanager (als Notfall-Wiederherstellung bei Handyverlust).
- **Erfolg:** Die App zeigt einen 6-stelligen Code an, der alle 30 s wechselt.

### E-3 · Umgebungsvariablen in Vercel setzen

- **Warum:** Ohne `ADMIN_TOTP_SECRET` ist die Admin-Anmeldung nach dem Deployment **gesperrt** (fail closed).
- **Pfad:** Vercel Dashboard → Projekt **cheufeure-deno** → **Settings → Environment Variables**

| Variable | Wert | Umgebungen | Pflicht |
|---|---|---|---|
| `ADMIN_TOTP_SECRET` | Ausgabe von `npm run admin:totp` (nur der Base32-Wert) | Production (+ Preview, falls Admin dort genutzt wird) | **Ja** |
| `ADMIN_PASSWORD_HASH` | Ausgabe von `npm run admin:hash` | Production (+ Preview) | empfohlen |
| `RATE_LIMIT_SECRET` | zufälliger Wert, z. B. `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"` | Production + Preview | optional (sonst wird `ADMIN_SESSION_SECRET` genutzt) |
| `NEXT_PUBLIC_TURNSTILE_SITE_KEY` / `TURNSTILE_SECRET_KEY` | siehe E-5 | Production + Preview | optional, empfohlen |

- **Nicht setzen:** `ADMIN_MFA_OPTIONAL` (nur als Notfall-Schalter).
- **Erfolg:** Die Variablen erscheinen in der Liste. Sie wirken erst ab dem **nächsten** Deployment.
- **Rollback:** Variable löschen bzw. alten Wert wiederherstellen und neu deployen.

### E-4 · Datenbank-Backup vor der Migration

- **Warum:** Die Migration legt nur neue Tabellen an und entzieht API-Rechte. Bestehende Daten werden nicht verändert. Ein Backup ist trotzdem gute Praxis.
- **Pfad (Dashboard):** Supabase → Projekt → **Database → Backups**. Prüfen, ob ein aktuelles Backup existiert (Pro-Plan: täglich automatisch).
- **Alternativ per Kommandozeile** (benötigt PostgreSQL-Client-Tools, `DIRECT_URL` = Session-Pooler, Port 5432):
  ```powershell
  # PowerShell
  $env:DIRECT_URL="postgresql://…"   # aus Supabase → Connect → Session pooler
  pg_dump $env:DIRECT_URL -Fc -f deeno-backup-2026-11.dump
  ```
- **Erfolg:** Die Datei existiert und ist größer als 0 Byte. Sie enthält Kundendaten, also sicher ablegen und nicht in OneDrive/Git.

### E-5 · (Empfohlen) Cloudflare Turnstile einrichten

- **Warum:** Wirksamer Bot-Schutz für Buchungs- und Kontaktformular (SEC-06).
- **Voraussetzung:** Cloudflare-Konto (kostenlos). Die Domain muss **nicht** bei Cloudflare liegen.
- **Pfad:** Cloudflare Dashboard → **Turnstile → Add widget** → Hostnames: die Produktionsdomain (z. B. `www.…de`, `…de`) und ggf. `cheufeure-deno.vercel.app` → Widget Mode **Managed** → Site Key und Secret Key kopieren → in Vercel eintragen (E-3).
- **Vorher erledigen:** **Datenschutzerklärung ergänzen** (Cloudflare Turnstile, Zweck Missbrauchsschutz, Rechtsgrundlage berechtigtes Interesse, Datenübermittlung an Cloudflare Inc.). Datei: `src/app/(site)/datenschutz/page.tsx`.
- **Wichtig:** Der Site Key wird beim **Build** eingebunden. Nach dem Setzen bzw. Ändern neu deployen.
- **Erfolg:** Über dem Absenden-Button erscheint das Turnstile-Feld. Testanfrage geht durch. `curl -I https://DOMAIN/` zeigt `challenges.cloudflare.com` in der CSP.
- **Rollback:** Beide Variablen löschen und neu deployen. Das Formular funktioniert dann wie vorher.

### E-6 · Deployen und Migration prüfen

- **Warum:** Code und die Migrationen `20261106000000_security_hardening` und `20261107000000_price_agreement` (Preisabsprache, siehe `TESTBERICHT.md`; rein additiv: neuer Status „Storniert“, neue leere Spalten) produktiv bringen.
- **Befehl:** Pull Request `security-hardening` → `main` mergen (oder `git push origin main`). Vercel baut und führt `prisma migrate deploy` aus.
- **Alternativ Migration manuell vorab** (falls die Migration im Build fehlschlägt):
  ```powershell
  $env:DIRECT_URL="postgresql://…"   # Session-Pooler, Port 5432
  npx prisma migrate deploy
  npx prisma migrate status          # erwartet: "Database schema is up to date!"
  ```
- **Erfolg prüfen** im Supabase **SQL Editor**:
  ```sql
  -- 1) RLS auf allen Tabellen aktiv? (erwartet: keine Zeile)
  SELECT c.relname FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
  WHERE n.nspname = 'public' AND c.relkind = 'r' AND NOT c.relrowsecurity;

  -- 2) Keine Rechte mehr für die öffentlichen API-Rollen? (erwartet: keine Zeile)
  SELECT grantee, table_name, privilege_type FROM information_schema.role_table_grants
  WHERE table_schema = 'public' AND grantee IN ('anon', 'authenticated');

  -- 3) Keine Policies, die Zugriff öffnen? (erwartet: keine Zeile)
  SELECT tablename, policyname, roles, cmd FROM pg_policies WHERE schemaname = 'public';

  -- 4) Neue Tabellen vorhanden?
  SELECT tablename FROM pg_tables WHERE schemaname = 'public'
  AND tablename IN ('AdminSession', 'AdminTotpUse', 'RateLimitBucket');
  ```
- **Funktionsprüfung danach:**
  1. `https://DOMAIN/` lädt.
  2. Testanfrage über das Buchungsformular, dann Bestätigungsseite mit Anfragenummer und Mail an Betreiber und Kunde.
  3. `/admin/login`: Benutzername, Passwort und 2FA-Code eingeben. Die Anfrage ist sichtbar, der Status lässt sich ändern.
  4. Abmelden, dann `/admin` aufrufen: Umleitung zum Login.
  5. Header prüfen: `curl -sI https://DOMAIN/ | findstr /i "content-security strict-transport x-frame"` (PowerShell/cmd) bzw. `grep -i` (bash).
- **Risiken:** Ohne `ADMIN_TOTP_SECRET` ist der Admin gesperrt (Website läuft normal weiter), Lösung: E-3 nachholen und neu deployen. Alle bestehenden Admin-Sitzungen enden (gewollt).
- **Rollback:**
  - Code: in Vercel unter **Deployments** das vorherige Deployment → **Promote to Production** bzw. „Instant Rollback“.
  - Die Migration muss für einen Code-Rollback **nicht** zurückgenommen werden: Der alte Code ignoriert die neuen Tabellen, und die entzogenen API-Rechte nutzt er nicht.
  - Nur falls nötig, Rechte wiederherstellen (nicht empfohlen): `GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;`

### E-7 · Supabase-Dashboard härten (manuell)

| Schritt | Pfad | Warum | Erfolgskontrolle |
|---|---|---|---|
| Data API deaktivieren | **Project Settings → Data API** → „Enable Data API“ ausschalten (alternativ: `public` aus „Exposed schemas“ entfernen) | Die App nutzt die API nicht; entfernt die öffentliche Angriffsfläche komplett | `curl "https://<PROJECT-REF>.supabase.co/rest/v1/BookingRequest?select=id" -H "apikey: <ANON_KEY>"` liefert einen Fehler (404/406), keine Daten |
| Registrierung abschalten | **Authentication → Sign In / Providers** → „Allow new users to sign up“ aus | Supabase Auth wird nicht genutzt; verhindert, dass sich jemand als `authenticated` registriert | Schalter steht auf aus |
| SSL erzwingen | **Database → Settings → SSL Configuration** → „Enforce SSL on incoming connections“ an | Unverschlüsselte DB-Verbindungen verhindern (die App nutzt bereits TLS) | Schalter an; Website funktioniert weiter |
| Security Advisor | **Advisors → Security Advisor** | Supabase-eigene Prüfung | Keine „Error“-Einträge. Hinweise „RLS enabled, no policy“ sind **gewollt** |
| Storage prüfen | **Storage** | Es sollten keine (öffentlichen) Buckets existieren | Keine Buckets oder keine öffentlichen |
| Edge Functions prüfen | **Edge Functions** | Es sollten keine Functions deployt sein | Liste leer |

- **Rollback:** Schalter zurücksetzen.
- **Netzwerk-Einschränkungen** (Database → Network Restrictions) sind mit Vercel ohne feste IP-Adressen (Vercel Secure Compute) nicht sinnvoll umsetzbar.

### E-8 · (Mittelfristig empfohlen) Eigene Datenbankrolle mit minimalen Rechten

- **Warum:** Die App verbindet sich vermutlich als `postgres` (Eigentümer, umgeht RLS, darf alles inkl. DDL). Eine eigene Rolle begrenzt den Schaden bei einer künftigen Lücke in der App.
- **Status:** **Manuelle Prüfung erforderlich, nicht umgesetzt.** Dafür braucht es Zugriff auf das Projekt und einen Test in einer Staging-Umgebung. Grund: RLS ohne Policies würde eine neue Rolle ohne `BYPASSRLS` vollständig blockieren, also werden zusätzlich Policies `TO deeno_app USING (true) WITH CHECK (true)` oder `BYPASSRLS` benötigt (abhängig von den Rechten im Supabase-Plan).
- **Skizze** (nur in Staging erproben):
  ```sql
  CREATE ROLE deeno_app LOGIN PASSWORD '<starkes-passwort>';
  GRANT USAGE ON SCHEMA public TO deeno_app;
  GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO deeno_app;
  -- + Policies je Tabelle für deeno_app, Migrationen weiter mit postgres (DIRECT_URL)
  ```
  Danach `DATABASE_URL` in Vercel auf `deeno_app.<PROJECT-REF>` (Pooler-Benutzer) umstellen. `DIRECT_URL` (Migrationen) bleibt `postgres`.

### E-9 · Schlüsselrotation (nur bei Verdacht)

Kein Pflichtschritt (keine Kompromittierung gefunden). Hat das Datenbankpasswort oder der service_role-Key je außerhalb von Supabase/Vercel gelegen:
- **DB-Passwort:** Supabase → Database → Settings → **Reset database password**. Danach `DATABASE_URL` und `DIRECT_URL` in Vercel anpassen und neu deployen. Kurzer Ausfall, bis das neue Deployment live ist.
- **API-Keys:** Supabase → Project Settings → **API Keys** → neue Secret Keys erzeugen und alte widerrufen (werden von der App nicht genutzt, daher ohne Auswirkung).
- **`ADMIN_SESSION_SECRET`:** neuen Wert setzen und deployen. Alle Admin-Sitzungen enden.

### E-10 · (Empfohlen) Externe Dienste

- **Google Cloud** (falls `GOOGLE_MAPS_API_KEY` genutzt wird): API-Key auf Places API (New) und Routes API beschränken, Tages-Quota und Budget-Alarm setzen (SEC-09). Eine IP-Beschränkung ist bei Vercel nicht möglich.
- **Resend:** Die Absenderdomain mit SPF, DKIM und DMARC (`p=quarantine` oder strenger) verifizieren. Schützt vor Spoofing und verbessert die Zustellbarkeit.
- **Stripe** (bei späterer Aktivierung): Webhook-Endpunkt nur mit den in `.env.example` genannten Ereignissen. Live-Keys nur in Production.

---

## F. Final Security Status

| Maßnahme | Lokal behoben & getestet | Deployment ausstehend | Produktiv verifiziert | Manuelle Prüfung erforderlich | Nicht behoben |
|---|---|---|---|---|---|
| SEC-01 Serverseitige Admin-Sitzungen, Logout-Widerruf, Idle-Timeout | ✅ | ✅ (E-6) | – | | |
| SEC-02 2FA (TOTP) Pflicht | ✅ | ✅ (E-2, E-3, E-6) | – | | |
| SEC-03 Zentrales Rate-Limit | ✅ | ✅ (E-6) | – | | |
| SEC-04 Schutz vor Mail-Missbrauch | ✅ | ✅ (E-6) | – | | |
| SEC-05 Supabase-Grants entziehen (Migration) | ✅ (lokal teilweise, siehe D) | ✅ (E-6) | – | ✅ (E-6 SQL, E-7) | |
| SEC-05 Data API aus, Sign-up aus | | | – | ✅ (E-7) | |
| SEC-05 Eigene DB-Rolle | | | – | ✅ (E-8) | |
| SEC-06 Turnstile | ✅ (mit Testschlüsseln) | ✅ (E-5, optional) | – | ✅ Datenschutzerklärung | |
| SEC-07 Logs ohne personenbezogene Daten | ✅ | ✅ (E-6) | – | | |
| SEC-08 Duplikatschutz | ✅ | ✅ (E-6) | – | | |
| SEC-09 Adress-API nur same-origin | ✅ | ✅ (E-6) | – | ✅ Google-Quota (E-10) | |
| SEC-10 Stärkere Passwort-Hashes | ✅ | ✅ (E-2) | – | | |
| SEC-11/12 Cookie-Präfix, Content-Type-Prüfung | ✅ | ✅ (E-6) | – | | |
| SEC-13 CSP `'unsafe-inline'` | | | | | ⚪ bewusst akzeptiert |
| SEC-14 Dev-Abhängigkeiten | | | | | ⚪ niedrig, nur Entwicklung |
| SEC-16 Löschfristen (DSGVO) | | | | ✅ fachliche Entscheidung | ⚪ |
| SEC-18 Mehrbenutzer/Rollen | | | | | ⚪ Designentscheidung |

**Produktiv verifiziert:** nichts. Es bestand kein Zugriff auf Vercel oder Supabase.

### Freigabeempfehlung

**Noch keine Freigabe für den Produktivbetrieb mit diesen Änderungen.** Sie wird empfohlen, sobald
1. E-3 (2FA-Schlüssel in Vercel) und E-6 (Deployment + SQL-Prüfungen 1–4 ohne Auffälligkeiten) erledigt sind,
2. die Funktionsprüfung aus E-6 erfolgreich war (Buchung, Mails, Admin-Login mit 2FA, Logout) und
3. E-7 (mindestens Data API und Sign-up abgeschaltet) umgesetzt ist.

Die lokal geprüften Sicherheitskontrollen sind für diesen Schritt ausreichend getestet. Die Supabase-seitigen Kontrollen müssen nach dem Deployment mit den SQL-Abfragen aus E-6 bestätigt werden.

---

### Anhang: Geänderte und neue Dateien

**Neu:** `prisma/migrations/20261106000000_security_hardening/migration.sql`, `src/lib/server/totp.ts`, `src/lib/server/turnstile.ts`, `src/lib/server/log.ts`, `src/components/ui/turnstile.tsx`, `scripts/totp-secret.mjs`, `tests/e2e/security.spec.ts`, `tests/global-setup.ts`, `SECURITY_AUDIT.md`

**Geändert:** `prisma/schema.prisma`, `src/lib/server/{auth,session-token,rate-limit,request-guard,password,fleet-settings}.ts`, `src/app/admin/actions.ts`, `src/app/admin/login/{page,login-form}.tsx`, `src/app/api/{booking,booking/quote,contact,places,stripe/webhook}/route.ts`, `src/lib/mail/templates.ts`, `src/lib/validation.ts`, `src/components/{booking/booking-form,contact/contact-form}.tsx`, `next.config.ts`, `scripts/hash-password.mjs`, `package.json` (Skript `admin:totp`), `.env.example`, `docs/EINRICHTUNG.md`, `playwright.config.ts`, Tests unter `tests/`

**Neue Abhängigkeiten:** keine (`npm install` nicht erforderlich).

**Lokal (nicht im Git):** `.env.local` um einen 2FA-**Test**schlüssel `ADMIN_TOTP_SECRET` ergänzt (nur für lokale Tests).
