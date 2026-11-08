/** Höchstbetrag für einen vereinbarten Fahrpreis (Schutz vor Tippfehlern). */
export const MAX_AGREED_PRICE = 100_000;

/**
 * Liest einen vom Betreiber eingegebenen Euro-Betrag ein.
 * Erlaubt: "120", "120,5", "120,50", "1.200,00", "1200.00", "120 €".
 * Gibt den Betrag in Euro (max. 2 Nachkommastellen) oder null zurück.
 */
export function parseEuro(input: unknown): number | null {
  if (typeof input !== "string") return null;
  let s = input.replace(/\s|€|EUR/gi, "");
  if (!s) return null;
  if (s.includes(",")) {
    // Deutsches Format: Punkt = Tausendertrennzeichen, Komma = Dezimaltrennzeichen
    if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(s)) return null;
    s = s.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(s)) {
    s = s.replace(/\./g, ""); // "1.200" = 1200 €
  }
  if (!/^\d{1,6}(\.\d{1,2})?$/.test(s)) return null;
  const value = Math.round(Number(s) * 100) / 100;
  if (!Number.isFinite(value) || value <= 0 || value > MAX_AGREED_PRICE) return null;
  return value;
}

const fmt = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" });
/** 149.9 → "149,90 €" */
export const formatEuro = (value: number | string | { toString(): string }) => fmt.format(Number(value.toString()));
