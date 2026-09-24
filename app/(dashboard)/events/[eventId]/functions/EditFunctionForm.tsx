"use client";

import { useActionState } from "react";
import { updateFunctionAction, type FormState } from "../actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function EditFunctionForm({
  eventId,
  functionId,
  initial,
}: {
  eventId: string;
  functionId: string;
  initial: {
    name: string;
    date: string;
    startTime: string;
    endTime: string;
    venueName: string;
    venueAddress: string;
    description: string;
    dressCode: string;
    capacity: string;
    rsvpRequired: boolean;
  };
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateFunctionAction,
    null,
  );

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="functionId" value={functionId} />
      <Field label="Function name">
        <Input name="name" required defaultValue={initial.name} />
      </Field>
      <Field label="Date">
        <Input name="date" type="date" required defaultValue={initial.date} />
      </Field>
      <Field label="Start time">
        <Input name="startTime" type="time" defaultValue={initial.startTime} />
      </Field>
      <Field label="End time">
        <Input name="endTime" type="time" defaultValue={initial.endTime} />
      </Field>
      <Field label="Venue">
        <Input name="venueName" defaultValue={initial.venueName} />
      </Field>
      <Field label="Dress code">
        <Input name="dressCode" defaultValue={initial.dressCode} />
      </Field>
      <Field label="Capacity">
        <Input name="capacity" type="number" min={0} defaultValue={initial.capacity} />
      </Field>
      <label className="flex items-center gap-2 self-end text-sm text-slate-700">
        <input
          type="checkbox"
          name="rsvpRequired"
          defaultChecked={initial.rsvpRequired}
        />{" "}
        RSVP required
      </label>

      {state?.error && (
        <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}
      {state?.success && (
        <p className="sm:col-span-2 rounded-lg bg-green-50 px-3 py-2 text-sm text-green-700">
          {state.success}
        </p>
      )}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save function"}
        </Button>
      </div>
    </form>
  );
}
