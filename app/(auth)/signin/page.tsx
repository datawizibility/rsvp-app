"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signInAction, type AuthState } from "../actions";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

export default function SignInPage() {
  const [state, formAction, pending] = useActionState<AuthState, FormData>(
    signInAction,
    null,
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-4">
      <h1 className="text-2xl font-semibold text-slate-900">Welcome back</h1>
      <p className="mt-1 text-sm text-slate-500">Sign in to manage your events.</p>

      <form action={formAction} className="mt-6 space-y-4">
        <Field label="Email">
          <Input name="email" type="email" required placeholder="you@example.com" />
        </Field>
        <Field label="Password">
          <Input name="password" type="password" required placeholder="Password" />
        </Field>

        {state?.error && (
          <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
            {state.error}
          </p>
        )}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Signing in..." : "Sign in"}
        </Button>
      </form>

      <p className="mt-4 text-center text-sm text-slate-500">
        New here?{" "}
        <Link href="/signup" className="font-medium text-slate-900 underline">
          Create an account
        </Link>
      </p>
    </main>
  );
}
