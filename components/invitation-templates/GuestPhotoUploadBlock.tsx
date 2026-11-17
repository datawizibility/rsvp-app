"use client";

import { useActionState } from "react";
import {
  uploadGuestPhotoAction,
  type GalleryState,
} from "@/lib/actions/gallery";

const styles = {
  royal: {
    input:
      "mx-auto block w-full max-w-xs text-sm text-amber-100 file:mr-3 file:rounded-md file:border-0 file:bg-amber-400 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-[#1a0f0a]",
    button:
      "mx-auto block rounded-lg bg-amber-400 px-6 py-2 text-sm font-semibold text-[#1a0f0a] disabled:opacity-50",
    error: "text-center text-xs text-red-300",
    success: "text-center text-xs text-green-300",
  },
  minimal: {
    input:
      "mx-auto block w-full max-w-xs text-sm text-slate-600 file:mr-3 file:rounded-md file:border-0 file:bg-slate-900 file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-white",
    button:
      "mx-auto block rounded-lg bg-slate-900 px-6 py-2 text-sm font-semibold text-white disabled:opacity-50",
    error: "text-center text-xs text-red-600",
    success: "text-center text-xs text-green-600",
  },
} as const;

export function GuestPhotoUploadBlock({
  variant,
  eventSlug,
  guestToken,
}: {
  variant: "royal" | "minimal";
  eventSlug: string;
  guestToken: string;
}) {
  const [state, formAction, pending] = useActionState<GalleryState, FormData>(
    uploadGuestPhotoAction,
    null,
  );
  const s = styles[variant];

  return (
    <form action={formAction} className="mt-4 space-y-3">
      <input type="hidden" name="eventSlug" value={eventSlug} />
      <input type="hidden" name="guestToken" value={guestToken} />
      <input type="file" name="photo" accept="image/*" required className={s.input} />
      <button type="submit" disabled={pending} className={s.button}>
        {pending ? "Uploading..." : "Share photo"}
      </button>
      {state?.error && <p className={s.error}>{state.error}</p>}
      {state?.success && <p className={s.success}>{state.success}</p>}
    </form>
  );
}
