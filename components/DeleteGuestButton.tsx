"use client";

import { deleteGuestAction } from "@/app/(dashboard)/events/[eventId]/actions";

export function DeleteGuestButton({
  eventId,
  guestId,
  guestName,
}: {
  eventId: string;
  guestId: string;
  guestName: string;
}) {
  return (
    <form
      action={deleteGuestAction}
      onSubmit={(event) => {
        if (
          !window.confirm(
            `Remove ${guestName} from this event? The contact stays in your workspace.`,
          )
        ) {
          event.preventDefault();
        }
      }}
    >
      <input type="hidden" name="eventId" value={eventId} />
      <input type="hidden" name="guestId" value={guestId} />
      <button
        type="submit"
        className="rounded-lg bg-white px-4 py-2 text-sm font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-50"
      >
        Delete guest
      </button>
    </form>
  );
}
