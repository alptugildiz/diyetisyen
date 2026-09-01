import type { RequestStatus } from "@/types";

export const REQUEST_STATUS: Record<
  RequestStatus,
  { label: string; badge: string }
> = {
  yeni: { label: "Yeni", badge: "bg-brand-50 text-brand-700" },
  donusturuldu: {
    label: "Danışana dönüştürüldü",
    badge: "bg-emerald-50 text-emerald-700",
  },
  yoksayildi: { label: "Yoksayıldı", badge: "bg-gray-100 text-gray-500" },
};
