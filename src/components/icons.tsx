import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement> & { size?: number };

function base({ size = 20, ...props }: IconProps) {
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.3,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
    focusable: false,
    ...props,
  };
}

export const PhoneIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5.2 3.5h3l1.6 4.1-2 1.3a11.3 11.3 0 0 0 7.3 7.3l1.3-2 4.1 1.6v3a1.7 1.7 0 0 1-1.8 1.7A16.6 16.6 0 0 1 3.5 5.3 1.7 1.7 0 0 1 5.2 3.5Z" />
  </svg>
);

export const MailIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3" y="5.5" width="18" height="13" rx="1" />
    <path d="m3.5 6.5 8.5 6.5 8.5-6.5" />
  </svg>
);

/** WhatsApp-Kontakt (vereinfachte Sprechblase mit Hörer) */
export const WhatsappIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4.3 19.7 5.4 16A8.4 8.4 0 1 1 8.2 18.7Z" />
    <path d="M9.3 8.6c.2-.4.4-.5.7-.5h.5c.2 0 .4.1.5.4l.6 1.5c.1.2 0 .4-.1.6l-.5.6c.6 1.2 1.6 2.2 2.8 2.8l.6-.5c.2-.2.4-.2.6-.1l1.5.6c.3.1.4.3.4.5v.5c0 .3-.1.5-.5.7-.6.4-1.5.5-2.4.1a8.6 8.6 0 0 1-4.6-4.6c-.4-.9-.3-1.8.1-2.4Z" />
  </svg>
);

export const ArrowRightIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M4 12h15.5M14 6.5l5.5 5.5-5.5 5.5" />
  </svg>
);

export const ArrowLeftIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M20 12H4.5M10 6.5 4.5 12l5.5 5.5" />
  </svg>
);

export const PlusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 5v14M5 12h14" />
  </svg>
);

export const MinusIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5 12h14" />
  </svg>
);

export const CheckIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m5 12.5 4.5 4.5L19 7.5" />
  </svg>
);

export const CloseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M6 6l12 12M18 6 6 18" />
  </svg>
);

export const UsersIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="9" cy="8" r="3.2" />
    <path d="M3 19.5c.6-3.3 3-5.2 6-5.2s5.4 1.9 6 5.2" />
    <path d="M15.5 5.2a3.1 3.1 0 0 1 0 5.8M17.6 14.6c1.8.6 3 2.3 3.4 4.9" />
  </svg>
);

export const SuitcaseIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="5" y="7" width="14" height="12.5" rx="1.5" />
    <path d="M9 7V4.8c0-.5.4-.8.8-.8h4.4c.4 0 .8.3.8.8V7M9 7v12.5M15 7v12.5M8 21v-1.5M16 21v-1.5" />
  </svg>
);

export const CalendarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <rect x="3.5" y="5" width="17" height="15" rx="1" />
    <path d="M3.5 9.5h17M8 3v4M16 3v4" />
  </svg>
);

export const ClockIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M12 7.5V12l3 2" />
  </svg>
);

export const PinIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M12 21s-6.5-6.1-6.5-11a6.5 6.5 0 0 1 13 0c0 4.9-6.5 11-6.5 11Z" />
    <circle cx="12" cy="10" r="2.3" />
  </svg>
);

export const FlagIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M5.5 21V4M5.5 4.5h11l-2 3.7 2 3.8h-11" />
  </svg>
);

export const PlaneIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M10.5 13.5 3.5 11l1.2-1.5 7.3.7 4.3-4.8c.9-1 2.6-1.5 3.3-.8.7.7.2 2.4-.8 3.3l-4.8 4.3.7 7.3-1.5 1.2-2.5-7Z" />
  </svg>
);

export const ChevronDownIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="m6 9 6 6 6-6" />
  </svg>
);

/* Vorteile */
export const DiscretionIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
    <path d="M4 20 20 4" />
  </svg>
);

export const ComfortIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M7 4.5c1.5 0 2.4 1 2.6 2.4l1 6.6h5.6c1.3 0 2.3.9 2.6 2.2l.7 3.8" />
    <path d="M6.2 9.5 7.4 15c.3 1.3 1.4 2.2 2.7 2.2h5.4M8.5 20.5h9" />
  </svg>
);

export const PersonalIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="12" cy="7.5" r="3.5" />
    <path d="M5 20.5c.8-4 3.6-6.3 7-6.3s6.2 2.3 7 6.3" />
    <path d="m10 14.6 2 2.4 2-2.4" />
  </svg>
);

export const FlexibleIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <circle cx="5.5" cy="18" r="2" />
    <circle cx="18.5" cy="6" r="2" />
    <path d="M7.5 18h7a3.5 3.5 0 0 0 0-7h-5a3.5 3.5 0 0 1 0-7h7" />
  </svg>
);

export const MenuIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M3.5 8h17M8.5 16h12" />
  </svg>
);

/** Dezentes Limousinen-Symbol */
export const CarIcon = (p: IconProps) => (
  <svg {...base(p)}>
    <path d="M2.5 15.5v-2.2c0-.8.5-1.5 1.3-1.7l3-.8 2.6-2.6c.5-.5 1.1-.7 1.8-.7h4.1c.7 0 1.3.3 1.8.8l2.4 2.6 1.4.4c.8.2 1.3.9 1.3 1.7v2.5" />
    <path d="M2.5 15.5h2.2M9.3 15.5h5.4M19.3 15.5h2.2" />
    <circle cx="7" cy="15.8" r="1.9" />
    <circle cx="17" cy="15.8" r="1.9" />
    <path d="M7.5 11 12 10.6l5.6.4" />
  </svg>
);
