import { describe, it, expect } from "vitest";
import { buildGuestCsv, type GuestExportRow } from "@/lib/services/export/guestCsv";

const row = (over: Partial<GuestExportRow> = {}): GuestExportRow => ({
  name: "Rahul Sharma",
  mobile: "+919876543210",
  email: null,
  organisation: null,
  designation: null,
  city: null,
  group: "Friends",
  isVip: false,
  partySize: 2,
  rsvpStatus: "yes",
  adults: 2,
  children: 0,
  dietaryPreference: "veg",
  accommodation: false,
  travel: false,
  functions: "Sangeet, Wedding",
  opened: true,
  openCount: 3,
  inviteLink: "https://app.example.com/e/wedding/ABC123",
  ...over,
});

describe("buildGuestCsv", () => {
  it("starts with a header row", () => {
    const csv = buildGuestCsv([]);
    const header = csv.split("\n")[0];
    expect(header).toBe(
      "Name,Mobile,Email,Organisation,Designation,City,Group,VIP,Party Size,RSVP,Adults,Children,Diet,Accommodation,Travel,Functions,Opened,Opens,Invite Link",
    );
  });

  it("writes one line per guest", () => {
    const csv = buildGuestCsv([row(), row({ name: "Priya Shah" })]);
    const lines = csv.trim().split("\n");
    expect(lines).toHaveLength(3);
    expect(lines[1].startsWith("Rahul Sharma,")).toBe(true);
    expect(lines[2].startsWith("Priya Shah,")).toBe(true);
  });

  it("escapes commas, quotes and newlines", () => {
    const csv = buildGuestCsv([
      row({ name: 'Smith, "Bob"', group: "Line1\nLine2" }),
    ]);
    const line = csv.split("\n").slice(1).join("\n");
    expect(line).toContain('"Smith, ""Bob"""');
    expect(line).toContain('"Line1\nLine2"');
  });

  it("renders booleans and nulls readably", () => {
    const csv = buildGuestCsv([row({ isVip: true, accommodation: null, email: null })]);
    const cells = csv.split("\n")[1].split(",");
    expect(cells[7]).toBe("yes"); // VIP
    expect(cells[2]).toBe(""); // Email null
    expect(cells[13]).toBe(""); // Accommodation null
  });
});
