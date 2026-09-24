import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";

export const dynamic = "force-dynamic";

const TEMPLATE = [
  "Name,Mobile,Email,Organisation,Designation,City,Group,VIP,Party Size",
  "Rahul Sharma,9876543210,rahul@example.com,,,Kolkata,Friends,no,2",
  "Rajesh Sharma,+919811122233,rajesh@abccapital.com,ABC Capital,Managing Director,Mumbai,VIP,yes,4",
  "Priya Shah,+919811122244,,,Sharma Textiles,Director,Mumbai,Family,no,3",
].join("\n") + "\n";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  return new NextResponse(TEMPLATE, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="guest-import-template.csv"',
    },
  });
}
