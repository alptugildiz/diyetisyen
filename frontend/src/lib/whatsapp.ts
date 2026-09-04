/**
 * Türkiye telefon numarasını wa.me formatına çevirir.
 * Panelde numaralar "0(555) 123 45 67" gibi biçimli tutuluyor;
 * wa.me yalnızca rakam kabul eder ve ülke kodu ister.
 *
 * Tanınmayan bir biçimde null döner — çağıran taraf butonu hiç göstermez,
 * bozuk bir bağlantı üretmektense hiç üretmemek daha iyi.
 */
export function normalizeTrPhone(phone: string): string | null {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10 && digits.startsWith("5")) return `90${digits}`;
  if (digits.length === 11 && digits.startsWith("05"))
    return `90${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("90")) return digits;
  if (digits.length === 13 && digits.startsWith("090")) return digits.slice(1);
  return null;
}

export function waLink(phone: string, text: string): string | null {
  const normalized = normalizeTrPhone(phone);
  if (!normalized) return null;
  return `https://wa.me/${normalized}?text=${encodeURIComponent(text)}`;
}

/** Randevu hatırlatma metni. Diyetisyen göndermeden önce düzenleyebilir. */
export function reminderText(
  firstName: string,
  dateLabel: string,
  time: string,
): string {
  const when = time ? `${dateLabel} saat ${time}` : dateLabel;
  return `Merhaba ${firstName}, ${when} randevunuzu hatırlatmak istedim. Görüşmek üzere!`;
}

/** Bekleyen ödeme hatırlatma metni. */
export function debtReminderText(
  firstName: string,
  amountLabel: string,
): string {
  return `Merhaba ${firstName}, bekleyen ${amountLabel} tutarındaki ödemenizi hatırlatmak istedim.`;
}
