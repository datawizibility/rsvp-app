"use client";

import { useActionState } from "react";
import { updateGuestAction, type FormState } from "../../actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export function EditGuestForm({
  eventId,
  guestId,
  initial,
}: {
  eventId: string;
  guestId: string;
  initial: {
    name: string;
    mobile: string;
    email: string;
    organisation: string;
    designation: string;
    city: string;
    groupName: string;
    isVip: boolean;
    partySize: number;
  };
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    updateGuestAction,
    null,
  );

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="guestId" value={guestId} />
      <Field label="Name">
        <Input name="name" required defaultValue={initial.name} />
      </Field>
      <Field label="Mobile">
        <Input name="mobile" required defaultValue={initial.mobile} />
      </Field>
      <Field label="Email">
        <Input name="email" type="email" defaultValue={initial.email} />
      </Field>
      <Field label="Group">
        <Input name="groupName" defaultValue={initial.groupName} placeholder="Friends / Family / VIP" />
      </Field>
      <Field label="Organisation">
        <Input name="organisation" defaultValue={initial.organisation} />
      </Field>
      <Field label="Designation">
        <Input name="designation" defaultValue={initial.designation} />
      </Field>
      <Field label="City">
        <Input name="city" defaultValue={initial.city} />
      </Field>
      <Field label="Party size">
        <Input
          name="partySize"
          type="number"
          min={1}
          defaultValue={initial.partySize}
        />
      </Field>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input type="checkbox" name="isVip" defaultChecked={initial.isVip} /> VIP guest
      </label>

      <div className="flex items-end gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save changes"}
        </Button>
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state?.success && (
          <span className="text-sm text-green-600">{state.success}</span>
        )}
      </div>
    </form>
  );
}
