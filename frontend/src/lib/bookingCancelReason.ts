import type { BookingCancelReason } from "@/types";

export const CANCEL_REASON: Record<BookingCancelReason, { label: string }> = {
  tarih_uygun_degil: { label: "Tarih/saat uygun değildi" },
  ucret: { label: "Ücret nedeniyle" },
  unuttu: { label: "Unuttu" },
  saglik_problemi: { label: "Sağlık problemi" },
  iletisim_kurulamadi: { label: "İletişim kurulamadı" },
  baska_hizmet: { label: "Başka bir hizmet tercih etti" },
  belirtilmedi: { label: "Belirtilmedi" },
};

export const CANCEL_REASON_OPTIONS: BookingCancelReason[] = [
  "tarih_uygun_degil",
  "ucret",
  "unuttu",
  "saglik_problemi",
  "iletisim_kurulamadi",
  "baska_hizmet",
  "belirtilmedi",
];
