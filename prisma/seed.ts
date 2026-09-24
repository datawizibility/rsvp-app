import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { generateGuestToken } from "../lib/utils/token";
import { normalizeMobile } from "../lib/utils/phone";

const prisma = new PrismaClient();

const CONTENT = {
  headline: "Rahul & Neha",
  welcome:
    "Together with our families, we invite you to celebrate our wedding. Your presence will make our joy complete.",
  about: "From a chance meeting in Kolkata to forever — join us as we begin our life together.",
  hostMessage: "We can't wait to celebrate with you.",
  rsvpMessage: "Kindly confirm your attendance so we can plan well for you.",
  venueNote: "Valet parking available at the main gate.",
};

const SECTIONS = {
  welcome: true,
  about: true,
  functions: true,
  gallery: true,
  venue: true,
  directions: true,
  dressCode: true,
  accommodation: false,
  travel: false,
  rsvp: true,
  contact: true,
  giftRegistry: false,
  agenda: false,
};

const GUESTS: {
  name: string;
  mobile: string;
  org?: string;
  vip?: boolean;
  party?: number;
  rsvp?: "yes" | "maybe" | "no";
}[] = [
  { name: "Rajesh Sharma", mobile: "9800000001", org: "Sharma Textiles", vip: true, party: 2, rsvp: "yes" },
  { name: "Priya Shah", mobile: "9800000002", party: 4, rsvp: "yes" },
  { name: "Amit Rathi", mobile: "9800000003", org: "TradeOnLevels", rsvp: "maybe" },
  { name: "Sneha Kapoor", mobile: "9800000004", party: 2, rsvp: "yes" },
  { name: "Vikram Singh", mobile: "9800000005", org: "Singh & Co", vip: true, rsvp: "no" },
  { name: "Anita Desai", mobile: "9800000006", party: 3 },
  { name: "Rohit Verma", mobile: "9800000007", party: 2, rsvp: "yes" },
  { name: "Meera Iyer", mobile: "9800000008" },
  { name: "Karan Malhotra", mobile: "9800000009", org: "KM Ventures", party: 2 },
  { name: "Divya Nair", mobile: "9800000010", rsvp: "maybe" },
  { name: "Sanjay Gupta", mobile: "9800000011", party: 5, rsvp: "yes" },
  { name: "Neha Reddy", mobile: "9800000012" },
];

async function main() {
  const email = "demo@example.com";
  await prisma.user.deleteMany({ where: { email } });

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: await bcrypt.hash("demo1234", 10),
      name: "Demo Host",
    },
  });

  const workspace = await prisma.workspace.create({
    data: { ownerId: user.id, name: "Demo Events" },
  });

  const event = await prisma.event.create({
    data: {
      workspaceId: workspace.id,
      name: "Rahul & Neha Wedding",
      type: "wedding",
      status: "published",
      startDate: new Date("2026-12-10"),
      endDate: new Date("2026-12-12"),
      city: "Kolkata",
      locationName: "ITC Royal Bengal",
      hostName: "Sharma & Kapoor Families",
      contactNumber: "+919800000000",
      slug: "rahul-neha-wedding",
      publishedAt: new Date(),
    },
  });

  const functionDefs = [
    { name: "Mehendi", date: new Date("2026-12-10"), startTime: "17:00", venueName: "Family Residence", dressCode: "Bright colours" },
    { name: "Sangeet", date: new Date("2026-12-11"), startTime: "19:00", venueName: "ITC Royal Bengal", dressCode: "Indo-western" },
    { name: "Wedding Ceremony", date: new Date("2026-12-12"), startTime: "11:00", venueName: "ITC Royal Bengal", dressCode: "Traditional" },
    { name: "Reception", date: new Date("2026-12-12"), startTime: "19:00", venueName: "ITC Royal Bengal", dressCode: "Formal" },
  ];

  const functions = [];
  for (let i = 0; i < functionDefs.length; i++) {
    functions.push(
      await prisma.eventFunction.create({
        data: { eventId: event.id, sortOrder: i, ...functionDefs[i] },
      }),
    );
  }

  await prisma.eventQuestion.create({
    data: { eventId: event.id, label: "Any song request for the Sangeet?", sortOrder: 0 },
  });

  for (const guest of GUESTS) {
    const mobileNormalized = normalizeMobile(guest.mobile);
    if (!mobileNormalized) continue;

    const contact = await prisma.contact.create({
      data: {
        workspaceId: workspace.id,
        name: guest.name,
        mobile: guest.mobile,
        mobileNormalized,
        organisation: guest.org ?? null,
      },
    });

    const eventGuest = await prisma.eventGuest.create({
      data: {
        eventId: event.id,
        contactId: contact.id,
        isVip: guest.vip ?? false,
        partySize: guest.party ?? 1,
        guestToken: generateGuestToken(),
      },
    });

    if (guest.rsvp) {
      const attending = guest.rsvp === "yes";
      await prisma.rsvp.create({
        data: {
          eventId: event.id,
          eventGuestId: eventGuest.id,
          status: guest.rsvp,
          adultCount: attending ? guest.party ?? 1 : 0,
          childCount: 0,
          attendance: attending
            ? {
                create: functions.slice(0, 2).map((fn) => ({
                  eventFunctionId: fn.id,
                  attending: true,
                })),
              }
            : undefined,
        },
      });
    }
  }

  await prisma.invitation.create({
    data: {
      eventId: event.id,
      templateKey: "royal",
      content: CONTENT,
      sections: SECTIONS,
      published: true,
      version: 1,
    },
  });

  console.log("Seed complete.");
  console.log("  Login: demo@example.com / demo1234");
  console.log("  Event slug: rahul-neha-wedding");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
