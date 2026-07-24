/* eslint-disable */
// Generated from wrangler.jsonc by scripts/check-cloudflare-types.mjs. Do not edit.
interface __BaseEnv_CloudflareEnv {
	BUCKET: R2Bucket;
	HYPERDRIVE: Hyperdrive;
	AUTH_RATE_LIMITER: RateLimit;
	ASSETS: Fetcher;
	BETTER_AUTH_URL: "https://admin.truelend.in";
	EMAIL_FROM: "TrueLend <hello@truelend.in>";
	PARTNER_EMAIL: "TrueLend Referral Partners <partner@trulend.in>";
	TEAM_EMAIL: "shathwik@icloud.com";
	PARTNERS_URL: "https://partner.truelend.in";
}
declare namespace Cloudflare {
	interface Env extends __BaseEnv_CloudflareEnv {}
}
interface CloudflareEnv extends Cloudflare.Env {}
type StringifyValues<EnvType extends Record<string, unknown>> = {
	[Binding in keyof EnvType]: EnvType[Binding] extends string ? EnvType[Binding] : string;
};
declare namespace NodeJS {
	interface ProcessEnv extends StringifyValues<Pick<Cloudflare.Env, "BETTER_AUTH_URL" | "EMAIL_FROM" | "PARTNER_EMAIL" | "TEAM_EMAIL" | "PARTNERS_URL">> {}
}
