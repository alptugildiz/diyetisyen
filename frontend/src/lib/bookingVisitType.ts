import type { BookingVisitType } from "@/types";

export const VISIT_TYPE: Record<
  BookingVisitType,
  { label: string; badge: string }
> = {
  ilk_gorusme: { label: "İlk Görüşme", badge: "bg-indigo-50 text-indigo-700" },
  kontrol: { label: "Kontrol", badge: "bg-gray-100 text-gray-500" },
};
