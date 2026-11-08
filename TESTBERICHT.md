# Testbericht – Website, Buchungssystem & WhatsApp-Ablauf

| | |
|---|---|
| Datum | 07.11.2026 |
| Getestet | Stand `main` (`21d53bc`) + Sicherheits-Härtung vom 06.11. + Änderungen dieses Tests (alles **noch nicht committet/deployt**) |
| Umgebung | **Nur lokal**: Produktions-Build (`next start`) + lokale PostgreSQL-kompatible Testdatenbank (PGlite) mit identischem Schema/Migrationen |
| Nicht getestet | Die veröffentlichte Website und die echte Supabase-Datenbank (kein Zugang: keine Supabase-/Vercel-Zugangsdaten in diesem Projekt, nur lokale Test-Datenbank) |

> **Wichtig:** Jede Aussage „ERFOLGREICH GETESTET“ bezieht sich auf die **lokale Testumgebung**. Auf der veröffentlichten Website wurde nichts getestet und nichts verändert. Echte Kunden haben keine Nachrichten erhalten (E-Mail-Versand ist lokal nicht eingerichtet, WhatsApp wird nie automatisch gesendet).

---

## 1. Kurzfassung

- **Fahrgast-Ablauf** (Anfrage → Speicherung → Auftragsnummer → Eingangsbestätigung) funktionierte bereits und wurde vollständig durchgetestet.
- **Betreiber-Ablauf** war für das vereinbarte WhatsApp-Konzept **unvollständig**: Es gab keinen Preis, kein „Fahrt bestätigen“, kein Stornieren, und WhatsApp öffnete einen leeren Chat. Das ist jetzt ergänzt und getestet.
- **7 Fehler gefunden und behoben** (siehe Abschnitt 3), u. a. eine falsche Aussage in der Datenschutzerklärung und abgeschnittene Bedienelemente auf kleinen Smartphones.
- **Automatisierte Tests:** 128 bestanden, 0 fehlgeschlagen (4 übersprungen: mobile Tests im Desktop-Durchlauf, wie vorher). Neu: 13 Ablauf-Tests, 12 Website-Prüfungen, 7 Unit-Tests.
- **Offen:** Deployment, Prüfung auf der echten Supabase-Datenbank und der Live-Website, rechtliche Prüfung von Impressum/Datenschutz (siehe Abschnitt 8).

---

## 2. Geprüfte Bereiche

| Bereich | Wie geprüft |
|---|---|
| Projektstruktur / Technik | Code-Review: Next.js 16, React 19, Prisma 7, PostgreSQL bei Supabase (nur serverseitig), Vercel |
| Alle Seiten & Unterseiten | `/`, `/impressum`, `/datenschutz`, `/bildnachweise`, `/anfrage/eingegangen`, `/admin/*`, 404 |
| Navigation, Buttons, Links | Automatisch: alle internen Links + Sprungmarken, `tel:`/`mailto:`/WhatsApp-Links, `rel="noopener"` |
| Formulare & Validierung | Buchungs- und Kontaktformular im Browser (Fehlerfälle, Doppelklick, Verbindungsabbruch, Serverfehler) und direkt an der API |
| Bildschirmgrößen | 320, 375, 390, 412 px (Smartphones), 768/1024 px (Tablet), 1440 px (Desktop); Pixel 7 und Desktop-Chrome |
| Konsole | Keine Fehler auf allen Seiten in allen 7 Bildschirmgrößen |
| Performance | Lokal gemessen (siehe 7.4) |
| Animation (S-Klasse) | Bildrate auf simuliertem Smartphone, normal und 4-fach gedrosselte CPU |
| Supabase/Datenbank | Schema, Migrationen, RLS, Speicherung aller Felder, Fehlerbehandlung bei Datenbankausfall (echter Ausfall simuliert) |
| Sicherheit/Datenschutz | Siehe `SECURITY_AUDIT.md` (Vortag) + erneute Prüfung der Datenschutztexte gegen die tatsächlichen Funktionen |
| SEO-Grundlagen | Titel, Beschreibung, eine H1 je Seite, `lang="de"`, Canonical, Open Graph, strukturierte Daten, robots.txt, Sitemap, Alt-Texte |

