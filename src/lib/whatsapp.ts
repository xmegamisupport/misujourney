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

/** Country-aware normalization — the counterpart to normalizeWhatsAppNumber
 * above, which only ever assumed Malaysia. Strips everything but digits from
 * both inputs, drops a local trunk "0" prefix, and never double-prepends the
 * country code if the local number already carries it (e.g. someone pasted
 * "+60123456789" into the local-number field). Returns null when either
 * input has no digits at all, or the result falls outside a plausible E.164
 * length (8-15 digits) — callers must treat null as "don't generate a link". */
export function normalizeInternationalPhoneNumber(countryCallingCode: string, localPhoneNumber: string): string | null {
  const code = countryCallingCode.replace(/[^0-9]/g, "");
  if (!code) return null;

  let digits = localPhoneNumber.replace(/[^0-9]/g, "");
  if (!digits) return null;

  if (digits.startsWith(code)) {
    // already carries the country code — use as-is, don't double-prepend
  } else if (digits.startsWith("0")) {
    digits = code + digits.slice(1);
  } else {
    digits = code + digits;
  }

  if (digits.length < 8 || digits.length > 15) return null;
  return digits;
}

const ALLOWED_WHATSAPP_HOSTS = ["wa.me", "api.whatsapp.com", "whatsapp.com"];

/** Only https:// links on wa.me / api.whatsapp.com / whatsapp.com (or a
 * subdomain of the latter, for WhatsApp Business short links) are accepted —
 * rejects arbitrary external domains and any non-https scheme (including
 * javascript:). Returns the normalized URL string, or null if invalid. */
export function validateCustomWhatsAppLink(rawUrl: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:") return null;
  const host = parsed.hostname.toLowerCase();
  const isAllowedHost = ALLOWED_WHATSAPP_HOSTS.some((allowed) => host === allowed || host.endsWith(`.${allowed}`));
  if (!isAllowedHost) return null;
  return parsed.toString();
}

export type WhatsAppContactMethod = "generated_number" | "custom_link";

export interface CoachWhatsAppSource {
  contactMethod: WhatsAppContactMethod;
  normalizedNumber: string | null;
  customLink: string | null;
}

/** Single priority-ordered decision for "what WhatsApp URL should a
 * customer's contact button open": a validated custom link wins if the
 * Coach chose that method, otherwise fall back to the generated wa.me link
 * from the normalized number, otherwise null (caller must show a
 * not-configured state, never a broken link). */
export function getCoachWhatsAppUrl(source: CoachWhatsAppSource, message: string): string | null {
  if (source.contactMethod === "custom_link" && source.customLink) {
    const validated = validateCustomWhatsAppLink(source.customLink);
    if (validated) return validated;
  }
  if (source.normalizedNumber) {
    return buildWhatsAppLink(source.normalizedNumber, message);
  }
  return null;
}

/** `whatsappNumber` must already be normalized (digits only, with country
 * code) — this never touches raw/unformatted input. */
export function buildWhatsAppLink(whatsappNumber: string, message: string): string {
  return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
