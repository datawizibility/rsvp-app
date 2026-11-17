import Link from "next/link";
import { revalidatePath } from "next/cache";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { requireUserId } from "@/lib/session";
import {
  deleteGalleryItem,
  listGalleryForOrganizer,
  setGalleryItemApproved,
} from "@/lib/services/gallery";

export const dynamic = "force-dynamic";

async function moderateAction(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  const eventId = String(formData.get("eventId"));
  const itemId = String(formData.get("itemId"));
  const approved = formData.get("approved") === "true";
  await setGalleryItemApproved(userId, eventId, itemId, approved);
  revalidatePath(`/events/${eventId}/gallery`);
}

async function removeAction(formData: FormData) {
  "use server";
  const userId = await requireUserId();
  const eventId = String(formData.get("eventId"));
  const itemId = String(formData.get("itemId"));
  await deleteGalleryItem(userId, eventId, itemId);
  revalidatePath(`/events/${eventId}/gallery`);
}

export default async function GalleryPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;
  const userId = await requireUserId();
  const items = await listGalleryForOrganizer(userId, eventId);

  const pending = items.filter((item) => !item.approved);
  const approved = items.filter((item) => item.approved);

  return (
    <div className="space-y-6">
      <Link href={`/events/${eventId}`} className="text-sm text-slate-500 underline">
        ← Back to event
      </Link>

      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Guest gallery</h1>
        <p className="mt-1 text-sm text-slate-500">
          Photos guests shared from their invitation links. Approved photos
          appear on every guest&apos;s invitation.
        </p>
      </div>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          Awaiting approval ({pending.length})
        </h3>
        {pending.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            Nothing waiting. New uploads will appear here.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {pending.map((item) => (
              <GalleryItemCard
                key={item.id}
                eventId={eventId}
                item={item}
                moderateAction={moderateAction}
                deleteAction={removeAction}
              />
            ))}
          </div>
        )}
      </Card>

      <Card>
        <h3 className="mb-3 text-sm font-semibold text-slate-900">
          In the shared album ({approved.length})
        </h3>
        {approved.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">
            No approved photos yet.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {approved.map((item) => (
              <GalleryItemCard
                key={item.id}
                eventId={eventId}
                item={item}
                moderateAction={moderateAction}
                deleteAction={removeAction}
              />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}

function GalleryItemCard({
  eventId,
  item,
  moderateAction,
  deleteAction,
}: {
  eventId: string;
  item: Awaited<ReturnType<typeof listGalleryForOrganizer>>[number];
  moderateAction: (formData: FormData) => Promise<void>;
  deleteAction: (formData: FormData) => Promise<void>;
}) {
  return (
    <div className="rounded-lg border border-slate-200 p-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={item.url}
        alt={item.guestName ? `Shared by ${item.guestName}` : "Guest photo"}
        className="aspect-square w-full rounded object-cover"
      />
      <p className="mt-2 truncate text-xs text-slate-500">
        {item.guestName ?? "Guest"} ·{" "}
        {item.createdAt.toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
        })}
      </p>
      <div className="mt-2 flex gap-2">
        <form action={moderateAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="itemId" value={item.id} />
          <input
            type="hidden"
            name="approved"
            value={item.approved ? "false" : "true"}
          />
          <Button type="submit" variant={item.approved ? "secondary" : "primary"} className="!px-3 !py-1 text-xs">
            {item.approved ? "Hide" : "Approve"}
          </Button>
        </form>
        <form action={deleteAction}>
          <input type="hidden" name="eventId" value={eventId} />
          <input type="hidden" name="itemId" value={item.id} />
          <Button type="submit" variant="danger" className="!px-3 !py-1 text-xs">
            Delete
          </Button>
        </form>
      </div>
    </div>
  );
}
