interface ApprovedContent {
  status: "approved";
  owner: string;
  source: string;
  reviewedAt: string;
  blockedAreas: readonly [];
}

interface BlockedContent {
  status: "blocked";
  owner: null;
  source: null;
  reviewedAt: null;
  blockedAreas: readonly [string, ...string[]];
}

export type PublicContentApproval = ApprovedContent | BlockedContent;

// Update this manifest only from named business/legal evidence.
export const publicContentApproval: PublicContentApproval = {
  status: "blocked",
  owner: null,
  source: null,
  reviewedAt: null,
  blockedAreas: ["contact details", "product rates and claims", "privacy copy", "terms copy"],
};
