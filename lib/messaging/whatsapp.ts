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
