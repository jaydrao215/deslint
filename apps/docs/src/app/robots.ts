import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin/', '/api/admin/', '/api/waitlist'],
      },
    ],
    sitemap: 'https://deslint.com/sitemap.xml',
    host: 'https://deslint.com',
  };
}
