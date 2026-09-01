import type { PaymentMethod } from "@/types";

export const PAYMENT_METHOD: Record<
  PaymentMethod,
  { label: string; badge: string }
> = {
  nakit: { label: "Nakit", badge: "bg-emerald-50 text-emerald-700" },
  kart: { label: "Kart", badge: "bg-brand-50 text-brand-700" },
  havale: { label: "Havale", badge: "bg-indigo-50 text-indigo-700" },
};

export const PAYMENT_METHOD_OPTIONS: PaymentMethod[] = [
  "nakit",
  "kart",
  "havale",
];
