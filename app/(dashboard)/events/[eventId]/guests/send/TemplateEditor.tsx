"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Input";
import { saveTemplatesAction, type FormState } from "./actions";

export function TemplateEditor({
  eventId,
  inviteTemplate,
  reminderTemplate,
}: {
  eventId: string;
  inviteTemplate: string;
  reminderTemplate: string;
}) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    saveTemplatesAction,
    null,
  );

  return (
    <details className="rounded-xl border border-slate-200 bg-white p-4">
      <summary className="cursor-pointer text-sm font-semibold text-slate-900">
        Message templates
      </summary>
      <p className="mt-2 text-xs text-slate-500">
        Use {"{name}"}, {"{event}"}, {"{date}"} and {"{link}"} — they are filled in
        per guest.
      </p>
      <form action={formAction} className="mt-3 space-y-3">
        <input type="hidden" name="eventId" value={eventId} />
        <Field label="Invitation message">
          <Textarea name="inviteTemplate" rows={3} defaultValue={inviteTemplate} />
        </Field>
        <Field label="Reminder message">
          <Textarea name="reminderTemplate" rows={3} defaultValue={reminderTemplate} />
        </Field>
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
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : "Save messages"}
        </Button>
      </form>
    </details>
  );
}
