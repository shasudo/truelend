import type { MetadataRoute } from "next";

// Public marketing pages are indexable; the authenticated area is not.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/register", "/login", "/resources"],
      disallow: ["/dashboard", "/kyc", "/leads", "/refer", "/profile", "/api"],
    },
  };
}
