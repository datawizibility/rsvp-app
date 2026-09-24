import { describe, it, expect } from "vitest";
import { buildGuestCsv, type GuestExportRow } from "@/lib/services/export/guestCsv";

const BASE =
  "Name,Mobile,Email,Organisation,Designation,City,Group,VIP,Party Size,RSVP,Adults,Children,Diet,Accommodation,Travel";

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
  functionsAttended: ["Sangeet", "Wedding"],
  opened: true,
  openCount: 3,
  inviteLink: "https://app.example.com/e/wedding/ABC123",
  ...over,
});

describe("buildGuestCsv", () => {
  it("puts one column per function between Travel and Opened", () => {
    const csv = buildGuestCsv([], ["Mehendi", "Sangeet", "Wedding", "Reception"]);
    expect(csv.split("\n")[0]).toBe(
      `${BASE},Mehendi,Sangeet,Wedding,Reception,Opened,Opens,Invite Link`,
    );
  });

  it("marks yes/no for each function per guest", () => {
    const csv = buildGuestCsv([row({ functionsAttended: ["Sangeet"] })], [
      "Mehendi",
      "Sangeet",
    ]);
    const cells = csv.split("\n")[1].split(",");
    expect(cells[15]).toBe("no"); // Mehendi
    expect(cells[16]).toBe("yes"); // Sangeet
  });

  it("writes phone numbers as text so Excel does not use scientific notation", () => {
    const csv = buildGuestCsv([row()], []);
    expect(csv.split("\n")[1].split(",")[1]).toBe('="+919876543210"');
  });

  it("escapes commas, quotes and newlines in text fields", () => {
    const csv = buildGuestCsv([row({ name: 'Smith, "Bob"', group: "Line1\nLine2" })], []);
    const body = csv.split("\n").slice(1).join("\n");
    expect(body).toContain('"Smith, ""Bob"""');
    expect(body).toContain('"Line1\nLine2"');
  });

  it("writes one line per guest", () => {
    const csv = buildGuestCsv([row(), row({ name: "Priya Shah" })], ["Sangeet"]);
    expect(csv.trim().split("\n")).toHaveLength(3);
  });
});
