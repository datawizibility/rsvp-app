"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";
import { submitRsvpAction, type RsvpState } from "./actions";

type FunctionOption = { id: string; name: string };
type Question = { id: string; label: string; type: string; options: unknown };

export function RsvpForm({
  eventSlug,
  guestToken,
  guestName,
  functions,
  questions,
  initial,
}: {
  eventSlug: string;
  guestToken: string;
  guestName: string;
  functions: FunctionOption[];
  questions: Question[];
  initial: {
    status: string | null;
    adultCount: number;
    childCount: number;
    functionIds: string[];
    dietaryPreference: string | null;
    accommodationRequired: boolean | null;
    travelRequired: boolean | null;
    message: string | null;
    answers: Record<string, string>;
    travelArrival: string | null;
    travelDeparture: string | null;
    travelFlightNumber: string | null;
    travelTravellers: number | null;
    travelPickup: boolean | null;
    travelDrop: boolean | null;
    travelTicketUrl: string | null;
    travelNotes: string | null;
  };
}) {
  const [state, formAction, pending] = useActionState<RsvpState, FormData>(
    submitRsvpAction,
    null,
  );
  const [status, setStatus] = useState(initial.status ?? "yes");

  const toLocalInput = (iso: string | null) => {
    if (!iso) return "";
    const date = new Date(iso);
    if (Number.isNaN(date.getTime())) return "";
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate(),
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="eventSlug" value={eventSlug} />
      <input type="hidden" name="guestToken" value={guestToken} />

      <div>
        <h2 className="text-lg font-semibold text-slate-900">
          Will you join us, {guestName}?
        </h2>
        <div className="mt-3 space-y-2">
          {[
            { value: "yes", label: "Yes, I'll be there" },
            { value: "maybe", label: "Maybe" },
            { value: "no", label: "Sorry, unable to attend" },
          ].map((option) => (
            <label
              key={option.value}
              className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <input
                type="radio"
                name="status"
                value={option.value}
                checked={status === option.value}
                onChange={() => setStatus(option.value)}
              />
              {option.label}
            </label>
          ))}
        </div>
      </div>

      {status === "yes" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Adults">
              <Input
                name="adultCount"
                type="number"
                min={0}
                defaultValue={initial.adultCount}
              />
            </Field>
            <Field label="Children">
              <Input
                name="childCount"
                type="number"
                min={0}
                defaultValue={initial.childCount}
              />
            </Field>
          </div>

          {functions.length > 0 && (
            <div>
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
                Which functions will you attend?
              </p>
              <div className="space-y-2">
                {functions.map((fn) => (
                  <label key={fn.id} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      name="functions"
                      value={fn.id}
                      defaultChecked={initial.functionIds.includes(fn.id)}
                    />
                    {fn.name}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Dietary preference">
              <select
                name="dietaryPreference"
                defaultValue={initial.dietaryPreference ?? ""}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
              >
                <option value="">No preference</option>
                <option value="veg">Vegetarian</option>
                <option value="nonveg">Non-vegetarian</option>
                <option value="jain">Jain</option>
                <option value="other">Other</option>
              </select>
            </Field>
            <div className="flex flex-col justify-end gap-2 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="accommodationRequired"
                  defaultChecked={initial.accommodationRequired ?? false}
                />
                I need accommodation
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="travelRequired"
                  defaultChecked={initial.travelRequired ?? false}
                />
                Travel assistance
              </label>
            </div>
          </div>

          <div className="space-y-3 rounded-xl bg-slate-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
              Travel details
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Arrival date &amp; time">
                <Input
                  name="travelArrival"
                  type="datetime-local"
                  defaultValue={toLocalInput(initial.travelArrival)}
                />
              </Field>
              <Field label="Departure date &amp; time">
                <Input
                  name="travelDeparture"
                  type="datetime-local"
                  defaultValue={toLocalInput(initial.travelDeparture)}
                />
              </Field>
              <Field label="Flight / train number">
                <Input
                  name="travelFlightNumber"
                  defaultValue={initial.travelFlightNumber ?? ""}
                  placeholder="e.g. 6E 234 / 12301 Howrah Exp"
                />
              </Field>
              <Field label="Number of people travelling">
                <Input
                  name="travelTravellers"
                  type="number"
                  min={0}
                  defaultValue={initial.travelTravellers ?? ""}
                />
              </Field>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="travelPickup"
                  defaultChecked={initial.travelPickup ?? false}
                />
                Need airport/station pickup
              </label>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  name="travelDrop"
                  defaultChecked={initial.travelDrop ?? false}
                />
                Need drop back
              </label>
            </div>
            <Field label="Ticket / boarding pass (image or PDF, up to 4 MB)">
              <input
                type="file"
                name="ticket"
                accept="application/pdf,image/*"
                className="w-full text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-white"
              />
              {initial.travelTicketUrl && (
                <a
                  href={initial.travelTicketUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 inline-block text-xs text-slate-600 underline"
                >
                  View previously uploaded ticket
                </a>
              )}
            </Field>
            <Field label="Travel notes (optional)">
              <Textarea
                name="travelNotes"
                rows={2}
                defaultValue={initial.travelNotes ?? ""}
                placeholder="Arrival airport, train name, special requests…"
              />
            </Field>
          </div>
        </>
      )}

      {questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((q) => {
            const name = `q_${q.id}`;
            const value = initial.answers[q.id] ?? "";
            const options = Array.isArray(q.options)
              ? (q.options as string[])
              : [];

            if (q.type === "select" && options.length > 0) {
              return (
                <Field key={q.id} label={q.label}>
                  <Select name={name} defaultValue={value}>
                    <option value="">Select…</option>
                    {options.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </Select>
                </Field>
              );
            }

            if (q.type === "textarea") {
              return (
                <Field key={q.id} label={q.label}>
                  <Textarea name={name} rows={3} defaultValue={value} />
                </Field>
              );
            }

            return (
              <Field key={q.id} label={q.label}>
                <Input name={name} defaultValue={value} />
              </Field>
            );
          })}
        </div>
      )}

      <Field label="Message (optional)">
        <Textarea name="message" rows={2} defaultValue={initial.message ?? ""} />
      </Field>

      {state?.error && (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Submitting..." : "Submit RSVP"}
      </Button>
    </form>
  );
}
