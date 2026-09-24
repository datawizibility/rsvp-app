import { randomInt } from "crypto";

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1

/**
 * High-entropy URL-safe guest token. 26 chars * ~5 bits ≈ 130 bits.
 */
export function generateGuestToken(length = 26): string {
  let out = "";
  for (let i = 0; i < length; i++) {
    out += ALPHABET[randomInt(ALPHABET.length)];
  }
  return out;
}