---

## 3. Gefundene und behobene Fehler

| # | Fehler | Auswirkung | Behebung | Status |
|---|---|---|---|---|
| F1 | **Kein Feld für den vereinbarten Preis** im Admin | Der vereinbarte WhatsApp-Ablauf war nicht abbildbar | Preisfeld (deutsches Format „149,90“, Prüfung > 0 und ≤ 100.000 €, zusätzlich Datenbank-Constraint), Speicherung in Supabase-Spalte `agreedPrice`, Eintrag im Verlauf | FEHLER BEHOBEN UND ERNEUT GETESTET |
| F2 | **Kein „Fahrt bestätigen“** – „Bestätigt“ ließ sich ohne Preis setzen | Fahrten konnten ohne Preis als bestätigt gelten | Button „Fahrt bestätigen“ (nur mit Preis), optional Bestätigungs-E-Mail mit Auftragsnummer + Preis; Statusauswahl verweigert „Bestätigt“ ohne Preis; Doppelklick-sicher | FEHLER BEHOBEN UND ERNEUT GETESTET |
| F3 | **WhatsApp-Button öffnete leeren Chat** | Der Betreiber musste alle Daten abtippen | Vorbereitete Nachricht mit Auftragsnummer und Fahrtdaten; nach Bestätigung zweiter Button mit Bestätigungstext inkl. Preis. Gesendet wird nur durch den Betreiber selbst | FEHLER BEHOBEN UND ERNEUT GETESTET |
| F4 | **Kein Stornieren** | Abgesagte Fahrten waren nicht erfassbar | Neuer Status „Storniert“ mit Grund und Sicherheitsabfrage; danach keine Preis-/Bestätigungsänderung mehr möglich | FEHLER BEHOBEN UND ERNEUT GETESTET |
| F5 | **Telefonnummern wie „+49 (0)170 …“** wurden für Anrufen/WhatsApp falsch umgewandelt (→ +490170…) | Der Anruf- bzw. WhatsApp-Link erreichte den Fahrgast nicht | Eigene Umwandlung (entfernt „(0)“, 00→+, 0→+49), unplausible Nummern werden erkannt und ein Hinweis angezeigt | FEHLER BEHOBEN UND ERNEUT GETESTET |
| F6 | **Admin am Smartphone**: Liste nur als breite, seitlich scrollende Tabelle ohne Telefonnummer | Schwer bedienbar | Kartenansicht am Smartphone (Nummer, Status, Datum, Name, **Telefon**, Strecke, Preis); Telefon und Preis auch in der Desktop-Tabelle; Detailangaben untereinander statt gequetscht | FEHLER BEHOBEN UND ERNEUT GETESTET |
| F7 | **Kleine Smartphones (320 px)**: Menü-Button ragte ~25 px aus dem Bild; Überschrift „Datenschutzerklärung“ verursachte seitliches Scrollen | Menü auf kleinen Geräten teils nicht erreichbar | Engere Logo-Unterzeile und kleinerer Abstand nur unter 360 px; weiches Trennzeichen „Datenschutz-erklärung“. Design ab 360 px unverändert | FEHLER BEHOBEN UND ERNEUT GETESTET |
| F8 | **Datenschutzerklärung falsch:** „IP-Adresse wird nicht in der Datenbank gespeichert“ – seit der Sicherheits-Härtung wird sie pseudonymisiert (Hash) bis ca. 2 Tage gespeichert | Unzutreffende Datenschutzinformation | Text korrigiert; Bereinigung alter Einträge zuverlässiger gemacht (stündlich statt zufällig) | FEHLER BEHOBEN (Text) – rechtliche Prüfung offen |
| F9 | Datenschutzerklärung erwähnte nicht, dass DEENO den Fahrgast **per WhatsApp** zur Preisabsprache kontaktiert | Unvollständige Information | Absatz ergänzt, Hinweis im Buchungsformular; als „zur rechtlichen Prüfung“ markiert | FEHLER BEHOBEN (Text) – rechtliche Prüfung offen |
| F10 | Links „Datenschutzhinweise“ (neuer Tab) ohne `rel="noopener"` | Gering (eigene Seite) | ergänzt | FEHLER BEHOBEN UND ERNEUT GETESTET |

