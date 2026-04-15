import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/responsive-image-optimization.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: {
      ecmaFeatures: { jsx: true },
    },
  },
});

ruleTester.run('responsive-image-optimization', rule, {
  valid: [
    // ── Fully optimized img ──
    {
      code: '<img src="/hero.jpg" loading="lazy" width="800" height="600" srcSet="hero-400.jpg 400w, hero-800.jpg 800w" alt="Hero" />',
    },

    // ── Next.js Image component — automatically optimized ──
    {
      code: '<Image src="/photo.jpg" alt="Photo" />',
    },

    // ── Gatsby StaticImage — automatically optimized ──
    {
      code: '<StaticImage src="./photo.jpg" alt="Photo" />',
    },

    // ── Decorative image (role="presentation") ──
    {
      code: '<img src="/divider.png" role="presentation" />',
    },

    // ── Decorative image (aria-hidden) ──
    {
      code: '<img src="/bg.png" aria-hidden="true" />',
    },

    // ── Data URI — skip ──
    {
      code: '<img src="data:image/svg+xml;base64,..." alt="icon" />',
    },

    // ── SVG with loading and dimensions — no srcset needed ──
    {
      code: '<img src="/icon.svg" loading="lazy" width="24" height="24" alt="icon" />',
    },

    // ── Spread attributes (benefit of doubt) ──
    {
      code: '<img {...props} alt="Photo" />',
    },

    // ── Non-img element ──
    {
      code: '<div className="bg-cover" />',
    },

    // ── NuxtImg — framework optimized ──
    {
      code: '<NuxtImg src="/photo.jpg" alt="Photo" />',
    },

    // ── Fully optimized above-the-fold hero (fetchpriority) ──
    {
      code: '<img src="/hero.jpg" fetchpriority="high" width="1200" height="600" srcSet="hero-800.jpg 800w" alt="Hero" />',
    },
    // ── Fully optimized priority image ──
    {
      code: '<img src="/hero.jpg" priority width="1200" height="600" srcSet="hero-800.jpg 800w" alt="Hero" />',
    },
    // ── Fully optimized loading="eager" hero ──
    {
      code: '<img src="/hero.jpg" loading="eager" width="1200" height="600" srcSet="hero-800.jpg 800w" alt="Hero" />',
    },
  ],

  invalid: [
    // ── Missing loading attribute → auto-fixed ──
    {
      code: '<img src="/photo.jpg" width="800" height="600" srcSet="photo-400.jpg 400w" alt="Photo" />',
      output: '<img loading="lazy" src="/photo.jpg" width="800" height="600" srcSet="photo-400.jpg 400w" alt="Photo" />',
      errors: [{ messageId: 'missingLoading' }],
    },

    // ── Missing width/height (not auto-fixable) ──
    {
      code: '<img src="/photo.jpg" loading="lazy" srcSet="photo-400.jpg 400w" alt="Photo" />',
      errors: [{ messageId: 'missingWidthHeight' }],
    },

    // ── Missing srcset (not auto-fixable) ──
    {
      code: '<img src="/photo.jpg" loading="lazy" width="800" height="600" alt="Photo" />',
      errors: [{ messageId: 'missingSrcset' }],
    },

    // ── Missing everything → loading auto-fixed, others reported ──
    {
      code: '<img src="/photo.jpg" alt="Photo" />',
      output: '<img loading="lazy" src="/photo.jpg" alt="Photo" />',
      errors: [
        { messageId: 'missingLoading' },
        { messageId: 'missingWidthHeight' },
        { messageId: 'missingSrcset' },
      ],
    },

    // ── High-priority hero missing width/height/srcset ──
    // CLS + srcset are still reported (both are good practice regardless of
    // priority) but `loading="lazy"` must NOT be auto-inserted — doing so
    // regresses LCP for the LCP candidate itself.
    {
      code: '<img src="/hero.jpg" fetchpriority="high" alt="Hero" />',
      output: null,
      errors: [
        { messageId: 'missingWidthHeight' },
        { messageId: 'missingSrcset' },
      ],
    },
    {
      code: '<img src="/hero.jpg" priority alt="Hero" />',
      output: null,
      errors: [
        { messageId: 'missingWidthHeight' },
        { messageId: 'missingSrcset' },
      ],
    },
    {
      code: '<img src="/hero.jpg" data-priority alt="Hero" />',
      output: null,
      errors: [
        { messageId: 'missingWidthHeight' },
        { messageId: 'missingSrcset' },
      ],
    },
    {
      code: '<img src="/hero.jpg" loading="eager" alt="Hero" />',
      output: null,
      errors: [
        { messageId: 'missingWidthHeight' },
        { messageId: 'missingSrcset' },
      ],
    },

    // ── Dynamic loading expression: do NOT insert duplicate attribute ──
    // Rule skips the loading check (attribute is present) but still
    // reports width/height and srcset.
    {
      code: '<img src="/photo.jpg" loading={isAboveFold ? "eager" : "lazy"} alt="Photo" />',
      output: null,
      errors: [
        { messageId: 'missingWidthHeight' },
        { messageId: 'missingSrcset' },
      ],
    },
  ],
});
