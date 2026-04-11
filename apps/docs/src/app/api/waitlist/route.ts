// Next.js App Router route handler for the Teams / Enterprise waitlist.
//
// Invoked by the WaitlistForm component in `src/app/pricing/page.tsx`,
// which POSTs { email, tier } and falls back to localStorage on any
// non-2xx response so signups are never lost while the backend is being
// configured.
//
// Required environment variables (set in the Vercel project):
//   RESEND_API_KEY                 — Resend API key (server-side only)
//   RESEND_AUDIENCE_ID_TEAMS       — Resend audience id for Teams waitlist
//   RESEND_AUDIENCE_ID_ENTERPRISE  — Resend audience id for Enterprise leads
//                                    (optional; falls back to the Teams id)
//
// Double opt-in: delegated to Resend's audience-level confirmation settings.
// Enable "require double opt-in" on both audiences in the Resend dashboard
// so Resend owns the confirmation email flow.
//
// TODO(sprint-13): add IP-based rate limiting. The current handler has no
// throttle — a scripted `for i in {1..10000}` would pollute the audience
// and trip Resend's abuse detection on our key. Pick Upstash Redis or
// Vercel KV and gate at ~10 requests / minute / IP before a public launch
// where the endpoint is discoverable.

export const runtime = 'edge';

interface WaitlistPayload {
  email?: unknown;
  tier?: unknown;
}

const ALLOWED_TIERS = new Set(['Teams', 'Enterprise']);

// Good-enough email shape check. Resend does the authoritative validation
// and will reject anything structurally invalid that slips through.
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

export async function POST(request: Request): Promise<Response> {
  // Cheap body-size guard. A malformed content-length header (missing,
  // non-numeric, negative) is treated as unknown and falls through to the
  // runtime's own body-size limits. Only a *well-formed, too-large* header
  // is rejected here.
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

  // `||` (not `??`) so an empty-string env var set via the Vercel UI still
  // falls through to the next option instead of failing the request.
  const apiKey = process.env.RESEND_API_KEY || '';
  const audienceId =
    tier === 'Enterprise'
      ? process.env.RESEND_AUDIENCE_ID_ENTERPRISE ||
        process.env.RESEND_AUDIENCE_ID_TEAMS ||
        ''
      : process.env.RESEND_AUDIENCE_ID_TEAMS || '';

  if (!apiKey || !audienceId) {
    // Single opaque error code so probes cannot distinguish "API key unset"
    // from "audience id unset" — both are equally "the backend isn't
    // configured yet." The client's localStorage fallback still catches the
    // signup so nothing is lost.
    return json({ ok: false, error: 'backend_unavailable' }, { status: 503 });
  }

  try {
    const upstream = await fetch(
      `https://api.resend.com/audiences/${encodeURIComponent(audienceId)}/contacts`,
      {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({ email, unsubscribed: false }),
      },
    );

    if (upstream.ok) {
      return json({ ok: true });
    }

    // 409 / 422 from Resend typically means "already in the audience" —
    // treat that as success so repeat submitters see the confirmation state
    // instead of a spurious error banner.
    if (upstream.status === 409 || upstream.status === 422) {
      return json({ ok: true, already_subscribed: true });
    }

    // Don't echo Resend's error body — could leak audience ids or other
    // implementation details.
    return json({ ok: false, error: 'upstream_error' }, { status: 502 });
  } catch {
    return json({ ok: false, error: 'upstream_unreachable' }, { status: 502 });
  }
}
