"use client";

import { useActionState } from "react";
import { addGuestAction, type FormState } from "../actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function AddGuestForm({ eventId }: { eventId: string }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    addGuestAction,
    null,
  );

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="eventId" value={eventId} />
      <Field label="Name">
        <Input name="name" required placeholder="Guest name" />
      </Field>
      <Field label="Mobile">
        <Input name="mobile" required placeholder="9876543210" />
      </Field>
      <Field label="Group">
        <Input name="groupName" placeholder="Friends / Family / VIP" />
      </Field>
      <Field label="Party size">
        <Input name="partySize" type="number" min={1} defaultValue={1} />
      </Field>
      <Field label="Organisation">
        <Input name="organisation" placeholder="Optional" />
      </Field>
      <Field label="Designation">
        <Input name="designation" placeholder="Optional" />
      </Field>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="isVip" /> VIP guest
      </label>
      <div className="flex items-end gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Adding..." : "Add guest"}
        </Button>
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state?.success && (
          <span className="text-sm text-green-600">{state.success}</span>
        )}
      </div>
    </form>
  );
}
