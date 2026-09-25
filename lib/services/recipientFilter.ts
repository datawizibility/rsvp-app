export type RecipientFilter =
  | "all"
  | "group"
  | "not_sent"
  | "non_responders"
  | "not_opened";

export type FilterSubject = {
  groupId: string | null;
  lastSentAtForRound: Date | null;
  rsvpStatus: "yes" | "maybe" | "no" | null;
  firstOpenedAt: Date | null;
};

export function matchesFilter(
  subject: FilterSubject,
  filter: RecipientFilter,
  groupId?: string | null,
): boolean {
  switch (filter) {
    case "all":
      return true;
    case "group":
      return subject.groupId !== null && subject.groupId === groupId;
    case "not_sent":
      return subject.lastSentAtForRound === null;
    case "non_responders":
      return subject.rsvpStatus === null;
    case "not_opened":
      return subject.firstOpenedAt === null;
  }
}
