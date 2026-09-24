"use client";

import { useActionState, useState } from "react";
import {
  createQuestionAction,
  updateQuestionAction,
  type FormState,
} from "../actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Card";
import { Input, Select, Textarea } from "@/components/ui/Input";

const TYPES = [
  { value: "text", label: "Short text" },
  { value: "textarea", label: "Long text" },
  { value: "select", label: "Choose one (dropdown)" },
];

export function QuestionForm({
  eventId,
  question,
}: {
  eventId: string;
  question?: { id: string; label: string; type: string; options: string[] };
}) {
  const action = question ? updateQuestionAction : createQuestionAction;
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    action,
    null,
  );
  const [type, setType] = useState(question?.type ?? "text");

  return (
    <form action={formAction} className="grid gap-3">
      <input type="hidden" name="eventId" value={eventId} />
      {question && <input type="hidden" name="questionId" value={question.id} />}

      <Field label="Question">
        <Input
          name="label"
          required
          defaultValue={question?.label ?? ""}
          placeholder="Would you like a meeting with management?"
        />
      </Field>

      <Field label="Answer type">
        <Select
          name="type"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
      </Field>

      {type === "select" && (
        <Field label="Options (one per line or comma-separated)">
          <Textarea
            name="options"
            rows={3}
            defaultValue={(question?.options ?? []).join("\n")}
            placeholder={"Veg\nNon-veg\nJain"}
          />
        </Field>
      )}

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

      <div>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving..." : question ? "Save question" : "Add question"}
        </Button>
      </div>
    </form>
  );
}
