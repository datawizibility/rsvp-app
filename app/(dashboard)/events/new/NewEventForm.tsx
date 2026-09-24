"use client";

import { useActionState } from "react";
import { createEventAction, type FormState } from "../../actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";

const EVENT_TYPES = [
  "wedding",
  "birthday",
  "corporate",
  "investor",
  "conference",
  "party",
  "religious",
  "other",
];

export function NewEventForm() {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    createEventAction,
    null,
  );

  return (
    <form action={formAction} className="grid gap-4 sm:grid-cols-2">
      <Field label="Event name" className="sm:col-span-2">
        <Input name="name" required placeholder="Rahul & Neha Wedding" />
      </Field>
      <Field label="Event type">
        <Select name="type" defaultValue="wedding" required>
          {EVENT_TYPES.map((type) => (
            <option key={type} value={type}>
              {type[0].toUpperCase() + type.slice(1)}
            </option>
          ))}
        </Select>
      </Field>
      <Field label="City">
        <Input name="city" placeholder="Kolkata" />
      </Field>
      <Field label="Start date">
        <Input name="startDate" type="date" required />
      </Field>
      <Field label="End date">
        <Input name="endDate" type="date" />
      </Field>
      <Field label="Location / venue">
        <Input name="locationName" placeholder="ITC Royal Bengal" />
      </Field>
      <Field label="Host name">
        <Input name="hostName" placeholder="Sharma Family" />
      </Field>
      <Field label="Contact number">
        <Input name="contactNumber" placeholder="9876543210" />
      </Field>

      {state?.error && (
        <p className="sm:col-span-2 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {state.error}
        </p>
      )}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Creating..." : "Create event"}
        </Button>
      </div>
    </form>
  );
}
