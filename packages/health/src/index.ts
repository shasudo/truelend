const encoder = new TextEncoder();

async function digest(value: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", encoder.encode(value)));
}

export async function isReadinessAuthorized(
  request: Request,
  secret: string | undefined,
): Promise<boolean> {
  if (!secret) return false;
  const authorization = request.headers.get("authorization") ?? "";
  const supplied = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
  const [actual, expected] = await Promise.all([digest(supplied), digest(secret)]);
  let difference = 0;
  for (let index = 0; index < expected.length; index += 1) {
    difference |= actual[index]! ^ expected[index]!;
  }
  return supplied.length > 0 && difference === 0;
}

export function healthHeaders(): HeadersInit {
  return { "cache-control": "no-store", "content-type": "application/json" };
}
