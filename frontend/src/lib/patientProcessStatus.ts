import type { PatientProcessStatus } from "@/types";

// Neutral badge colors on purpose — this reflects where a patient is in
// their process, not a performance judgment.
export const PROCESS_STATUS: Record<
  PatientProcessStatus,
  { label: string; badge: string }
> = {
  aktif: { label: "Aktif", badge: "bg-brand-50 text-brand-700" },
  tamamladi: {
    label: "Süreci Tamamladı",
    badge: "bg-emerald-50 text-emerald-700",
  },
  birakti: {
    label: "Ara Verdi / Bıraktı",
    badge: "bg-gray-100 text-gray-500",
  },
};

export const PROCESS_STATUS_OPTIONS: PatientProcessStatus[] = [
  "aktif",
  "tamamladi",
  "birakti",
];
