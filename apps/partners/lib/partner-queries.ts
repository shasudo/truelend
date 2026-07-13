import "server-only";
import { desc, eq } from "drizzle-orm";
import { schema, type Database, type PartnerDocument } from "@truelend/db";

export async function getPartnerDocuments(
  db: Database,
  partnerId: string,
): Promise<PartnerDocument[]> {
  return db
    .select()
    .from(schema.partnerDocuments)
    .where(eq(schema.partnerDocuments.partnerId, partnerId))
    .orderBy(desc(schema.partnerDocuments.uploadedAt));
}
