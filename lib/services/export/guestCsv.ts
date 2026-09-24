export type GuestExportRow = {
  name: string;
  mobile: string;
  email?: string | null;
  organisation?: string | null;
  designation?: string | null;
  city?: string | null;
  group?: string | null;
  isVip: boolean;
  partySize: number;
  rsvpStatus: string;
  adults: number;
  children: number;
  dietaryPreference?: string | null;
  accommodation?: boolean | null;
  travel?: boolean | null;
  functionsAttended: string[];
  opened: boolean;
  openCount: number;
  inviteLink: string;
};

const BASE_HEADER = [
  "Name",
  "Mobile",
  "Email",
  "Organisation",
  "Designation",
  "City",
  "Group",
  "VIP",
  "Party Size",
  "RSVP",
  "Adults",
  "Children",
  "Diet",
  "Accommodation",
  "Travel",
];

const TAIL_HEADER = ["Opened", "Opens", "Invite Link"];

function esc(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** Force a value to be read as text by Excel/Sheets (prevents scientific notation). */
function asText(value: string): string {
  return `="${value.replace(/"/g, '""')}"`;
}

function bool(value: boolean | null | undefined): string {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "";
}

export function buildGuestCsv(
  rows: GuestExportRow[],
  functionNames: string[],
): string {
  const header = [...BASE_HEADER, ...functionNames, ...TAIL_HEADER];
  const lines = [header.map(esc).join(",")];

  for (const row of rows) {
    const cells = [
      esc(row.name),
      asText(row.mobile),
      esc(row.email ?? ""),
      esc(row.organisation ?? ""),
      esc(row.designation ?? ""),
      esc(row.city ?? ""),
      esc(row.group ?? ""),
      esc(bool(row.isVip)),
      esc(String(row.partySize)),
      esc(row.rsvpStatus),
      esc(String(row.adults)),
      esc(String(row.children)),
      esc(row.dietaryPreference ?? ""),
      esc(bool(row.accommodation)),
      esc(bool(row.travel)),
      ...functionNames.map((name) =>
        esc(row.functionsAttended.includes(name) ? "yes" : "no"),
      ),
      esc(bool(row.opened)),
      esc(String(row.openCount)),
      esc(row.inviteLink),
    ];
    lines.push(cells.join(","));
  }

  return lines.join("\n") + "\n";
}
