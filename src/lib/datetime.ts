const TZ = "Europe/Berlin";

/** Aktuelles Datum/Uhrzeit in Europe/Berlin als ISO-Strings (YYYY-MM-DD, HH:MM). */
export function berlinNow(at: Date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(at);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "00";
  const date = `${get("year")}-${get("month")}-${get("day")}`;
  const time = `${get("hour")}:${get("minute")}`;
  return {
    date,
    time,
    plusYears: (n: number) => `${Number(get("year")) + n}-${get("month")}-${get("day")}`,
  };
}

export function isValidIsoDate(v: string | undefined): v is string {
  if (!v || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const [y, m, d] = v.split("-").map(Number) as [number, number, number];
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCFullYear() === y && dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d;
}

export function isValidTime(v: string | undefined): v is string {
  return !!v && /^([01]\d|2[0-3]):[0-5]\d$/.test(v);
}

/** "2026-11-03" → "Di., 03.11.2026" */
export function formatDateDe(iso: string | null | undefined) {
  if (!iso || !isValidIsoDate(iso)) return iso ?? "–";
  const [y, m, d] = iso.split("-").map(Number) as [number, number, number];
  return new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric", timeZone: "UTC" }).format(
    new Date(Date.UTC(y, m - 1, d)),
  );
}

export function formatDateTimeDe(date: Date) {
  return new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: TZ }).format(date);
}
