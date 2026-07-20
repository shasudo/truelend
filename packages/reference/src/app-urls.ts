// Canonical production origins for metadata and cross-app navigation. Runtime
// auth configuration still comes from each Worker's host-specific bindings.
export const appUrls = {
  website: "https://truelend.in",
  admin: "https://admin.truelend.in",
  partners: "https://partner.truelend.in",
} as const;
