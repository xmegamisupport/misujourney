/** Default country code for numbers with no country prefix yet — Malaysia
 * for now; whatsapp_number is otherwise stored as-is once it already carries
 * a country code, so this only affects locally-formatted input like
 * "012-345 6789". */
const DEFAULT_COUNTRY_CODE = "60";

/** Strips everything but digits, then makes sure the result carries a
 * country code exactly once: a leading "0" (local format) is replaced by
 * the country code; a number already starting with the country code is
 * left alone; anything else gets the country code prepended. */
export function normalizeWhatsAppNumber(raw: string, countryCode: string = DEFAULT_COUNTRY_CODE): string {
  const digits = raw.replace(/[^0-9]/g, "");
  if (!digits) return "";
  if (digits.startsWith(countryCode)) return digits;
  if (digits.startsWith("0")) return countryCode + digits.slice(1);
  return countryCode + digits;
}

export function buildCoachContactMessage(customerName: string): string {
  return `Hi Coach，我是 ${customerName}，我想询问关于我的 MISU Journey 😊`;
}

export function buildCustomerContactMessage(customerName: string): string {
  return `Hi ${customerName}，我是你的 MISU Journey Coach，想跟你聊聊你的进度 😊`;
}

/** `whatsappNumber` must already be normalized (digits only, with country
 * code) — this never touches raw/unformatted input. */
export function buildWhatsAppLink(whatsappNumber: string, message: string): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
