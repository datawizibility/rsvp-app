export type TemplateVars = {
  name: string;
  event: string;
  date: string;
  link: string;
};

export const DEFAULT_INVITE_TEMPLATE =
  "Hi {name}, you're invited to {event} on {date}. Here's your personal invitation: {link}";

export const DEFAULT_REMINDER_TEMPLATE =
  "Hi {name}, a gentle reminder about {event} on {date}. Please confirm your attendance here: {link}";

const KEY_PATTERN = /\{\s*(name|event|date|link)\s*\}/gi;

export function renderMessage(template: string, vars: TemplateVars): string {
  return template.replace(KEY_PATTERN, (match, rawKey: string) => {
    const key = rawKey.toLowerCase() as keyof TemplateVars;
    const value = (vars[key] ?? "").trim();
    if (key === "name" && value === "") return "there";
    return value;
  });
}
