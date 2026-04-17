const BASE = 'https://deslint.com';

export type Crumb = { name: string; path: string };

export function BreadcrumbJsonLd({ trail }: { trail: Crumb[] }) {
  const items = [{ name: 'Home', path: '/' }, ...trail];
  const json = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.name,
      item: `${BASE}${item.path === '/' ? '' : item.path}`,
    })),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(json) }}
    />
  );
}
