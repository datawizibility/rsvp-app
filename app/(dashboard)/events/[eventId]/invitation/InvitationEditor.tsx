"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card, Field } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
import {
  InvitationRenderer,
  type InvitationView,
} from "@/components/invitation-templates/InvitationRenderer";
import type {
  InvitationContent,
  InvitationSections,
} from "@/lib/services/invitation";
import { saveInvitationAction, type FormState } from "./actions";

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

type MediaItem = { url: string; type: string };

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
    media: MediaItem[];
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
  const [media, setMedia] = useState<MediaItem[]>(initial.media);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const setContentField = (key: keyof InvitationContent, value: string) =>
    setContent((prev) => ({ ...prev, [key]: value }));

  async function uploadFile(file: File): Promise<string> {
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = (await res.json().catch(() => ({}))) as {
      url?: string;
      error?: string;
    };
    if (!res.ok || !data.url) {
      throw new Error(data.error ?? "Upload failed. Please try again.");
    }
    return data.url;
  }

  async function onCoverChange(file: File) {
    setUploadError(null);
    setUploading(true);
    try {
      setCoverImageUrl(await uploadFile(file));
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
  }

  async function onGalleryChange(files: File[]) {
    setUploadError(null);
    setUploading(true);
    try {
      for (const file of files) {
        const url = await uploadFile(file);
        const type = file.type.startsWith("video/") ? "video" : "image";
        setMedia((prev) => [...prev, { url, type }]);
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "Upload failed.");
    } finally {
      setUploading(false);
    }
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
            {coverImageUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={coverImageUrl}
                alt="Cover"
                className="h-24 w-full rounded-lg object-cover"
              />
            )}

            <Field label="Gallery (images and videos)">
              <input
                type="file"
                accept="image/*,video/*"
                multiple
                onChange={(e) => {
                  onGalleryChange(Array.from(e.target.files ?? []));
                  e.target.value = "";
                }}
                className="block w-full text-sm"
              />
            </Field>

            {uploading && <p className="text-xs text-slate-500">Uploading…</p>}
            {uploadError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                {uploadError}
              </p>
            )}

            {media.length > 0 && (
              <div className="grid grid-cols-3 gap-2">
                {media.map((m, index) => (
                  <div key={m.url} className="relative">
                    {m.type === "video" ? (
                      <video
                        src={m.url}
                        className="aspect-square w-full rounded object-cover"
                      />
                    ) : (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.url}
                        alt=""
                        className="aspect-square w-full rounded object-cover"
                      />
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        setMedia((prev) => prev.filter((_, i) => i !== index))
                      }
                      className="absolute right-1 top-1 rounded bg-black/70 px-2 py-0.5 text-xs text-white"
                    >
                      ✕
                    </button>
                  </div>
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

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="submit"
              name="intent"
              value="save"
              variant="secondary"
              disabled={pending || uploading}
            >
              {pending ? "Saving..." : "Save"}
            </Button>
            <Button
              type="submit"
              name="intent"
              value="publish"
              disabled={pending || uploading}
            >
              {pending ? "Publishing..." : "Save & publish"}
            </Button>
            <span className="text-xs text-slate-500">
              &ldquo;Save &amp; publish&rdquo; saves your changes and makes guest
              links live.
            </span>
          </div>
        </form>

        <Card>
          <p className="text-sm font-semibold text-slate-900">Status</p>
          <p className="mt-1 text-xs text-slate-500">
            {published
              ? "Published. Guests can open their personal links."
              : "Not published yet. Use “Save & publish” above to make guest links live."}
          </p>
          <p className="mt-2 break-all text-xs text-slate-600">
            Guest link format: {origin}/e/{eventSlug}/&lt;guest-token&gt;
          </p>
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
