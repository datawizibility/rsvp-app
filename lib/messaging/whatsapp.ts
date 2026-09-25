export function buildWhatsAppLink(mobileE164: string, message: string): string {
  const digits = mobileE164.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
