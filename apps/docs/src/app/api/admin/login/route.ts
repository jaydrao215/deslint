import {
  verifyPassword,
  createSessionToken,
  SESSION_COOKIE_NAME,
  SESSION_MAX_AGE,
} from '@/lib/admin-auth';

export const runtime = 'edge';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;
const attempts = new Map<string, { count: number; resetAt: number }>();

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = attempts.get(ip);
  if (!entry || now > entry.resetAt) {
    attempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return false;
  }
  entry.count++;
  return entry.count > MAX_ATTEMPTS;
}

export async function POST(request: Request): Promise<Response> {
  const ip =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    request.headers.get('x-real-ip') ??
    'unknown';

  if (isRateLimited(ip)) {
    return Response.json(
      { ok: false, error: 'rate_limited' },
      { status: 429 },
    );
  }

  const storedHash = process.env.ADMIN_PASSWORD_HASH;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!storedHash || !secret) {
    return Response.json(
      { ok: false, error: 'not_configured' },
      { status: 503 },
    );
  }

  let body: { password?: unknown };
  try {
    body = (await request.json()) as { password?: unknown };
  } catch {
    return Response.json(
      { ok: false, error: 'invalid_json' },
      { status: 400 },
    );
  }

  const password = typeof body.password === 'string' ? body.password : '';
  if (!password || !(await verifyPassword(password, storedHash))) {
    return Response.json({ ok: false }, { status: 401 });
  }

  const token = await createSessionToken(secret);
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      'content-type': 'application/json',
      'set-cookie': [
        `${SESSION_COOKIE_NAME}=${token}`,
        `Path=/admin`,
        `HttpOnly`,
        `Secure`,
        `SameSite=Strict`,
        `Max-Age=${SESSION_MAX_AGE}`,
      ].join('; '),
    },
  });
}