Kleinere Anpassungen: Kunden-Eingangsmail sagt jetzt „Den Fahrpreis vereinbaren wir persönlich mit Ihnen – telefonisch oder per WhatsApp“ (statt „individuelles Angebot“).

---

## 4. Durchgeführte Testbuchungen (lokal)

Alle Testdaten waren eindeutig gekennzeichnet („E2E-Test“, Adressen `@example.com`).

| Test | Ablauf | Ergebnis |
|---|---|---|
| **Test 1 – Normale Anfrage** | Im Browser wie ein Fahrgast: Startseite → Formular → Einzelfahrt Marienplatz → Flughafen, Datum in 12 Tagen 09:45, 2 Personen, **Mercedes-Benz S-Klasse**, Name, Telefon „+49 (0)170 1234567“, absenden | Auftragsnummer `DN-…` angezeigt. **In der Datenbank alle 15 geprüften Felder exakt gespeichert** (Adressen, Datum, Uhrzeit, Personen, Fahrzeug `first`, Name, E-Mail, Telefon, Status „Eingegangen“, kein Preis, keine Zahlung). Verlauf: „Eingegangen / website“. Erfolgsseite sagt „Wir melden uns zur Bestätigung“, also **keine** falsche Buchungszusage |
| **Test 2 – Fehlerhafte Eingaben** | Fehlende Pflichtfelder, ungültige Telefonnummer, Datum in der Vergangenheit, „30. Februar“, Uhrzeit „25:99“, Text statt Datum, **Doppelklick** auf Absenden, **Verbindungsabbruch**, **Serverfehler**, **echter Datenbankausfall**, identische Anfrage zweimal | Jeweils verständliche Meldung am Feld bzw. über dem Button. Doppelklick → **genau 1** Buchung. Verbindungsabbruch → „Keine Verbindung …“, nichts gespeichert, erneutes Senden klappt. Datenbankausfall → „Ihre Anfrage konnte gerade nicht gespeichert werden … rufen Sie uns an“ (HTTP 503), Startseite bleibt erreichbar, Logs ohne Kundendaten. Gleiche Anfrage erneut → Hinweis „bereits bei uns eingegangen“. **Nie eine falsche Erfolgsmeldung** |
| **Test 3 – Mehrere Buchungen** | Zusätzlich im Browser: **BMW 7er** (Odeonsplatz, 10:10) und **Audi A8** (3 Personen, 11:20, anderes Datum) | 3 verschiedene Auftragsnummern; jede Buchung mit genau ihren eigenen Daten gespeichert (Fahrzeug `bmw7`/`audia8`, Telefon, Uhrzeit, Personen); im Dashboard neueste zuerst, Status je Buchung korrekt; Detailseite der BMW-Buchung zeigt keine Daten der Audi-Buchung |
| Gesamte Testläufe | inkl. bestehender Tests (Flughafentransfer mit Zwischenstopp, Hin- und Rückfahrt im Buchungsfenster, Stripe-Webhook, Sicherheitstests) | ~100 Testbuchungen über alle Läufe |

**Aufräumen:** Alle 100 Testbuchungen (inkl. Verlauf) und 9 Test-Kontaktnachrichten wurden aus der **lokalen** Testdatenbank gelöscht. Vorher geprüft: Die lokale Datenbank enthielt ausschließlich `@example.com`-Testdaten. Die produktive Datenbank wurde nicht berührt.

---

## 5. WhatsApp-Ablauf & Preisabsprache (lokal getestet)

So funktioniert es jetzt im Admin (Detailseite einer Anfrage, Feld „Preisabsprache & Bestätigung“):

