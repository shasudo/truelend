export {
  assertAuditImmutabilityReady,
  assertPartnerRegistrationSchemaReady,
  createDb,
  ping,
  pingAuditImmutability,
  pingPartnerRegistrationSchema,
  type AuditImmutabilityProbe,
  type Database,
  type PartnerRegistrationSchemaProbe,
} from "./client";
export * as schema from "./schema";
// Promoted here only when a consumer outside this package actually needs
// top-level access; everything else (LeadNote, User, NewPartner, AuditLog,
// NewAuditLog, ...) stays reachable through the schema namespace above.
export type {
  BankApplyLead,
  CallTask,
  Lead,
  LoanCase,
  NewCallTask,
  NewLoanCase,
  Partner,
  PartnerDocument,
  PartnerPayout,
} from "./schema";
