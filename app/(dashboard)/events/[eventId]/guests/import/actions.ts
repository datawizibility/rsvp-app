"use server";

import { revalidatePath } from "next/cache";
import { requireUserId } from "@/lib/session";
import { getEventForUser } from "@/lib/services/events";
import { existingNormalizedMobiles } from "@/lib/services/contacts";
import { addEventGuest } from "@/lib/services/eventGuests";
import { analyzeImport, type ImportAnalysis, type ImportRow } from "@/lib/services/import/analyze";
import { mapColumns, type ColumnMapping } from "@/lib/services/import/map";
import { parseCsv } from "@/lib/services/import/parse";

export async function previewImportAction(
  eventId: string,
  csvText: string,
): Promise<{
  headers: string[];
  rows: Record<string, string>[];
  mapping: ColumnMapping;
  analysis: ImportAnalysis;
}> {
  const userId = await requireUserId();
  const event = await getEventForUser(userId, eventId);
  const { headers, rows } = parseCsv(csvText);
  const mapping = mapColumns(headers);
  const existing = await existingNormalizedMobiles(event.workspaceId);
  const analysis = analyzeImport(rows, mapping, existing);
  return { headers, rows, mapping, analysis };
}

export async function analyzeWithMappingAction(
  eventId: string,
  rows: Record<string, string>[],
  mapping: ColumnMapping,
): Promise<ImportAnalysis> {
  const userId = await requireUserId();
  const event = await getEventForUser(userId, eventId);
  const existing = await existingNormalizedMobiles(event.workspaceId);
  return analyzeImport(rows, mapping, existing);
}

export async function commitImportAction(
  eventId: string,
  rows: ImportRow[],
): Promise<{ imported: number }> {
  const userId = await requireUserId();
  await getEventForUser(userId, eventId);

  let imported = 0;
  for (const row of rows) {
    const mobile = row.mobile || row.mobileNormalized;
    if (!row.name || !mobile) continue;
    await addEventGuest(
      userId,
      eventId,
      {
        name: row.name,
        mobile,
        email: row.email,
        organisation: row.organisation,
        designation: row.designation,
      },
      { groupName: row.group, isVip: row.isVip, partySize: row.partySize },
    );
    imported++;
  }

  revalidatePath(`/events/${eventId}/guests`);
  return { imported };
}