1. **WhatsApp-Chat öffnen**: WhatsApp öffnet sich mit fertiger Nachricht (Begrüßung, Auftragsnummer, Datum, Strecke, Fahrzeug, Personen). Der Betreiber tippt selbst auf „Senden“.
2. **Vereinbarten Preis eintragen**, z. B. `149,90`, dann „Preis speichern“. Der Status wechselt automatisch auf „In Bearbeitung“.
3. **Fahrt bestätigen**: nur möglich mit gespeichertem Preis. Optional geht eine Bestätigungs-E-Mail mit Auftragsnummer und Preis an den Fahrgast.
4. **Bestätigung per WhatsApp senden**: zweite vorbereitete Nachricht („hiermit bestätigen wir Ihre Fahrt … Vereinbarter Fahrpreis: 149,90 €“). Auch diese sendet der Betreiber selbst.

| Prüfpunkt | Ergebnis |
|---|---|
| 1. Anfrage korrekt gespeichert | ERFOLGREICH GETESTET |
| 2. Telefonnummer im Dashboard sichtbar (Liste + Detail) | FEHLER BEHOBEN UND ERNEUT GETESTET |
| 3. WhatsApp-Button öffnet den richtigen Kundenchat (`wa.me/491701234567`, auch bei „+49 (0)…“) | FEHLER BEHOBEN UND ERNEUT GETESTET |
| 4. Nachricht mit Buchungsinfos und Auftragsnummer vorbereitet | FEHLER BEHOBEN UND ERNEUT GETESTET |
| 5. Preis im Dashboard eintragbar, ungültige Preise abgelehnt (`abc`, `0`, `-20`, `12,345`, `250000`) | FEHLER BEHOBEN UND ERNEUT GETESTET |
| 6. Preis korrekt in der Datenbank gespeichert (`149.90`) | FEHLER BEHOBEN UND ERNEUT GETESTET (lokal; Supabase: NICHT GETESTET) |
| 7. Fahrt nach Preisabsprache bestätigen (auch per Doppelklick nur **einmal**) | FEHLER BEHOBEN UND ERNEUT GETESTET |
| 8. Bestätigung enthält Auftragsnummer und Preis (WhatsApp-Text, E-Mail-Vorlage) | FEHLER BEHOBEN UND ERNEUT GETESTET (E-Mail nur als Vorlage geprüft, **Versand NICHT GETESTET**, da lokal kein E-Mail-Dienst eingerichtet ist) |
| 9. Status korrekt („Eingegangen“ → „In Bearbeitung“ → „Bestätigt“; Filter „Bestätigt“ zeigt die Fahrt) | FEHLER BEHOBEN UND ERNEUT GETESTET |
| WhatsApp sendet nichts automatisch | ERFOLGREICH GETESTET: Der Link öffnet nur einen neuen Tab mit `wa.me`; die Admin-Seite löst keinerlei Anfrage an WhatsApp aus. Ein automatischer Versand ist technisch nicht möglich, das Absenden geschieht in der WhatsApp-App durch den Betreiber |
| Formular-Absenden bestätigt die Fahrt nicht automatisch | ERFOLGREICH GETESTET (Status bleibt „Eingegangen“, kein Preis) |
| Fahrgast kann keinen Preis eingeben | ERFOLGREICH GETESTET (kein Preisfeld im Formular; Preisfelder in manipulierten Anfragen werden serverseitig verworfen) |

---

## 6. Funktionsübersicht

### Fahrgast / öffentliche Website

