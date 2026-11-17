"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { renderMessage } from "@/lib/messaging/templates";
import {
  buildWhatsAppDesktopLink,
  buildWhatsAppLink,
  buildWhatsAppWebLink,
} from "@/lib/messaging/whatsapp";
import { matchesFilter, type RecipientFilter } from "@/lib/services/recipientFilter";
import type { Round } from "@/lib/services/messaging";
import { markSentAction, sendWabaAction } from "./actions";

type WhatsAppMode = "default" | "desktop" | "web";
type Channel = "manual" | "api";
const MODE_STORAGE_KEY = "rsvp_whatsapp_mode";

const modeListeners = new Set<() => void>();

function subscribeMode(callback: () => void) {
  modeListeners.add(callback);
  return () => {
    modeListeners.delete(callback);
  };
}

function getModeSnapshot(): WhatsAppMode {
  try {
    const stored = window.localStorage.getItem(MODE_STORAGE_KEY);
    return stored === "desktop" || stored === "web" ? stored : "default";
  } catch {
    return "default";
  }
}

function getModeServerSnapshot(): WhatsAppMode {
  return "default";
}

function setStoredMode(next: WhatsAppMode) {
  try {
    window.localStorage.setItem(MODE_STORAGE_KEY, next);
  } catch {
    /* storage unavailable; in-memory only */
  }
  modeListeners.forEach((listener) => listener());
}

export type QueueGuest = {
  id: string;
  name: string;
  mobileNormalized: string;
  groupId: string | null;
  groupName: string | null;
  lastInvitedAt: string | null;
  lastRemindedAt: string | null;
  rsvpStatus: "yes" | "maybe" | "no" | null;
  firstOpenedAt: string | null;
  link: string;
};

const FILTERS: { value: RecipientFilter; label: string }[] = [
  { value: "all", label: "All guests" },
  { value: "not_sent", label: "Not yet sent" },
  { value: "non_responders", label: "Non-responders" },
  { value: "not_opened", label: "Not yet opened" },
  { value: "group", label: "A specific group" },
];

