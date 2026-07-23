// Turkish mobile phone mask: 0(5xx)xxx xx xx
// Stores/displays the formatted string; validation checks 10 digits starting with 5.

// Reduce any input to the 10 significant digits (drop country code / leading 0).
function significant(input: string): string {
  let d = input.replace(/\D/g, "");
  if (d.startsWith("90")) d = d.slice(2);
  if (d.startsWith("0")) d = d.slice(1);
  return d.slice(0, 10);
}

// "5321234567" / "0532..." / partial → "0(532)123 45 67"
export function formatPhone(input: string): string {
  const d = significant(input);
  if (d.length === 0) return "";
  let out = "0(" + d.slice(0, 3);
  if (d.length >= 3) out += ")";
  if (d.length > 3) out += d.slice(3, 6);
  if (d.length > 6) out += " " + d.slice(6, 8);
  if (d.length > 8) out += " " + d.slice(8, 10);
  return out;
}

// Valid = 10 digits starting with 5 (Turkish mobile).
export function isValidPhone(value: string): boolean {
  return /^5\d{9}$/.test(significant(value));
}

export const PHONE_PLACEHOLDER = "0(5xx)xxx xx xx";
