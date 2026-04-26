// Custom robots.txt route so we can emit directives Next.js's
// MetadataRoute.Robots shape does not model — specifically the
// Content-Signal header from the IETF AI-preferences draft
// (draft-romm-aipref-contentsignals).
//
// Keep this file as the single source of truth for /robots.txt.
// The previous `robots.ts` metadata handler has been removed.

const BODY = `User-agent: *
Allow: /
Disallow: /admin/
Disallow: /api/admin/
Disallow: /api/waitlist
Content-Signal: search=yes, ai-input=yes, ai-train=no

Host: https://deslint.com
Sitemap: https://deslint.com/sitemap.xml
`;

export function GET() {
  return new Response(BODY, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
