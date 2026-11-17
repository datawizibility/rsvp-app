-- AlterTable
ALTER TABLE "Rsvp" ADD COLUMN     "travelArrival" TIMESTAMP(3),
ADD COLUMN     "travelDeparture" TIMESTAMP(3),
ADD COLUMN     "travelDrop" BOOLEAN,
ADD COLUMN     "travelFlightNumber" TEXT,
ADD COLUMN     "travelNotes" TEXT,
ADD COLUMN     "travelPickup" BOOLEAN,
ADD COLUMN     "travelTicketUrl" TEXT,
ADD COLUMN     "travelTravellers" INTEGER;
