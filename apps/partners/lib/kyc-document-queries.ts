import "server-only";
import { and, desc, eq } from "drizzle-orm";
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

export interface PartnerPhoto {
  r2Key: string;
  contentType: string;
}

/** The uploaded "photo" KYC document, if any and if it's actually an image (not a PDF). */
export async function getPartnerPhoto(
  db: Database,
  partnerId: string,
): Promise<PartnerPhoto | null> {
  const [document] = await retryRead("partner_photo_read_retry", () =>
    db
      .select({
        r2Key: schema.partnerDocuments.r2Key,
        contentType: schema.partnerDocuments.contentType,
      })
      .from(schema.partnerDocuments)
      .where(
        and(
          eq(schema.partnerDocuments.partnerId, partnerId),
          eq(schema.partnerDocuments.docType, "photo"),
        ),
      )
      .limit(1),
  );
  return document && document.contentType.startsWith("image/") ? document : null;
}
