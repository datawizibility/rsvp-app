import { z } from "zod";

export const signUpSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(8).max(100),
});

export const signInSchema = z.object({
  email: z.string().trim().toLowerCase().email(),
  password: z.string().min(1),
});

export const eventTypeSchema = z.enum([
  "wedding",
  "birthday",
  "corporate",
  "investor",
  "conference",
  "party",
  "religious",
  "other",
]);

export const eventStatusSchema = z.enum([
  "draft",
  "published",
  "completed",
  "archived",
]);

export const eventSchema = z.object({
  name: z.string().trim().min(2).max(120),
  type: eventTypeSchema,
  startDate: z.coerce.date(),
  endDate: z.coerce.date().optional().nullable(),
  locationName: z.string().trim().max(160).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  coverImageUrl: z.string().trim().max(500).optional().nullable(),
  hostName: z.string().trim().max(120).optional().nullable(),
  contactNumber: z.string().trim().max(20).optional().nullable(),
});

export const functionSchema = z.object({
  name: z.string().trim().min(1).max(120),
  date: z.coerce.date(),
  startTime: z.string().trim().max(10).optional().nullable(),
  endTime: z.string().trim().max(10).optional().nullable(),
  venueName: z.string().trim().max(160).optional().nullable(),
  venueAddress: z.string().trim().max(300).optional().nullable(),
  description: z.string().trim().max(1000).optional().nullable(),
  dressCode: z.string().trim().max(120).optional().nullable(),
  capacity: z.coerce.number().int().min(0).optional().nullable(),
  rsvpRequired: z.coerce.boolean().optional(),
});

export const guestSchema = z.object({
  name: z.string().trim().min(1).max(120),
  mobile: z.string().trim().min(1),
  email: z.string().trim().email().optional().nullable().or(z.literal("")),
  organisation: z.string().trim().max(160).optional().nullable(),
  designation: z.string().trim().max(120).optional().nullable(),
  city: z.string().trim().max(80).optional().nullable(),
  groupId: z.string().optional().nullable(),
  isVip: z.coerce.boolean().optional(),
  partySize: z.coerce.number().int().min(1).max(50).optional(),
});

export const rsvpSchema = z.object({
  status: z.enum(["yes", "maybe", "no"]),
  adultCount: z.coerce.number().int().min(0).max(50),
  childCount: z.coerce.number().int().min(0).max(50),
  functions: z.array(z.string()),
  accommodationRequired: z.coerce.boolean().optional(),
  travelRequired: z.coerce.boolean().optional(),
  dietaryPreference: z.enum(["veg", "nonveg", "jain", "other"]).optional(),
  message: z.string().trim().max(1000).optional(),
  answers: z
    .array(z.object({ questionId: z.string(), answer: z.string().trim().max(1000) }))
    .optional(),
});

export const invitationSchema = z.object({
  templateKey: z.enum(["royal", "minimal"]),
  content: z.object({
    headline: z.string().max(200),
    welcome: z.string().max(2000),
    about: z.string().max(4000).optional().default(""),
    hostMessage: z.string().max(2000).optional().default(""),
    rsvpMessage: z.string().max(500).optional().default(""),
    venueNote: z.string().max(1000).optional().default(""),
  }),
  sections: z.object({
    welcome: z.boolean(),
    about: z.boolean(),
    functions: z.boolean(),
    gallery: z.boolean(),
    venue: z.boolean(),
    directions: z.boolean(),
    dressCode: z.boolean(),
    accommodation: z.boolean(),
    travel: z.boolean(),
    rsvp: z.boolean(),
    contact: z.boolean(),
    giftRegistry: z.boolean(),
    agenda: z.boolean(),
  }),
  coverImageUrl: z.string().max(500).optional().nullable(),
  media: z
    .array(z.object({ url: z.string().max(500), type: z.string().max(20) }))
    .optional(),
});
