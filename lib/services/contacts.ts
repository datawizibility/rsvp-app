import { prisma } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { normalizeMobile } from "@/lib/utils/phone";

export type ContactInput = {
  name: string;
  mobile: string;
  email?: string | null;
  organisation?: string | null;
  designation?: string | null;
  city?: string | null;
};

export async function upsertContact(workspaceId: string, data: ContactInput) {
  const mobileNormalized = normalizeMobile(data.mobile);
  if (!mobileNormalized) {
    throw new ValidationError(`Invalid mobile number: ${data.mobile}`);
  }

  return prisma.contact.upsert({
    where: {
      workspaceId_mobileNormalized: { workspaceId, mobileNormalized },
    },
    update: {
      name: data.name,
      email: data.email ?? undefined,
      organisation: data.organisation ?? undefined,
      designation: data.designation ?? undefined,
      city: data.city ?? undefined,
    },
    create: {
      workspaceId,
      name: data.name,
      mobile: data.mobile,
      mobileNormalized,
      email: data.email ?? null,
      organisation: data.organisation ?? null,
      designation: data.designation ?? null,
      city: data.city ?? null,
    },
  });
}

export function listContacts(workspaceId: string) {
  return prisma.contact.findMany({
    where: { workspaceId },
    orderBy: { createdAt: "desc" },
  });
}

export async function existingNormalizedMobiles(workspaceId: string) {
  const contacts = await prisma.contact.findMany({
    where: { workspaceId },
    select: { mobileNormalized: true },
  });
  return new Set(contacts.map((c) => c.mobileNormalized));
}
