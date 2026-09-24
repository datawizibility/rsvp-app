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
  functions: string;
  opened: boolean;
  openCount: number;
  inviteLink: string;
};

const HEADER = [
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
  "Functions",
  "Opened",
  "Opens",
  "Invite Link",
];

function esc(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function bool(value: boolean | null | undefined): string {
  if (value === true) return "yes";
  if (value === false) return "no";
  return "";
}

export function buildGuestCsv(rows: GuestExportRow[]): string {
  const lines = [HEADER.join(",")];

  for (const row of rows) {
    lines.push(
      [
        row.name,
        row.mobile,
        row.email ?? "",
        row.organisation ?? "",
        row.designation ?? "",
        row.city ?? "",
        row.group ?? "",
        bool(row.isVip),
        String(row.partySize),
        row.rsvpStatus,
        String(row.adults),
        String(row.children),
        row.dietaryPreference ?? "",
        bool(row.accommodation),
        bool(row.travel),
        row.functions,
        bool(row.opened),
        String(row.openCount),
        row.inviteLink,
      ]
        .map(esc)
        .join(","),
    );
  }

  return lines.join("\n") + "\n";
}
