// Vercel Edge serverless function for the Teams / Enterprise waitlist.
//
// Why this lives at apps/docs/api/waitlist.ts (outside src/app/):
// -------------------------------------------------------------
// The Next.js site is built with `output: 'export'` (see next.config.ts),
// which disables App Router API route handlers. Vercel's zero-config
// `/api/*.ts` convention still works alongside a static export: files under
// the project-root `api/` directory are picked up as standalone functions
// and served at `/api/<name>` next to the static HTML in `out/`.
//
// The client entry point is the WaitlistForm component in
// `src/app/pricing/page.tsx`. It POSTs { email, tier } here and falls back
// to `localStorage` on any network failure, so signups are never lost while
// the backend is unconfigured or unreachable.
//
// Required environment variables (set in the Vercel project):
//   RESEND_API_KEY                 — Resend API key (server-side only)
//   RESEND_AUDIENCE_ID_TEAMS       — Resend audience id for Teams waitlist
//   RESEND_AUDIENCE_ID_ENTERPRISE  — Resend audience id for Enterprise leads
//                                    (optional; falls back to the Teams id)
//
// If RESEND_API_KEY is not set we return 503 so the client falls back to
// localStorage — the pricing page will still show the success state and
// the signup is preserved for later import. We never echo Resend error
// bodies to the client and we never log the submitted email.
//
// Double opt-in: handled by Resend's audience-level confirmation settings.
// Enable "require double opt-in" on the Teams and Enterprise audiences in
// the Resend dashboard so Resend sends the confirmation mail for us.

export const config = { runtime: 'edge' };

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

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== 'POST') {
    return json(
      { ok: false, error: 'method_not_allowed' },
      { status: 405, headers: { allow: 'POST' } },
    );
  }

  // Cheap body-size guard — edge runtimes don't enforce this by default.
  const contentLength = Number(request.headers.get('content-length') ?? '0');
  if (Number.isFinite(contentLength) && contentLength > MAX_BODY_BYTES) {
    return json({ ok: false, error: 'payload_too_large' }, { status: 413 });
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

  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    // Let the client fall back to localStorage so no signups are lost
    // while we bring up the backend.
    return json({ ok: false, error: 'backend_unconfigured' }, { status: 503 });
  }

  const audienceId =
    tier === 'Enterprise'
      ? process.env.RESEND_AUDIENCE_ID_ENTERPRISE ??
        process.env.RESEND_AUDIENCE_ID_TEAMS ??
        ''
      : process.env.RESEND_AUDIENCE_ID_TEAMS ?? '';

  if (!audienceId) {
    return json({ ok: false, error: 'audience_unconfigured' }, { status: 503 });
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
