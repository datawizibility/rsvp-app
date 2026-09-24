import { RoyalTemplate } from "./RoyalTemplate";
import { MinimalTemplate } from "./MinimalTemplate";
import type { InvitationView } from "./types";

export function InvitationRenderer({
  templateKey,
  view,
}: {
  templateKey: string;
  view: InvitationView;
}) {
  if (templateKey === "minimal") return <MinimalTemplate view={view} />;
  return <RoyalTemplate view={view} />;
}

export type { InvitationView } from "./types";
