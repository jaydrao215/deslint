import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  eslint: {
    // TypeScript checking handled by `tsc --noEmit` in CI.
    // Root ESLint config lacks TS parser, so skip during build.
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
