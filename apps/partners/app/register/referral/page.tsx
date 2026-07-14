import type { Metadata } from "next";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { DedicatedRegister } from "@/components/dedicated-register";

export const metadata: Metadata = {
  title: "Become a Referral Partner",
  description:
    "Register as a TrueLend Referral Partner — introduce people who need a loan and earn referral rewards.",
  alternates: { canonical: "/register/referral" },
};

// The Turnstile site key is a Worker runtime variable, so this page must not
// be statically generated at build time.
export const dynamic = "force-dynamic";

export default function ReferralRegisterPage() {
  const { env } = getCloudflareContext();
  return <DedicatedRegister type="referral" siteKey={env.TURNSTILE_SITE_KEY} />;
}
