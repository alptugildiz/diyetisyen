import type { BookingStatus } from "@/types";

// Label + Tailwind classes for each booking status.
// Color is always paired with text (never color-alone).
export const STATUS: Record<
  BookingStatus,
  { label: string; badge: string; dot: string }
> = {
  planlandi: {
    label: "Planlandı",
    badge: "bg-brand-50 text-brand-700",
    dot: "bg-brand-500",
  },
  geldi: {
    label: "Geldi",
    badge: "bg-emerald-50 text-emerald-700",
    dot: "bg-emerald-500",
  },
  gelmedi: {
    label: "Gelmedi",
    badge: "bg-amber-50 text-amber-700",
    dot: "bg-amber-500",
  },
  iptal: {
    label: "İptal",
    badge: "bg-gray-100 text-gray-500",
    dot: "bg-gray-400",
  },
};

export const STATUS_OPTIONS: BookingStatus[] = [
  "planlandi",
  "geldi",
  "gelmedi",
  "iptal",
];
