import type { InvitationContent, InvitationSections } from "@/lib/services/invitation";

export type InvitationFunction = {
  id: string;
  name: string;
  date: Date | string;
  startTime?: string | null;
  venueName?: string | null;
  dressCode?: string | null;
};

export type InvitationView = {
  eventName: string;
  eventType: string;
  startDate: Date | string;
  endDate?: Date | string | null;
  city?: string | null;
  locationName?: string | null;
  hostName?: string | null;
  contactNumber?: string | null;
  content: InvitationContent;
  sections: InvitationSections;
  functions: InvitationFunction[];
  media: { url: string }[];
  coverImageUrl?: string | null;
  guest?: { name: string; isVip: boolean } | null;
  rsvpUrl?: string | null;
};

export function formatDate(value: Date | string): string {
  return new Date(value).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatDayMonth(value: Date | string): string {
  return new Date(value)
    .toLocaleDateString("en-IN", { day: "2-digit", month: "short" })
    .toUpperCase();
}
