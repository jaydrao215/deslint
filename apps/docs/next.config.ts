import type { NextConfig } from 'next';

// Previously `output: 'export'` (pure static). Dropped so that the
// App Router route handler at `src/app/api/waitlist/route.ts` can
// actually run at request time — static export disallows POST handlers.
//
// Every existing page still has no dynamic data dependencies, so Next.js
// will statically pre-render them at build time; runtime behavior for
// the static surface is unchanged. On Vercel, the Next.js builder
// handles the hybrid output automatically.
const nextConfig: NextConfig = {
  eslint: {
    // TypeScript checking handled by `tsc --noEmit` in CI.
    // Root ESLint config lacks TS parser, so skip during build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
