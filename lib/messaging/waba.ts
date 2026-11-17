import type { Round } from "@/lib/services/messaging";

/**
 * WhatsApp Business Cloud API groundwork.
 *
 * Configure these environment variables to switch from manual (deep-link)
 * sending to officially sanctioned API sending:
 *
 *   WHATSAPP_BUSINESS_TOKEN     permanent access token from a Meta app
 *   WHATSAPP_PHONE_NUMBER_ID    the WhatsApp business phone number id
 *   WHATSAPP_TEMPLATE_INVITE    approved template name for invitations
 *   WHATSAPP_TEMPLATE_REMINDER  approved template name for reminders
 *   WHATSAPP_TEMPLATE_LANG      template language code (default: en)
 *
 * Until then, the manual WhatsApp App/Web sender keeps working unchanged.
 * See README "WhatsApp Business API" for the setup walk-through.
 */

const GRAPH_VERSION = "v21.0";

export function isWabaConfigured(): boolean {
  return Boolean(
    process.env.WHATSAPP_BUSINESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID,
  );
}

export function wabaTemplateName(round: Round): string | null {
  const name =
    round === "invite"
      ? (process.env.WHATSAPP_TEMPLATE_INVITE ?? DEFAULT_WABA_INVITE)
      : (process.env.WHATSAPP_TEMPLATE_REMINDER ?? DEFAULT_WABA_REMINDER);
  return name || null;
}

const DEFAULT_WABA_INVITE = "rsvp_invite";
const DEFAULT_WABA_REMINDER = "rsvp_reminder";

/** Fallback bodies if no dedicated template text env is provided. */
export function wabaTemplateBodyText(
  round: Round,
  renderedMessage: string,
): string {
  const fromEnv =
    round === "invite"
      ? process.env.WHATSAPP_TEMPLATE_INVITE_BODY
      : process.env.WHATSAPP_TEMPLATE_REMINDER_BODY;
  return fromEnv?.trim() ? fromEnv : renderedMessage;
}

export type WabaSendResult =
  | { ok: true; messageId: string }
  | { ok: false; error: string };

export async function sendWabaTemplateMessage(
  to: string,
  templateName: string,
  bodyText: string,
): Promise<WabaSendResult> {
  const token = process.env.WHATSAPP_BUSINESS_TOKEN;
  const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
  if (!token || !phoneNumberId) {
    return { ok: false, error: "WhatsApp Business API is not configured." };
  }

  const url = `https://graph.facebook.com/${GRAPH_VERSION}/${phoneNumberId}/messages`;
  const payload = {
    messaging_product: "whatsapp",
    recipient_type: "individual",
    to: to.replace(/\D/g, ""),
    type: "template",
    template: {
      name: templateName,
      language: { code: process.env.WHATSAPP_TEMPLATE_LANG ?? "en" },
      components: [
        {
          type: "body",
          parameters: [{ type: "text", text: bodyText }],
        },
      ],
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000),
    });

    const body = (await response.json()) as {
      messages?: { id: string }[];
      error?: { message?: string; code?: number };
    };

    if (!response.ok || body.error) {
      return {
        ok: false,
        error: body.error?.message ?? `Graph API returned ${response.status}`,
      };
    }

    const messageId = body.messages?.[0]?.id;
    if (!messageId) {
      return { ok: false, error: "Graph API returned no message id." };
    }
    return { ok: true, messageId };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Network error",
    };
  }
}
