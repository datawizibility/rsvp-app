import { prisma } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

export function createWorkspaceForUser(userId: string, name: string) {
  return prisma.workspace.create({ data: { ownerId: userId, name } });
}

export function getWorkspaceForUser(userId: string) {
  return prisma.workspace.findFirst({
    where: { ownerId: userId },
    orderBy: { createdAt: "asc" },
  });
}

export async function requireWorkspace(userId: string) {
  const workspace = await getWorkspaceForUser(userId);
  if (!workspace) throw new NotFoundError("No workspace for user");
  return workspace;
}
