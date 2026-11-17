"use client";

import { useActionState } from "react";
import { recordManualRsvpAction, type FormState } from "../../actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Card";
import { Input, Select } from "@/components/ui/Input";

type FunctionOption = { id: string; name: string; date: string };

export function ManualRsvpForm({
  eventId,
  guestId,
  functions,
  initial,
  hasRsvp,
}: {
  eventId: string;
  guestId: string;
  functions: FunctionOption[];
  initial: {
    status: "yes" | "maybe" | "no" | null;
    adultCount: number;
    childCount: number;
    attendingFunctionIds: string[];
    dietaryPreference: string | null;
    accommodationRequired: boolean;
    travelRequired: boolean;
    message: string;
    travelArrival: string | null;
    travelDeparture: string | null;
    travelFlightNumber: string | null;
    travelTravellers: number | null;
    travelPickup: boolean;
    travelDrop: boolean;
    travelNotes: string;
  };
  hasRsvp: boolean;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    recordManualRsvpAction,
    null,
  );

  return (
    <form action={formAction} className="grid gap-3 sm:grid-cols-2">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="guestId" value={guestId} />

      <Field label="Status">
        <Select name="status" defaultValue={initial.status ?? "yes"}>
          <option value="yes">Yes, attending</option>
          <option value="maybe">Maybe</option>
          <option value="no">Not attending</option>
        </Select>
      </Field>

      <Field label="Dietary preference">
        <Select name="dietaryPreference" defaultValue={initial.dietaryPreference ?? ""}>
          <option value="">—</option>
          <option value="veg">Veg</option>
          <option value="nonveg">Non-veg</option>
          <option value="jain">Jain</option>
          <option value="other">Other</option>
        </Select>
      </Field>

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

      <div className="sm:col-span-2">
        <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-500">
          Functions attending
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          {functions.map((fn) => (
            <label key={fn.id} className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                name="functions"
                value={fn.id}
                defaultChecked={initial.attendingFunctionIds.includes(fn.id)}
              />
              {fn.name}
              <span className="text-xs text-slate-400">{fn.date}</span>
            </label>
          ))}
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="accommodationRequired"
          defaultChecked={initial.accommodationRequired}
        />{" "}
        Needs accommodation
      </label>
      <label className="flex items-center gap-2 text-sm text-slate-700">
        <input
          type="checkbox"
          name="travelRequired"
          defaultChecked={initial.travelRequired}
        />{" "}
        Needs travel assistance
      </label>

      <div className="sm:col-span-2">
        <Field label="Note (e.g. confirmed over call on 14 Nov)">
          <Input name="message" defaultValue={initial.message} />
        </Field>
      </div>

      <div className="sm:col-span-2 space-y-3 rounded-xl bg-slate-50 p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
          Travel details
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Arrival date &amp; time">
            <Input
              name="travelArrival"
              type="datetime-local"
              defaultValue={initial.travelArrival ?? ""}
            />
          </Field>
          <Field label="Departure date &amp; time">
            <Input
              name="travelDeparture"
              type="datetime-local"
              defaultValue={initial.travelDeparture ?? ""}
            />
          </Field>
          <Field label="Flight / train number">
            <Input name="travelFlightNumber" defaultValue={initial.travelFlightNumber ?? ""} />
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
              defaultChecked={initial.travelPickup}
            />{" "}
            Needs pickup
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="travelDrop" defaultChecked={initial.travelDrop} />{" "}
            Needs drop back
          </label>
        </div>
        <Field label="Travel notes">
          <Input name="travelNotes" defaultValue={initial.travelNotes} />
        </Field>
      </div>

      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : hasRsvp ? "Update RSVP" : "Record RSVP"}
        </Button>
        {state?.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state?.success && (
          <span className="text-sm text-green-600">{state.success}</span>
        )}
      </div>
    </form>
  );
}
