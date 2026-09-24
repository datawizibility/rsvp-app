import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { ConfirmActionButton } from "@/components/ConfirmActionButton";
import { requireUserId } from "@/lib/session";
import { getEventDetail } from "@/lib/services/events";
import { listQuestions } from "@/lib/services/questions";
import { deleteQuestionAction } from "../actions";
import { QuestionForm } from "./QuestionForm";

export const dynamic = "force-dynamic";

const TYPE_LABEL: Record<string, string> = {
  text: "Short text",
  textarea: "Long text",
  select: "Choose one",
};

export default async function QuestionsPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const userId = await requireUserId();
  const event = await getEventDetail(userId, eventId);
  const questions = await listQuestions(userId, eventId);

  return (
    <div className="space-y-6">
      <Link href={`/events/${eventId}`} className="text-sm text-slate-500 underline">
        ← Back to event
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">
          Custom RSVP questions
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Ask guests extra questions when they RSVP for {event.name}.
        </p>
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Add a question
        </h3>
        <QuestionForm eventId={eventId} />
      </Card>

      <Card className="p-0">
        <ul className="divide-y divide-slate-100 text-sm">
          {questions.length === 0 && (
            <li className="px-4 py-6 text-center text-slate-400">
              No custom questions yet.
            </li>
          )}
          {questions.map((question) => {
            const options = Array.isArray(question.options)
              ? (question.options as string[])
              : [];
            return (
              <li key={question.id} className="px-4 py-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-slate-900">{question.label}</p>
                    <p className="text-slate-500">
                      {TYPE_LABEL[question.type] ?? question.type}
                      {options.length > 0 ? ` · ${options.join(", ")}` : ""}
                    </p>
                  </div>
                  <ConfirmActionButton
                    action={deleteQuestionAction}
                    fields={{ eventId, questionId: question.id }}
                    label="Delete"
                    message={`Delete the question "${question.label}"? Answers already collected for it will also be removed.`}
                  />
                </div>

                <details className="mt-2">
                  <summary className="cursor-pointer text-xs text-slate-500">
                    Edit
                  </summary>
                  <div className="mt-3 border-t border-slate-100 pt-3">
                    <QuestionForm
                      eventId={eventId}
                      question={{
                        id: question.id,
                        label: question.label,
                        type: question.type,
                        options,
                      }}
                    />
                  </div>
                </details>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
