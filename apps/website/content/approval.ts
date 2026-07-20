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

// Update this manifest only from named business/legal evidence. The public
// draft notice remains visible while any listed area is blocked.
export const publicContentApproval: PublicContentApproval = {
  status: "blocked",
  owner: null,
  source: null,
  reviewedAt: null,
  blockedAreas: ["contact details", "product rates and claims", "privacy copy", "terms copy"],
};

export function publicContentNotice(approval = publicContentApproval): string | null {
  if (approval.status === "approved") return null;
  return `Draft website: business or legal approval is still required for ${approval.blockedAreas.join(", ")}.`;
}
