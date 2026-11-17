import { describe, it, expect } from "vitest";
import { buildGuestCsv, type GuestExportRow } from "@/lib/services/export/guestCsv";

const BASE =
  "Name,Mobile,Email,Organisation,Designation,City,Group,VIP,Party Size,RSVP,Adults,Children,Diet,Accommodation,Travel,Arrival,Departure,Flight/Train,Travellers,Pickup,Drop,Ticket,Travel Notes";

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
  travelArrival: null,
  travelDeparture: null,
  travelFlightNumber: null,
  travelTravellers: null,
  travelPickup: null,
  travelDrop: null,
  travelTicketUrl: null,
  travelNotes: null,
  functionsAttended: ["Sangeet", "Wedding"],
  opened: true,
  openCount: 3,
  inviteLink: "https://app.example.com/e/wedding/ABC123",
  ...over,
});

describe("buildGuestCsv", () => {
  it("puts one column per function between Travel Notes and Opened", () => {
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
    expect(cells[23]).toBe("no"); // Mehendi
    expect(cells[24]).toBe("yes"); // Sangeet
  });

  it("writes travel details including the ticket link", () => {
    const csv = buildGuestCsv(
      [
        row({
          travel: true,
          travelArrival: new Date("2026-12-10T08:30"),
          travelFlightNumber: "6E 234",
          travelTravellers: 3,
          travelPickup: true,
          travelDrop: false,
          travelTicketUrl: "https://blob.example.com/ticket.pdf",
          travelNotes: "NSCBI airport",
        }),
      ],
      [],
    );
    const body = csv.split("\n")[1];
    // Arrival renders with a comma, so it is quoted — assert by content.
    expect(body).toContain('"10 Dec, 08:30 am"');
    expect(body).toContain(',6E 234,3,yes,no,https://blob.example.com/ticket.pdf,NSCBI airport');
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
