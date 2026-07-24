import type { PatientSource, PatientSourceKey } from "@/types";

export const PATIENT_SOURCE: Record<PatientSourceKey, { label: string }> = {
  instagram: { label: "Instagram" },
  google: { label: "Google" },
  dis_hekimi: { label: "Diş Hekimi Yönlendirmesi" },
  danisan_tavsiyesi: { label: "Mevcut Danışan Tavsiyesi" },
  web_sitesi: { label: "Web Sitesi" },
  klinik_ici: { label: "Klinik İçi Yönlendirme" },
  diger: { label: "Diğer" },
  belirtilmemis: { label: "Belirtilmemiş" },
};

// Selectable in forms — "belirtilmemis" is a report-only bucket, not a
// choice the dietitian picks.
export const PATIENT_SOURCE_OPTIONS: PatientSource[] = [
  "instagram",
  "google",
  "dis_hekimi",
  "danisan_tavsiyesi",
  "web_sitesi",
  "klinik_ici",
  "diger",
];
