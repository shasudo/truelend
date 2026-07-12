// ponytail: hand-rolled env read; swap in zod / @t3-oss/env-core when config grows.
function port(): number {
  const raw = process.env.PORT ?? "3001";
  const n = Number(raw);
  if (!Number.isInteger(n) || n <= 0 || n > 65535) {
    throw new Error(`Invalid PORT: ${raw}`);
  }
  return n;
}

export const env = {
  PORT: port(),
  NODE_ENV: process.env.NODE_ENV ?? "development",
} as const;
