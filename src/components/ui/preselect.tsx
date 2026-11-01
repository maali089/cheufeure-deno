"use client";

import Link from "next/link";
import type { ReactNode } from "react";

export type PreselectDetail = { tripType?: "ONE_WAY" | "ROUND_TRIP" | "AIRPORT" | "HOURLY"; vehicleClass?: string };
export const PRESELECT_EVENT = "deeno:preselect";

/** Link zum Buchungsformular, der Fahrtart bzw. Fahrzeugklasse vorauswählt. */
export function PreselectLink({ detail, className, children, ariaLabel }: { detail: PreselectDetail; className?: string; children: ReactNode; ariaLabel?: string }) {
  return (
    <Link
      href="/#buchen"
      aria-label={ariaLabel}
      className={className}
      onClick={() => {
        try {
          sessionStorage.setItem(PRESELECT_EVENT, JSON.stringify(detail));
        } catch {}
        window.dispatchEvent(new CustomEvent<PreselectDetail>(PRESELECT_EVENT, { detail }));
      }}
    >
      {children}
    </Link>
  );
}
