-- CreateTable
CREATE TABLE "GalleryItem" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "eventGuestId" TEXT,
    "url" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'image',
    "approved" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GalleryItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "GalleryItem_eventId_idx" ON "GalleryItem"("eventId");

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "Event"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GalleryItem" ADD CONSTRAINT "GalleryItem_eventGuestId_fkey" FOREIGN KEY ("eventGuestId") REFERENCES "EventGuest"("id") ON DELETE SET NULL ON UPDATE CASCADE;
