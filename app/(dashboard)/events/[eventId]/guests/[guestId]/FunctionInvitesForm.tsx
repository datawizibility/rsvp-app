import { updateGuestInvitesAction } from "../../actions";
import { Button } from "@/components/ui/Button";

export function FunctionInvitesForm({
  eventId,
  guestId,
  functions,
  invitedFunctionIds,
}: {
  eventId: string;
  guestId: string;
  functions: { id: string; name: string; date: string }[];
  invitedFunctionIds: string[];
}) {
  const hasInvites = invitedFunctionIds.length > 0;

  return (
    <form action={updateGuestInvitesAction} className="space-y-3">
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="guestId" value={guestId} />

      <div className="grid gap-2 sm:grid-cols-2">
        {functions.map((fn) => (
          <label
            key={fn.id}
            className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <input
              type="checkbox"
              name="invitedFunctions"
              value={fn.id}
              defaultChecked={invitedFunctionIds.includes(fn.id)}
            />
            <span>
              {fn.name} <span className="text-xs text-slate-400">{fn.date}</span>
            </span>
          </label>
        ))}
      </div>

      <p className="text-xs text-slate-500">
        {hasInvites
          ? "This guest only sees and can only RSVP to the checked functions — on their invitation and RSVP form."
          : "No restrictions: this guest sees every function. Check specific functions to restrict their invitation."}
      </p>

      <Button type="submit" variant="secondary">
        Save invitations
      </Button>
    </form>
  );
}
