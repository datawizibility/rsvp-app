"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Field } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import { InvitationRenderer, type InvitationView } from "@/components/invitation-templates/InvitationRenderer";
import type { InvitationContent, InvitationSections } from "@/lib/services/invitation";
import {
  publishInvitationAction,
  saveInvitationAction,
  type FormState,
} from "./actions";

const SECTION_LABELS: { key: keyof InvitationSections; label: string }[] = [
  { key: "welcome", label: "Welcome" },
  { key: "about", label: "About" },
  { key: "functions", label: "Functions" },
  { key: "gallery", label: "Gallery" },
  { key: "venue", label: "Venue" },
  { key: "directions", label: "Directions" },
  { key: "dressCode", label: "Dress code" },
  { key: "accommodation", label: "Accommodation" },
  { key: "travel", label: "Travel" },
  { key: "rsvp", label: "RSVP" },
  { key: "contact", label: "Contact" },
  { key: "giftRegistry", label: "Gift registry" },
  { key: "agenda", label: "Agenda" },
];

export function InvitationEditor({
  eventId,
  eventSlug,
  origin,
  published,
  initial,
  eventView,
}: {
  eventId: string;
  eventSlug: string;
  origin: string;
  published: boolean;
  initial: {
    templateKey: string;
    content: InvitationContent;
    sections: InvitationSections;
    coverImageUrl: string | null;
    media: { url: string; type: string }[];
  };
  eventView: Omit<InvitationView, "content" | "sections" | "media" | "coverImageUrl">;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveInvitationAction,
    null,
  );

  const [templateKey, setTemplateKey] = useState(initial.templateKey);
  const [content, setContent] = useState<InvitationContent>(initial.content);
  const [sections, setSections] = useState<InvitationSections>(initial.sections);
  const [coverImageUrl, setCoverImageUrl] = useState(initial.coverImageUrl);
  const [media, setMedia] = useState(initial.media);
  const [uploading, setUploading] = useState(false);

  const setContentField = (key: keyof InvitationContent, value: string) =>
    setContent((prev) => ({ ...prev, [key]: value }));

  async function uploadFile(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    if (!res.ok) return null;
    const data = (await res.json()) as { url: string };
    return data.url;
  }

  async function onCoverChange(file: File) {
    setUploading(true);
    const url = await uploadFile(file);
    if (url) setCoverImageUrl(url);
    setUploading(false);
  }

  async function onGalleryChange(file: File) {
    setUploading(true);
    const url = await uploadFile(file);
    if (url) setMedia((prev) => [...prev, { url, type: "image" }]);
    setUploading(false);
  }

  const previewView: InvitationView = {
    ...eventView,
    content,
    sections,
    media,
    coverImageUrl,
    rsvpUrl: "#",
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div className="space-y-4">
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="templateKey" value={templateKey} />
          <input type="hidden" name="coverImageUrl" value={coverImageUrl ?? ""} />
          <input type="hidden" name="media" value={JSON.stringify(media)} />

          <Card>
            <Field label="Template">
              <select
                value={templateKey}
                onChange={(e) => setTemplateKey(e.target.value)}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="royal">Royal</option>
                <option value="minimal">Minimal</option>
              </select>
            </Field>
          </Card>

          <Card className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Content</p>
            <Field label="Headline">
              <Input
                name="headline"
                value={content.headline}
                onChange={(e) => setContentField("headline", e.target.value)}
                placeholder={eventView.eventName}
              />
            </Field>
            <Field label="Welcome message">
              <Textarea
                name="welcome"
                rows={3}
                value={content.welcome}
                onChange={(e) => setContentField("welcome", e.target.value)}
              />
            </Field>
            <Field label="About / our story">
              <Textarea
                name="about"
                rows={3}
                value={content.about}
                onChange={(e) => setContentField("about", e.target.value)}
              />
            </Field>
            <Field label="Host message">
              <Textarea
                name="hostMessage"
                rows={2}
                value={content.hostMessage}
                onChange={(e) => setContentField("hostMessage", e.target.value)}
              />
            </Field>
            <Field label="Venue note">
              <Input
                name="venueNote"
                value={content.venueNote}
                onChange={(e) => setContentField("venueNote", e.target.value)}
              />
            </Field>
            <Field label="RSVP message">
              <Input
                name="rsvpMessage"
                value={content.rsvpMessage}
                onChange={(e) => setContentField("rsvpMessage", e.target.value)}
              />
            </Field>
          </Card>

          <Card>
            <p className="mb-3 text-sm font-semibold text-slate-900">Sections</p>
            <div className="grid grid-cols-2 gap-2 text-sm">
              {SECTION_LABELS.map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 text-slate-700">
                  <input
                    type="checkbox"
                    name={`section_${key}`}
                    checked={sections[key]}
                    onChange={(e) =>
                      setSections((prev) => ({ ...prev, [key]: e.target.checked }))
                    }
                  />
                  {label}
                </label>
              ))}
            </div>
          </Card>

          <Card className="space-y-3">
            <p className="text-sm font-semibold text-slate-900">Media</p>
            <Field label="Cover image">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) onCoverChange(file);
                }}
                className="block w-full text-sm"
              />
            </Field>
            <Field label="Gallery">
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) => {
                  Array.from(e.target.files ?? []).forEach((f) => onGalleryChange(f));
                }}
                className="block w-full text-sm"
              />
            </Field>
            {uploading && <p className="text-xs text-slate-500">Uploading…</p>}
            {media.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {media.map((m, i) => (
                  <button
                    type="button"
                    key={m.url}
                    onClick={() => setMedia((prev) => prev.filter((_, idx) => idx !== i))}
                    className="rounded border border-slate-200 p-1 text-xs text-red-600"
                  >
                    remove
                  </button>
                ))}
              </div>
            )}
          </Card>

          {state?.error && (
            <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
              {state.error}
            </p>
          )}
          {state?.success && (
            <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
              {state.success}
            </p>
          )}

          <div className="flex items-center gap-3">
            <Button type="submit" disabled={pending}>
              {pending ? "Saving..." : "Save invitation"}
            </Button>
          </div>
        </form>

        <Card>
          <p className="text-sm font-semibold text-slate-900">Publish</p>
          <p className="mt-1 text-xs text-slate-500">
            {published
              ? "Published. Guests can open their personal links."
              : "Not published yet. Publish to make guest links live."}
          </p>
          <p className="mt-2 break-all text-xs text-slate-600">
            Guest link format: {origin}/e/{eventSlug}/&lt;guest-token&gt;
          </p>
          <form action={publishInvitationAction} className="mt-3">
            <input type="hidden" name="eventId" value={eventId} />
            <Button type="submit" variant={published ? "secondary" : "primary"}>
              {published ? "Re-publish" : "Publish invitation"}
            </Button>
          </form>
        </Card>
      </div>

      <div className="lg:sticky lg:top-6 lg:self-start">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          Live preview
        </p>
        <div className="mx-auto max-w-sm overflow-hidden rounded-2xl border border-slate-300 shadow-lg">
          <InvitationRenderer templateKey={templateKey} view={previewView} />
        </div>
      </div>
    </div>
  );
}
