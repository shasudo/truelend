import "server-only";
import { desc, eq } from "drizzle-orm";
import { schema, type Database } from "@truelend/db";
import { retryRead } from "./retry-read";

export async function getPartnerDocumentTypes(db: Database, partnerId: string): Promise<string[]> {
  const documents = await retryRead("partner_document_types_read_retry", () =>
    db
      .select({ docType: schema.partnerDocuments.docType })
      .from(schema.partnerDocuments)
      .where(eq(schema.partnerDocuments.partnerId, partnerId))
      .orderBy(desc(schema.partnerDocuments.uploadedAt)),
  );
  return documents.map((document) => document.docType);
}
