/* eslint-disable */
// Generated from wrangler.jsonc by scripts/check-cloudflare-types.mjs. Do not edit.
interface __BaseEnv_CloudflareEnv {
	BUCKET: R2Bucket;
	HYPERDRIVE: Hyperdrive;
	AUTH_RATE_LIMITER: RateLimit;
	REGISTRATION_RATE_LIMITER: RateLimit;
	PARTNER_WRITE_RATE_LIMITER: RateLimit;
	CSV_IMPORT_RATE_LIMITER: RateLimit;
	ASSETS: Fetcher;
	BETTER_AUTH_URL: "https://partner.truelend.in";
	TURNSTILE_SITE_KEY: "0x4AAAAAAD0gmfEKR5XdzhJR";
	EMAIL_FROM: "TrueLend <hello@truelend.in>";
	TEAM_EMAIL: "shathwik@icloud.com";
}
declare namespace Cloudflare {
	interface Env extends __BaseEnv_CloudflareEnv {}
}
interface CloudflareEnv extends Cloudflare.Env {}
type StringifyValues<EnvType extends Record<string, unknown>> = {
	[Binding in keyof EnvType]: EnvType[Binding] extends string ? EnvType[Binding] : string;
};
declare namespace NodeJS {
	interface ProcessEnv extends StringifyValues<Pick<Cloudflare.Env, "BETTER_AUTH_URL" | "TURNSTILE_SITE_KEY" | "EMAIL_FROM" | "TEAM_EMAIL">> {}
}
