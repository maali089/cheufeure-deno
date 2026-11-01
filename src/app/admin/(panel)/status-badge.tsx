import { bookingStatusLabels, type BookingStatusValue } from "@/lib/validation";

const styles: Record<BookingStatusValue, string> = {
  RECEIVED: "border-gold/60 text-gold",
  IN_PROGRESS: "border-sky-300/50 text-sky-200",
  CONFIRMED: "border-emerald-300/50 text-emerald-200",
  REJECTED: "border-rose-300/50 text-rose-200",
  COMPLETED: "border-white/25 text-ivory/70",
};

export function StatusBadge({ status }: { status: BookingStatusValue }) {
  return <span className={`inline-block whitespace-nowrap border px-2 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.14em] ${styles[status]}`}>{bookingStatusLabels[status]}</span>;
}
