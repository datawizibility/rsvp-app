export function buildWhatsAppLink(mobileE164: string, message: string): string {
  const digits = mobileE164.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}

/**
 * Opens the chat directly in WhatsApp Web, skipping the wa.me redirect hop.
 * Requires the user to be signed in to web.whatsapp.com.
 */
export function buildWhatsAppWebLink(mobileE164: string, message: string): string {
  const digits = mobileE164.replace(/\D/g, "");
  return `https://web.whatsapp.com/send?phone=${digits}&text=${encodeURIComponent(
    message,
  )}`;
}

/**
 * Hands the chat straight to the WhatsApp desktop app via the custom scheme,
 * with no browser page or redirect in between. Requires the app to be installed.
 */
export function buildWhatsAppDesktopLink(
  mobileE164: string,
  message: string,
): string {
  const digits = mobileE164.replace(/\D/g, "");
  return `whatsapp://send?phone=${digits}&text=${encodeURIComponent(message)}`;
}
