import { Card } from "@/components/ui/Card";
import { requireUserId } from "@/lib/session";
import { NewEventForm } from "./NewEventForm";

export const dynamic = "force-dynamic";

export default async function NewEventPage() {
  await requireUserId();

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-slate-900">Create an event</h1>
      <Card>
        <NewEventForm />
      </Card>
    </div>
  );
}
