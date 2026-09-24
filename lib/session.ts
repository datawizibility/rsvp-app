import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export async function requireUserId(): Promise<string> {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) redirect("/signin");
  return id;
}
