import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/register", "/resources"],
      disallow: [
        "/login",
        "/forgot-password",
        "/reset-password",
        "/dashboard",
        "/kyc",
        "/leads",
        "/refer",
        "/profile",
        "/api",
      ],
    },
    sitemap: "https://partner.truelend.in/sitemap.xml",
  };
}
