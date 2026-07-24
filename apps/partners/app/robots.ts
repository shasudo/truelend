import type { MetadataRoute } from "next";
import { appUrls } from "@truelend/reference";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/register/referral", "/resources"],
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
    sitemap: `${appUrls.partners}/sitemap.xml`,
  };
}
