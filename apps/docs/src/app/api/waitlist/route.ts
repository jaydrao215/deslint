import { list, put, head } from '@vercel/blob';

export const runtime = 'edge';

interface WaitlistPayload {
  email?: unknown;
  tier?: unknown;
}

interface WaitlistEntry {
  email: string;
  tier: string;
  ts: number;
}

const BLOB_PATH = 'waitlist.json';
const ALLOWED_TIERS = new Set(['Teams', 'Enterprise']);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_EMAIL_LENGTH = 254;
const MAX_BODY_BYTES = 2048;

function json(body: unknown, init?: ResponseInit): Response {
  return new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'content-type': 'application/json',
      'cache-control': 'no-store',
      ...(init?.headers ?? {}),
    },
  });
}

async function readEntries(): Promise<WaitlistEntry[]> {
  try {
    const { blobs } = await list({ prefix: BLOB_PATH, limit: 1 });
    if (blobs.length === 0) return [];
    const blob = await head(blobs[0]!.url);
    const res = await fetch(blob.url);
    if (!res.ok) return [];
    return (await res.json()) as WaitlistEntry[];
  } catch {
    return [];
  }
}

export async function POST(request: Request): Promise<Response> {
  const rawLength = request.headers.get('content-length');
  if (rawLength !== null) {
    const parsed = Number.parseInt(rawLength, 10);
    if (Number.isFinite(parsed) && parsed > MAX_BODY_BYTES) {
      return json({ ok: false, error: 'payload_too_large' }, { status: 413 });
    }
  }

  let payload: WaitlistPayload;
  try {
    payload = (await request.json()) as WaitlistPayload;
  } catch {
    return json({ ok: false, error: 'invalid_json' }, { status: 400 });
  }

  const email =
    typeof payload.email === 'string' ? payload.email.trim().toLowerCase() : '';
  const tier = typeof payload.tier === 'string' ? payload.tier : '';

  if (!email || email.length > MAX_EMAIL_LENGTH || !EMAIL_REGEX.test(email)) {
    return json({ ok: false, error: 'invalid_email' }, { status: 400 });
  }

  if (!ALLOWED_TIERS.has(tier)) {
    return json({ ok: false, error: 'invalid_tier' }, { status: 400 });
  }

  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    return json({ ok: false, error: 'backend_unavailable' }, { status: 503 });
  }

  try {
    const entries = await readEntries();
    const duplicate = entries.some((e) => e.email === email && e.tier === tier);
    if (duplicate) {
      return json({ ok: true, already_subscribed: true });
    }

    entries.push({ email, tier, ts: Date.now() });
    await put(BLOB_PATH, JSON.stringify(entries), {
      access: 'public',
      addRandomSuffix: false,
      contentType: 'application/json',
    });

    return json({ ok: true });
  } catch {
    return json({ ok: false, error: 'upstream_error' }, { status: 502 });
  }
}
