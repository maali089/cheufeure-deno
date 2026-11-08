import { expect, test } from "@playwright/test";
import { bookingConfirmedCustomerMail } from "../../src/lib/mail/templates";
import { formatEuro, parseEuro } from "../../src/lib/price";
import { operatorConfirmationMessage, operatorOfferMessage, phoneToWhatsapp, whatsappChatHref } from "../../src/lib/whatsapp";

const booking = {
  reference: "DN-261107-ABCDEF",
  firstName: "Erika",
  lastName: "Muster",
  tripType: "ONE_WAY" as const,
  pickupAddress: "Marienplatz 1, München",
  dropoffAddress: "Flughafen München",
  pickupDate: "2027-03-14",
  pickupTime: "08:30",
  returnDate: null,
  returnTime: null,
  durationHours: null,
  passengers: 2,
  vehicleClass: "first",
};

test.describe("Preis-Eingabe durch den Betreiber", () => {
  test("gültige Formate", () => {
    expect(parseEuro("120")).toBe(120);
    expect(parseEuro("149,90")).toBe(149.9);
    expect(parseEuro("149,9")).toBe(149.9);
    expect(parseEuro("1.200,50")).toBe(1200.5);
    expect(parseEuro("1.200")).toBe(1200);
    expect(parseEuro("1200.50")).toBe(1200.5);
    expect(parseEuro(" 89 € ")).toBe(89);
  });
  test("ungültige Werte werden abgelehnt", () => {
    for (const v of ["", "abc", "0", "0,00", "-5", "12,345", "100000,01", "1e5", "12,5,0", "∞", "NaN", "1.20,00", "<script>"]) expect(parseEuro(v), v).toBeNull();
    expect(parseEuro(null)).toBeNull();
    expect(parseEuro(120 as unknown)).toBeNull();
  });
  test("Anzeige im deutschen Format", () => {
    expect(formatEuro(149.9).replace(/\s/g, " ")).toBe("149,90 €");
    expect(formatEuro("1200.5").replace(/\s/g, " ")).toBe("1.200,50 €");
  });
});

test.describe("WhatsApp-Ablauf (Betreiber → Fahrgast)", () => {
  test("Telefonnummern werden korrekt für wa.me umgewandelt", () => {
    expect(phoneToWhatsapp("0170 1234567")).toBe("491701234567");
    expect(phoneToWhatsapp("+49 170 1234567")).toBe("491701234567");
    expect(phoneToWhatsapp("+49 (0)170 1234567")).toBe("491701234567");
    expect(phoneToWhatsapp("0049 170/123-4567")).toBe("491701234567");
    expect(phoneToWhatsapp("+43 660 1234567")).toBe("436601234567");
    expect(phoneToWhatsapp("491701234567")).toBe("491701234567");
    expect(phoneToWhatsapp("123")).toBeNull();
    expect(phoneToWhatsapp("+0 170 1234567")).toBeNull();
  });
  test("Erstnachricht enthält Auftragsnummer und Fahrtdaten, aber keinen Preis", () => {
    const m = operatorOfferMessage(booking);
    expect(m).toContain("DN-261107-ABCDEF");
    expect(m).toContain("14.03.2027, 08:30 Uhr");
    expect(m).toContain("Marienplatz 1, München");
    expect(m).toContain("Flughafen München");
    expect(m).toContain("S-Klasse");
    expect(m).not.toMatch(/€/);
  });
  test("Bestätigung enthält Auftragsnummer und vereinbarten Preis", () => {
    const m = operatorConfirmationMessage(booking, "149,90 €");
    expect(m).toContain("Auftragsnummer: DN-261107-ABCDEF");
    expect(m).toContain("Vereinbarter Fahrpreis: 149,90 €");
    const href = whatsappChatHref("491701234567", m);
    expect(href.startsWith("https://wa.me/491701234567?text=")).toBe(true);
    expect(decodeURIComponent(href.split("?text=")[1]!)).toBe(m);
  });
  test("Bestätigungs-E-Mail enthält Nummer und Preis, escaped HTML", () => {
    const mail = bookingConfirmedCustomerMail({ ...booking, lastName: "<b>X</b>" }, "149,90 €");
    expect(mail.subject).toContain("DN-261107-ABCDEF");
    expect(mail.text).toContain("Vereinbarter Fahrpreis: 149,90 €");
    expect(mail.html).toContain("149,90 €");
    expect(mail.html).not.toContain("<b>X</b>");
  });
});
