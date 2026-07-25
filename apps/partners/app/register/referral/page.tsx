import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { schema } from "@truelend/db";
import { DedicatedRegister } from "@/components/dedicated-register";
import { RegistrationAccountBlocked } from "@/components/registration-account-blocked";
import { getAuthContext, getOptionalPartnerSession } from "@/lib/auth";
import { registrationAccountDecision } from "@/lib/registration-flow";

export const metadata: Metadata = {
  title: "Become a Referral Partner",
  description:
    "Register as a TrueLend Referral Partner — introduce people who need a loan and earn referral rewards.",
  alternates: { canonical: "/register/referral" },
};

// The Turnstile site key is a Worker runtime variable, so this page must not
// be statically generated at build time.
export const dynamic = "force-dynamic";

export default async function ReferralRegisterPage() {
  const { env } = getCloudflareContext();
  const session = await getOptionalPartnerSession();
  if (!session) return <DedicatedRegister siteKey={env.TURNSTILE_SITE_KEY} />;

  const { db } = getAuthContext();
  const [[account], [partner]] = await Promise.all([
    db
      .select({ role: schema.user.role })
      .from(schema.user)
      .where(eq(schema.user.id, session.user.id))
      .limit(1),
    db
      .select({ userId: schema.partners.userId })
      .from(schema.partners)
      .where(eq(schema.partners.userId, session.user.id))
      .limit(1),
  ]);

  const accountDecision = registrationAccountDecision(account?.role, Boolean(partner));
  if (accountDecision === "existing") redirect("/dashboard");
  if (accountDecision === "ineligible") {
    return <RegistrationAccountBlocked email={session.user.email} />;
  }

  return (
    <DedicatedRegister
      siteKey={env.TURNSTILE_SITE_KEY}
      account={{ email: session.user.email, name: session.user.name }}
    />
  );
}
