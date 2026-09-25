import { describe, it, expect } from "vitest";
import { renderMessage } from "@/lib/messaging/templates";
import {
  buildWhatsAppLink,
  buildWhatsAppWebLink,
  buildWhatsAppDesktopLink,
} from "@/lib/messaging/whatsapp";

const vars = {
  name: "Raj",
  event: "Rahul & Neha Wedding",
  date: "10 Dec 2026",
  link: "https://x/e/a/T1",
};

describe("renderMessage", () => {
  it("substitutes every placeholder", () => {
    expect(renderMessage("Hi {name}, {event} on {date}: {link}", vars)).toBe(
      "Hi Raj, Rahul & Neha Wedding on 10 Dec 2026: https://x/e/a/T1",
    );
  });

  it("tolerates spaces and casing", () => {
    expect(renderMessage("Hi { NAME }", vars)).toBe("Hi Raj");
  });

  it("leaves unknown placeholders intact", () => {
    expect(renderMessage("Hi {name}, {typo}", vars)).toBe("Hi Raj, {typo}");
  });

  it("falls back to 'there' when the name is empty", () => {
    expect(renderMessage("Hi {name}!", { ...vars, name: "  " })).toBe("Hi there!");
  });
});

describe("buildWhatsAppLink", () => {
  it("strips the plus and non-digits and encodes the message", () => {
    const link = buildWhatsAppLink("+91 98000 00001", "Hi there & welcome");
    expect(link).toBe(
      "https://wa.me/919800000001?text=Hi%20there%20%26%20welcome",
    );
  });
});

describe("buildWhatsAppWebLink", () => {
  it("builds a direct WhatsApp Web send link", () => {
    const link = buildWhatsAppWebLink("+91 98000 00001", "Hi there & welcome");
    expect(link).toBe(
      "https://web.whatsapp.com/send?phone=919800000001&text=Hi%20there%20%26%20welcome",
    );
  });

  it("strips formatting characters", () => {
    const link = buildWhatsAppWebLink("91-98000-00001", "hi");
    expect(link).toBe("https://web.whatsapp.com/send?phone=919800000001&text=hi");
  });
});

describe("buildWhatsAppDesktopLink", () => {
  it("builds a whatsapp:// deep link for the desktop app", () => {
    const link = buildWhatsAppDesktopLink("+91 98000 00001", "Hi there & welcome");
    expect(link).toBe(
      "whatsapp://send?phone=919800000001&text=Hi%20there%20%26%20welcome",
    );
  });
});
