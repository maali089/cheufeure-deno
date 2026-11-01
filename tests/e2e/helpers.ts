export const randomIp = () => `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}`;

export function futureDate(days: number) {
  const d = new Date(Date.now() + days * 86400000);
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Berlin", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  return parts; // YYYY-MM-DD
}

export const ADMIN_USER = process.env.E2E_ADMIN_USER ?? "deeno";
export const ADMIN_PASS = process.env.E2E_ADMIN_PASS ?? "deeno-local-admin-2026";
