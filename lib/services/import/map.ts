export type CanonicalField =
  | "name"
  | "mobile"
  | "email"
  | "organisation"
  | "designation"
  | "group"
  | "vip"
  | "partySize"
  | "city";

export type ColumnMapping = Record<CanonicalField, string | null>;

const SYNONYMS: Record<CanonicalField, string[]> = {
  name: ["name", "guest name", "full name", "guest", "invitee", "first name"],
  mobile: [
    "mobile",
    "mob no",
    "mob",
    "phone",
    "phone number",
    "contact",
    "mobile number",
    "cell",
    "whatsapp",
    "whatsapp number",
  ],
  email: ["email", "e mail", "email address", "mail"],
  organisation: ["organisation", "organization", "company", "firm", "org", "employer"],
  designation: ["designation", "title", "role", "position", "job title"],
  group: ["group", "side", "category", "segment", "list", "relation"],
  vip: ["vip", "is vip", "priority", "vip flag"],
  partySize: [
    "party size",
    "pax",
    "guest count",
    "number of guests",
    "seats",
    "heads",
    "no of guests",
  ],
  city: ["city", "location", "town", "place"],
};

const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Heuristic header → canonical field mapping. Deterministic and offline.
 * This is the seam where an AI mapper could be dropped in later: same
 * signature, same return shape.
 */
export function mapColumns(headers: string[]): ColumnMapping {
  const normalizedHeaders = headers.map((raw) => ({ raw, n: normalize(raw) }));
  const out = {} as ColumnMapping;

  for (const field of Object.keys(SYNONYMS) as CanonicalField[]) {
    const synonyms = SYNONYMS[field].map(normalize);
    const exact = normalizedHeaders.find((h) => synonyms.includes(h.n));
    const partial = normalizedHeaders.find((h) =>
      synonyms.some((s) => h.n.includes(s) || s.includes(h.n)),
    );
    out[field] = (exact ?? partial)?.raw ?? null;
  }

  return out;
}
