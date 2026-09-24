/**
 * Normalize a phone number to E.164-ish form. Defaults to India (+91).
 * Returns null when the input cannot be a plausible mobile number.
 */
export function normalizeMobile(
  raw: string | null | undefined,
  defaultCountry = "91",
): string | null {
  if (!raw) return null;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return null;

  let d = digits;
  if (d.length === 10) {
    d = defaultCountry + d;
  } else if (d.length === 11 && d.startsWith("0")) {
    d = defaultCountry + d.slice(1);
  } else if (d.length === 13 && d.startsWith("0" + defaultCountry)) {
    d = d.slice(1);
  }

  if (d.length < 10 || d.length > 15) return null;
  return "+" + d;
}
