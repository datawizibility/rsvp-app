import { PrismaClient } from "@prisma/client";
import { expect, test } from "@playwright/test";
import "dotenv/config";

const prisma = new PrismaClient();

test.afterAll(async () => {
  await prisma.$disconnect();
});

test("organiser signs in and sees the seeded event dashboard", async ({ page }) => {
  await page.goto("/signin");
  await page.fill('input[name="email"]', "demo@example.com");
  await page.fill('input[name="password"]', "demo1234");
  await page.click('button[type="submit"]');

  await page.waitForURL("**/dashboard");
  await expect(page.getByText("Your events")).toBeVisible();
  await expect(page.getByText("Rahul & Neha Wedding")).toBeVisible();

  await page.click("text=Rahul & Neha Wedding");
  await page.waitForURL(/\/events\//);
  await expect(page.getByText("RSVP overview")).toBeVisible();
  await expect(page.getByText("Confirmed", { exact: true })).toBeVisible();
});

test("guest opens their personal link and RSVPs", async ({ page }) => {
  const guest = await prisma.eventGuest.findFirst({
    where: { event: { slug: "rahul-neha-wedding" } },
    include: { event: true, contact: true },
    orderBy: { contact: { name: "asc" } },
  });
  expect(guest).not.toBeNull();
  if (!guest) return;

  await page.goto(`/e/${guest.event.slug}/${guest.guestToken}`);
  await expect(page.getByText(`Dear ${guest.contact.name}`)).toBeVisible();

  await page.goto(`/e/${guest.event.slug}/${guest.guestToken}/rsvp`);
  await page.click("text=Yes, I'll be there");
  await page.click('button[type="submit"]');

  await page.waitForURL(/submitted=1/);
  await expect(page.getByText(/Thank you/)).toBeVisible();

  const updated = await prisma.rsvp.findUnique({
    where: { eventGuestId: guest.id },
  });
  expect(updated?.status).toBe("yes");
});
