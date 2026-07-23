"use client";

import { formatPhone, PHONE_PLACEHOLDER } from "@/lib/phone";

const BASE_INPUT =
  "w-full border border-gray-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-400";

// Controlled phone input that masks to 0(5xx)xxx xx xx as the user types.
export default function PhoneInput({
  value,
  onChange,
  placeholder = PHONE_PLACEHOLDER,
  inputClassName = BASE_INPUT,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  inputClassName?: string;
}) {
  return (
    <input
      type="tel"
      inputMode="numeric"
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(formatPhone(e.target.value))}
      className={inputClassName}
    />
  );
}
