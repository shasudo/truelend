import type { Metadata } from "next";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { DedicatedRegister } from "@/components/dedicated-register";

export const metadata: Metadata = {
  title: "Become a Business Partner",
  description:
    "Register as a TrueLend Business Partner and earn commissions on the loan business you already source.",
  alternates: { canonical: "/register/business" },
};

// The Turnstile site key is a Worker runtime variable, so this page must not
// be statically generated at build time.
export const dynamic = "force-dynamic";

export default function BusinessRegisterPage() {
  const { env } = getCloudflareContext();
  return <DedicatedRegister type="business" siteKey={env.TURNSTILE_SITE_KEY} />;
}