export function SendQueue({
  eventId,
  eventName,
  eventDate,
  inviteTemplate,
  reminderTemplate,
  guests,
  groups,
  wabaConfigured,
}: {
  eventId: string;
  eventName: string;
  eventDate: string;
  inviteTemplate: string;
  reminderTemplate: string;
  guests: QueueGuest[];
  groups: { id: string; name: string }[];
  wabaConfigured: boolean;
}) {
  const [round, setRound] = useState<Round>("invite");
  const [filter, setFilter] = useState<RecipientFilter>("all");
  const [groupId, setGroupId] = useState<string>(groups[0]?.id ?? "");
  const [index, setIndex] = useState(0);
  const [channel, setChannel] = useState<Channel>("manual");
  const [apiState, setApiState] = useState<{ error?: string; success?: string } | null>(
    null,
  );
  const [apiPending, setApiPending] = useState(false);
  const mode = useSyncExternalStore(
    subscribeMode,
    getModeSnapshot,
    getModeServerSnapshot,
  );

  const list = useMemo(
    () =>
      guests.filter((guest) =>
        matchesFilter(
          {
            groupId: guest.groupId,
            lastSentAtForRound:
              round === "invite"
                ? guest.lastInvitedAt
                  ? new Date(guest.lastInvitedAt)
                  : null
                : guest.lastRemindedAt
                  ? new Date(guest.lastRemindedAt)
                  : null,
            rsvpStatus: guest.rsvpStatus,
            firstOpenedAt: guest.firstOpenedAt ? new Date(guest.firstOpenedAt) : null,
          },
          filter,
          filter === "group" ? groupId : null,
        ),
      ),
    [guests, round, filter, groupId],
  );

  const current = list[index];

  function reset(next: Partial<{ round: Round; filter: RecipientFilter }> = {}) {
    if (next.round) setRound(next.round);
    if (next.filter) setFilter(next.filter);
    setIndex(0);
  }

  const controls = (
    <Card className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      <label className="text-sm">
        <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
          Round
        </span>
        <select
          value={round}
          onChange={(e) => reset({ round: e.target.value as Round })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="invite">Invitation</option>
          <option value="reminder">Reminder</option>
        </select>
      </label>
      <label className="text-sm">
        <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
          Recipients
        </span>
        <select
          value={filter}
          onChange={(e) => reset({ filter: e.target.value as RecipientFilter })}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          {FILTERS.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      {filter === "group" && (
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Group
          </span>
          <select
            value={groupId}
            onChange={(e) => {
              setGroupId(e.target.value);
              setIndex(0);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      )}
      <label className="text-sm">
        <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
          Open in
        </span>
        <select
          value={mode}
          onChange={(e) => setStoredMode(e.target.value as WhatsAppMode)}
          className="w-full rounded-lg border border-slate-300 px-3 py-2"
        >
          <option value="default">WhatsApp app (default)</option>
          <option value="desktop">WhatsApp Desktop — fastest</option>
          <option value="web">WhatsApp Web (browser)</option>
        </select>
      </label>
      {wabaConfigured && (
        <label className="text-sm">
          <span className="mb-1 block text-xs uppercase tracking-wide text-slate-500">
            Channel
          </span>
          <select
            value={channel}
            onChange={(e) => {
              setChannel(e.target.value as Channel);
              setApiState(null);
              setIndex(0);
            }}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
          >
            <option value="manual">Manual (open WhatsApp)</option>
            <option value="api">Business API (auto-send)</option>
          </select>
        </label>
      )}
    </Card>
  );

  if (list.length === 0) {
    return (
      <div className="space-y-4">
        {controls}
        <Card>
          <p className="text-sm text-slate-500">No guests match this filter.</p>
        </Card>
      </div>
    );
  }

  if (!current) {
    return (
      <div className="space-y-4">
        {controls}
        <Card>
          <h3 className="text-lg font-semibold text-slate-900">
            Round complete — {list.length} sent
          </h3>
          <p className="mt-1 text-sm text-slate-500">
            Everyone matching this filter has been messaged.
          </p>
          <div className="mt-4">
            <Button variant="secondary" onClick={() => setIndex(0)}>
              Start this filter again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  const template = round === "invite" ? inviteTemplate : reminderTemplate;
  const message = renderMessage(template, {
    name: current.name,
    event: eventName,
    date: eventDate,
    link: current.link,
  });
  const waLink =
    mode === "web"
      ? buildWhatsAppWebLink(current.mobileNormalized, message)
      : mode === "desktop"
        ? buildWhatsAppDesktopLink(current.mobileNormalized, message)
        : buildWhatsAppLink(current.mobileNormalized, message);

  async function openAndMark() {
    // Reuse a single named window so we don't spawn a new WhatsApp tab per guest.
    window.open(
      waLink,
      "rsvp_whatsapp_sender",
      "width=480,height=820,left=40,top=60",
    );
    if (current) await markSentAction(eventId, current.id, round);
    setIndex((i) => i + 1);
  }

  async function sendViaApi() {
    if (!current) return;
    setApiPending(true);
    setApiState(null);
    try {
      const result = await sendWabaAction(eventId, current.id, round);
      if (result?.error) {
        setApiState({ error: result.error });
      } else {
        setApiState({ success: result?.success ?? "Sent." });
        setIndex((i) => i + 1);
      }
    } finally {
      setApiPending(false);
    }
  }

  const isApi = wabaConfigured && channel === "api";

  return (
    <div className="space-y-4">
      {controls}
      <Card>
        <div className="flex items-center justify-between">
          <p className="text-xs uppercase tracking-wide text-slate-500">
            {index + 1} of {list.length}
          </p>
          {current.groupName && (
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
              {current.groupName}
            </span>
          )}
        </div>

        <h3 className="mt-2 text-xl font-semibold text-slate-900">{current.name}</h3>
        <p className="text-sm text-slate-500">{current.mobileNormalized}</p>

        <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
          {message}
        </pre>

        <div className="mt-4 flex items-center gap-3">
          {isApi ? (
            <>
              <Button onClick={sendViaApi} disabled={apiPending}>
                {apiPending ? "Sending..." : "Send via Business API"}
              </Button>
              <Button variant="secondary" onClick={() => setIndex((i) => i + 1)} disabled={apiPending}>
                Skip
              </Button>
            </>
          ) : (
            <>
              <Button onClick={openAndMark}>Open WhatsApp</Button>
              <Button variant="secondary" onClick={() => setIndex((i) => i + 1)}>
                Skip
              </Button>
            </>
          )}
        </div>
        {isApi && apiState?.error && (
          <p className="mt-3 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {apiState.error}
          </p>
        )}
        {isApi && apiState?.success && (
          <p className="mt-3 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
            {apiState.success}
          </p>
        )}
        <p className="mt-3 text-xs text-slate-400">
          {isApi
            ? "Messages go out through the WhatsApp Business Cloud API using your approved template — no ban risk from automation."
            : "WhatsApp opens in a small window that is reused for every guest — keep it open and just send, then click Open WhatsApp for the next person here."}
        </p>
      </Card>
    </div>
  );
}
