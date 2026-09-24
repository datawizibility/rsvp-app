"use client";

import { useActionState } from "react";
import { createFunctionAction, type FormState } from "../actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function FunctionForm({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createFunctionAction,
    null,
  );

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="eventId" value={eventId} />
      <Field label="Function name">
        <Input name="name" required placeholder="Mehendi / Sangeet / Wedding" />
      </Field>
      <Field label="Date">
        <Input name="date" type="date" required />
      </Field>
      <Field label="Start time">
        <Input name="startTime" type="time" />
      </Field>
      <Field label="End time">
        <Input name="endTime" type="time" />
      </Field>
      <Field label="Venue">
        <Input name="venueName" placeholder="ITC Royal Bengal" />
      </Field>
      <Field label="Dress code">
        <Input name="dressCode" placeholder="Traditional" />
      </Field>
      <Field label="Capacity">
        <Input name="capacity" type="number" min={0} placeholder="Optional" />
      </Field>
      <label className="flex items-center gap-2 self-end text-sm text-slate-700">
        <input type="checkbox" name="rsvpRequired" defaultChecked /> RSVP required
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
          {pending ? "Adding..." : "Add function"}
        </Button>
      </div>
    </form>
  );
}
