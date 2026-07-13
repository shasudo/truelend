import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/register", "/login", "/resources"],
      disallow: ["/dashboard", "/kyc", "/leads", "/refer", "/profile", "/api"],
    },
  };
}