| Funktion | Status |
|---|---|
| Buchungsformular (alle 4 Schritte, alle Fahrtarten) | ERFOLGREICH GETESTET |
| Fahrzeugauswahl S-Klasse / BMW 7er / Audi A8 wird korrekt gespeichert | ERFOLGREICH GETESTET |
| Fahrzeugbilder S-Klasse / BMW 7er / Audi A8 laden | ERFOLGREICH GETESTET |
| Eindeutige Auftragsnummer (Format `DN-JJMMTT-XXXXXX`, zufällig, Datenbank-Eindeutigkeit + Wiederholung bei Kollision) | ERFOLGREICH GETESTET |
| Fehlermeldungen, keine falschen Erfolgsmeldungen | ERFOLGREICH GETESTET |
| Doppelklick / Mehrfachabsenden | ERFOLGREICH GETESTET |
| Kontaktformular | ERFOLGREICH GETESTET |
| Eingangs-E-Mail an Kunde und Betreiber | NICHT GETESTET (Versand); lokal korrekt als „nicht versendet“ gemeldet. Auf der Live-Seite mit echtem Resend-Schlüssel prüfen |
| Navigation, Links, Sprungziele | ERFOLGREICH GETESTET |
| Mobile (320–412 px), Tablet, Desktop | FEHLER BEHOBEN UND ERNEUT GETESTET (320 px) |
| Browser-Konsole fehlerfrei | ERFOLGREICH GETESTET |
| S-Klasse-Animation | ERFOLGREICH GETESTET (keine Fehler, flüssig, siehe 7.4) |
| SEO-Grundlagen | ERFOLGREICH GETESTET. Hinweis: Indexierung ist per `SITE_INDEXING` steuerbar, und `NEXT_PUBLIC_SITE_URL` muss in Vercel auf die echte Domain zeigen (Canonical, Sitemap, strukturierte Daten nutzen diesen Wert) |
| Online-Zahlung (Stripe) | Vorhanden, aber deaktiviert (`INSTANT_BOOKING_ENABLED=false`). Passt nicht zum WhatsApp-Konzept und sollte deaktiviert bleiben. Webhook-Tests bestanden |

### Betreiber / Admin-Dashboard

| Funktion | Status |
|---|---|
| Sichere Anmeldung (Passwort + 2FA, Sperre nach Fehlversuchen, Abmelden) | ERFOLGREICH GETESTET |
| Neue Buchungen anzeigen, suchen, nach Status filtern | ERFOLGREICH GETESTET |
| Buchungsdetails öffnen | ERFOLGREICH GETESTET |
| Telefonnummer anzeigen | FEHLER BEHOBEN UND ERNEUT GETESTET |
| WhatsApp-Chat öffnen | FEHLER BEHOBEN UND ERNEUT GETESTET |
| Fahrpreis eintragen | FEHLER BEHOBEN UND ERNEUT GETESTET |
| Buchungsstatus ändern | ERFOLGREICH GETESTET |
| Fahrt bestätigen | FEHLER BEHOBEN UND ERNEUT GETESTET |
| Fahrt stornieren | FEHLER BEHOBEN UND ERNEUT GETESTET |
| Bestätigte Fahrten anzeigen (Filter „Bestätigt“) | ERFOLGREICH GETESTET |
| Fehlerhafte Eingaben verhindern | FEHLER BEHOBEN UND ERNEUT GETESTET |
| Bedienung am Smartphone | FEHLER BEHOBEN UND ERNEUT GETESTET |
| Bestätigungs-E-Mail tatsächlich zugestellt | NICHT GETESTET (lokal kein E-Mail-Dienst) |

---

## 7. Supabase, Sicherheit, Datenschutz, Performance

### 7.1 Supabase

