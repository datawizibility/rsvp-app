-- CreateTable
CREATE TABLE "FunctionInvite" (
    "id" TEXT NOT NULL,
    "eventFunctionId" TEXT NOT NULL,
    "eventGuestId" TEXT NOT NULL,

    CONSTRAINT "FunctionInvite_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "FunctionInvite_eventGuestId_idx" ON "FunctionInvite"("eventGuestId");

-- CreateIndex
CREATE UNIQUE INDEX "FunctionInvite_eventFunctionId_eventGuestId_key" ON "FunctionInvite"("eventFunctionId", "eventGuestId");

-- AddForeignKey
ALTER TABLE "FunctionInvite" ADD CONSTRAINT "FunctionInvite_eventFunctionId_fkey" FOREIGN KEY ("eventFunctionId") REFERENCES "EventFunction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FunctionInvite" ADD CONSTRAINT "FunctionInvite_eventGuestId_fkey" FOREIGN KEY ("eventGuestId") REFERENCES "EventGuest"("id") ON DELETE CASCADE ON UPDATE CASCADE;
