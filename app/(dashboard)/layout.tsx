import Link from "next/link";
import type { ReactNode } from "react";
import { requireUserId } from "@/lib/session";
import { signOutAction } from "./actions";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: ReactNode;
}) {
  await requireUserId();

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl gap-8 px-4 py-6">
      <aside className="hidden w-48 shrink-0 sm:block">
        <Link href="/dashboard" className="block text-lg font-semibold text-slate-900">
          RSVP App
        </Link>
        <nav className="mt-6 space-y-1 text-sm">
          <Link
            href="/dashboard"
            className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
          >
            Dashboard
          </Link>
          <Link
            href="/events/new"
            className="block rounded-lg px-3 py-2 text-slate-700 hover:bg-slate-100"
          >
            New event
          </Link>
        </nav>
        <form action={signOutAction} className="mt-8">
          <button className="text-sm text-slate-500 underline">Sign out</button>
        </form>
      </aside>
      <main className="flex-1">{children}</main>
    </div>
  );
}