| Prüfpunkt | Ergebnis |
|---|---|
| Verbindung zur **echten** Supabase-Datenbank | **NICHT GETESTET**: Es liegen nur lokale Zugangsdaten vor. Code-Prüfung: TLS mit Zertifikatsprüfung, Pooler-URL für die App, `DIRECT_URL` für Migrationen |
| Richtige Umgebungsvariablen | ERFOLGREICH GEPRÜFT (Code): `DATABASE_URL`/`DIRECT_URL` nur serverseitig; im Browser nur öffentliche Werte (`NEXT_PUBLIC_SITE_URL`, WhatsApp-Nummer, optional Turnstile-Site-Key) |
| Supabase-Service-Role-Key | Wird **nirgends** verwendet und steht weder im Code noch im Browser-Bundle noch in der Git-Historie (geprüft). Die App nutzt keinen Supabase-Client und keine Supabase-API |
| Tabellen korrekt angelegt | ERFOLGREICH GETESTET (lokal, alle Migrationen inkl. neuer `20261107000000_price_agreement`) |
| RLS | Lokal: auf **allen** Tabellen aktiv, keine Policies (= kein Zugriff über die öffentliche Supabase-API). Zusätzlich entzieht die Migration vom 06.11. den öffentlichen Rollen alle Rechte. **Auf der echten Supabase NICHT GETESTET**, Prüf-SQL siehe `SECURITY_AUDIT.md` E-6 |
| Unbefugter Zugriff auf Buchungen | ERFOLGREICH GETESTET (lokal): keine öffentliche Lese-/Änderungsschnittstelle; Admin-Aktionen ohne gültige Anmeldung bleiben wirkungslos |
| Admin sieht/ändert nur, was er soll | ERFOLGREICH GETESTET: Es gibt nur ein Admin-Konto mit Vollzugriff (gewollt); Preis/Status/Storno nur nach Anmeldung, jede Änderung im Verlauf protokolliert |
| Fehlerbehandlung Datenbank | ERFOLGREICH GETESTET (echter Ausfall: 503 + verständliche Meldung, Website bleibt online) |
| Doppelte Buchungen | ERFOLGREICH GETESTET (Button-Sperre, serverseitige Duplikaterkennung 15 Min.) |

### 7.2 Sicherheit

Grundlage ist der Audit vom Vortag (`SECURITY_AUDIT.md`: 2FA, Sitzungs-Widerruf, zentrales Rate-Limit, Spam-Schutz, Logs ohne Kundendaten). Alle 19 Sicherheitstests liefen erneut erfolgreich. Neue Funktionen: Jede Admin-Aktion prüft die Anmeldung serverseitig, Eingaben werden mit Zod geprüft, der Preis zusätzlich per Datenbank-Constraint. Telefonnummern werden im Klartext gespeichert (in der Datenbank, die nur der Server erreicht, verschlüsselte Verbindung, RLS); eine zusätzliche Feldverschlüsselung ist nicht umgesetzt (bei einem Betrieb dieser Größe unüblich).

### 7.3 Datenschutz & Rechtliches (technische Sicht – **keine Rechtsberatung**)

| Punkt | Status |
|---|---|
| Datenschutzerklärung beschreibt Buchung, Kontakt, E-Mail, Zahlung, Google, WhatsApp-Links, Cookies/lokale Speicherung, Rechte, Aufsichtsbehörde | vorhanden |
| IP-Verarbeitung für Rate-Limit | **korrigiert** (F8) |
| Kontaktaufnahme per WhatsApp durch DEENO | **ergänzt** (F9), Rechtsgrundlage und ggf. nötige Einwilligung **NOCH OFFEN (rechtlich prüfen)** |
| Datenbank-Anbieter (Supabase, Irland), Hosting (Vercel), E-Mail (Resend) | technisch benannt; Verträge (AVV), Drittlandübermittlung: **NOCH OFFEN (rechtlich prüfen)** |
| Impressum: USt-IdNr., Genehmigung/Aufsichtsbehörde (Personenbeförderung), Handelsregister, Verbraucherschlichtung | Platzhalter „Zur rechtlichen Prüfung“ sichtbar auf der Seite: **NOCH OFFEN** |
| Speicherdauer/Löschung von Buchungen | **NOCH OFFEN** (fachliche Entscheidung, keine Löschfunktion) |
| Turnstile (falls aktiviert) | in Datenschutzerklärung zu ergänzen: **NOCH OFFEN** |

Die gelben „Zur rechtlichen Prüfung“-Hinweise auf Impressum und Datenschutz sind **für Besucher sichtbar**. Sie müssen vor dem offiziellen Start ersetzt werden.

### 7.4 Performance (lokal gemessen, Richtwerte)

| Messung | Ergebnis |
|---|---|
| Startseite, Smartphone-Größe, lokal | LCP ~0,6 s, CLS 0, ~590 KB übertragen, 23 Anfragen |
| S-Klasse-Animation (Pixel 7) | normal: kein Frame > 50 ms; CPU 4-fach gedrosselt: ~57 FPS, schlechtester Frame 33 ms |
| Gesamte Seite gescrollt, CPU 4-fach gedrosselt | einzelne lange Frames beim Laden/Bilddekodieren (nicht in der Animation) |

