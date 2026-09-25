-- AlterTable
ALTER TABLE "Event" ADD COLUMN     "inviteTemplate" TEXT,
ADD COLUMN     "reminderTemplate" TEXT;

-- AlterTable
ALTER TABLE "EventGuest" ADD COLUMN     "lastInvitedAt" TIMESTAMP(3),
ADD COLUMN     "lastRemindedAt" TIMESTAMP(3);
