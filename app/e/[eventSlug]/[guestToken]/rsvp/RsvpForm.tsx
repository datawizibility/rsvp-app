"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Card";
import { Input, Textarea } from "@/components/ui/Input";
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
  };
}) {
  const [state, formAction, pending] = useActionState<RsvpState, FormData>(
    submitRsvpAction,
    null,
  );
  const [status, setStatus] = useState(initial.status ?? "yes");

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
        </>
      )}

      {questions.length > 0 && (
        <div className="space-y-3">
          {questions.map((q) => (
            <Field key={q.id} label={q.label}>
              <Textarea
                name={`q_${q.id}`}
                rows={2}
                defaultValue={initial.answers[q.id] ?? ""}
              />
            </Field>
          ))}
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
