# Deslint Logo Assets

## HTML <head> snippet — paste this in every page

```html
<!-- Favicon -->
<link rel="icon" href="/icons/favicon.ico" sizes="any" />
<link rel="icon" href="/icons/icon-32.svg" type="image/svg+xml" />

<!-- Apple touch icon (home screen on iOS) -->
<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />

<!-- PWA manifest -->
<link rel="manifest" href="/site.webmanifest" />

<!-- Theme color (browser chrome / address bar) -->
<meta name="theme-color" content="#534AB7" />
```

## File reference

| File | Use |
|---|---|
| `favicon.ico` | Legacy browsers, 16/32/48 embedded |
| `icon-32.svg` | Modern browsers (vector, scales perfectly) |
| `icon-16.png` | 16×16 fallback |
| `icon-32.png` | 32×32 fallback |
| `icon-48.png` | 48×48 Windows taskbar |
| `icon-64.png` | 64×64 general |
| `icon-128.png` | 128×128 general |
| `apple-touch-icon.png` | 180×180 iOS home screen |
| `icon-192.png` | PWA / Android home screen |
| `icon-256.png` | 256×256 general |
| `icon-512.png` | PWA splash / store listings |
| `icon-1024.png` | App Store / high-res export |
| `icon-mono-512.svg` | Monochrome / single-colour contexts |
| `lockup-light.svg/png` | Horizontal wordmark, light bg |
| `lockup-dark.svg/png` | Horizontal wordmark, dark bg |
| `og-icon-512.png` | Social share / Open Graph |
| `site.webmanifest` | PWA manifest |

## Angular / Next / Nuxt notes

**Angular**: copy all PNGs + SVGs to `src/assets/icons/`, update `angular.json` assets array.
**Next.js**: drop in `public/icons/`, add `<Head>` snippet above in `_document.tsx`.
**Nuxt**: drop in `public/icons/`, paste into `nuxt.config.ts` app.head.link[].