Lokale Werte sind besser als echte Mobilfunkwerte. Für eine echte Messung PageSpeed Insights mit der Live-URL verwenden.

---

## 8. Offene Punkte

| # | Punkt | Wer |
|---|---|---|
| O1 | **Deployment** der Änderungen inkl. 2 Datenbank-Migrationen (rein additiv). Vorher `ADMIN_TOTP_SECRET` in Vercel setzen, sonst ist der Admin gesperrt. Anleitung: `SECURITY_AUDIT.md`, Abschnitt E | Entwickler |
| O2 | Nach dem Deployment **auf der Live-Seite** testen: eine Testanfrage mit eigener Telefonnummer/E-Mail, Eingang der E-Mails, Admin-Login, Preis eintragen, bestätigen, WhatsApp-Links am Handy öffnen. Danach die Testanfrage im Admin stornieren (es gibt bewusst keine Löschfunktion) | Betreiber |
| O3 | Supabase prüfen: RLS/Grants per SQL (`SECURITY_AUDIT.md` E-6), Data API und Registrierung abschalten (E-7) | Entwickler |
| O4 | E-Mail-Versand (Resend, verifizierte Absenderdomain) einrichten bzw. prüfen; sonst kommen keine Eingangs-/Bestätigungsmails an | Entwickler |
| O5 | Impressum- und Datenschutz-Platzhalter rechtlich klären und ersetzen; WhatsApp-Kontakt rechtlich bewerten | Betreiber + Rechtsberatung |
| O6 | Löschfristen für alte Anfragen festlegen (DSGVO) | Betreiber |
| O7 | `NEXT_PUBLIC_SITE_URL` in Vercel auf die echte Domain setzen und `SITE_INDEXING=true` erst nach O5 | Entwickler |

---

## 9. Kurzanleitung für den Betreiber

1. Unter `/admin` anmelden (Benutzername, Passwort, 6-stelliger Code aus der Authenticator-App).
2. In „Buchungsanfragen“ ist jede neue Anfrage als **„Eingegangen“** markiert. Am Handy erscheint jede Anfrage als Karte.
3. Anfrage antippen → **„WhatsApp-Chat öffnen“** → in WhatsApp auf **Senden** tippen und den Preis besprechen.
4. Vereinbarten Preis eintragen → **„Preis speichern“**.
5. **„Fahrt bestätigen“** antippen.
6. **„Bestätigung per WhatsApp senden“** → in WhatsApp auf **Senden** tippen.
7. Sagt der Fahrgast ab: **„Fahrt stornieren“**. Nach der Fahrt: Status **„Abgeschlossen“**.

---

## 10. Geänderte Dateien (dieser Test)

**Neu:**
- `prisma/migrations/20261107000000_price_agreement/migration.sql`
- `src/lib/price.ts`
- `src/app/admin/(panel)/anfragen/[id]/booking-actions.tsx`
- `tests/e2e/journey.spec.ts`
- `tests/e2e/site-audit.spec.ts`
- `tests/unit/price-whatsapp.spec.ts`
- `TESTBERICHT.md`

**Geändert:**
- Datenbank: `prisma/schema.prisma`
- Admin: `src/app/admin/actions.ts`, `src/app/admin/(panel)/{page,status-badge}.tsx`, `src/app/admin/(panel)/anfragen/[id]/page.tsx`
- Logik: `src/lib/{whatsapp,validation}.ts`, `src/lib/mail/templates.ts`, `src/lib/server/rate-limit.ts`
- Komponenten: `src/components/{brand,legal}.tsx`, `src/components/layout/header.tsx`, `src/components/booking/booking-form.tsx`, `src/components/contact/contact-form.tsx`
- Rechtliches: `src/app/(site)/datenschutz/page.tsx`
- Tests und Doku: `tests/e2e/booking.spec.ts`, `SECURITY_AUDIT.md` (Hinweis auf die neue Migration)

Neue Abhängigkeiten: keine.
