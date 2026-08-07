/* eslint-disable */
// Generated from wrangler.jsonc by scripts/check-cloudflare-types.mjs. Do not edit.
interface __BaseEnv_CloudflareEnv {
	HYPERDRIVE: Hyperdrive;
	LEAD_RATE_LIMITER: RateLimit;
	IMAGES: ImagesBinding;
	ASSETS: Fetcher;
	EMAIL_FROM: "TrueLend <hello@truelend.in>";
	TEAM_EMAIL: "loans@truelend.in";
	PARTNER_EMAIL: "TrueLend Referral Partners <partner@truelend.in>";
}
declare namespace Cloudflare {
	interface Env extends __BaseEnv_CloudflareEnv {}
}
interface CloudflareEnv extends Cloudflare.Env {}
type StringifyValues<EnvType extends Record<string, unknown>> = {
	[Binding in keyof EnvType]: EnvType[Binding] extends string ? EnvType[Binding] : string;
};
declare namespace NodeJS {
	interface ProcessEnv extends StringifyValues<Pick<Cloudflare.Env, "EMAIL_FROM" | "TEAM_EMAIL" | "PARTNER_EMAIL">> {}
}
