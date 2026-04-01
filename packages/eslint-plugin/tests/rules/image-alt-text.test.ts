import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/image-alt-text.js';

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

ruleTester.run('image-alt-text', rule, {
  valid: [
    // ── Descriptive alt text ──
    {
      code: '<img alt="A golden retriever playing fetch" src="dog.jpg" />',
    },

    // ── Decorative image with role="presentation" ──
    {
      code: '<img alt="" role="presentation" src="bg.jpg" />',
    },

    // ── Decorative image with role="none" ──
    {
      code: '<img alt="" role="none" src="bg.jpg" />',
    },

    // ── Decorative image with aria-hidden="true" ──
    {
      code: '<img alt="" aria-hidden="true" src="bg.jpg" />',
    },

    // ── Decorative image with aria-hidden boolean attribute ──
    {
      code: '<img alt="" aria-hidden src="bg.jpg" />',
    },

    // ── Descriptive alt that happens to contain a meaningless word ──
    {
      code: '<img alt="Company logo - Acme Inc" src="logo.png" />',
    },

    // ── Alt text with "image" as substring, not exact match ──
    {
      code: '<img alt="Hero image of the team working together" src="hero.jpg" />',
    },

    // ── Alt text "photo" as substring ──
    {
      code: '<img alt="Team photo at the annual retreat" src="team.jpg" />',
    },

    // ── Next.js Image with descriptive alt ──
    {
      code: '<Image alt="Hero banner showing product" src="/hero.jpg" />',
    },

    // ── Spread attribute — benefit of the doubt ──
    {
      code: '<img {...props} />',
    },

    // ── Spread attribute with explicit src but alt could be in spread ──
    {
      code: '<img {...imageProps} src="photo.jpg" />',
    },

    // ── Non-image elements are ignored ──
    { code: '<div />' },
    { code: '<span>Text</span>' },
    { code: '<video src="clip.mp4" />' },

    // ── Dynamic alt expression — can't evaluate, skip ──
    {
      code: '<img alt={dynamicVar} src="x.jpg" />',
    },

    // ── Template literal alt — can't evaluate, skip ──
    {
      code: '<img alt={`Product ${name}`} src="x.jpg" />',
    },

    // ── JSX expression with string literal ──
    {
      code: '<img alt={"A descriptive alt"} src="x.jpg" />',
    },

    // ── Next.js Image disabled via options ──
    {
      code: '<Image src="/hero.jpg" />',
      options: [{ checkNextImage: false }],
    },

    // ── Custom meaningless patterns that don't match ──
    {
      code: '<img alt="photo" src="x.jpg" />',
      options: [{ meaninglessPatterns: ['banner', 'hero'] }],
    },

    // ── Alt with value "alt" (not in the default meaningless list) ──
    {
      code: '<img alt="alt text description" src="x.jpg" />',
    },
  ],

  invalid: [
    // ── Missing alt entirely ──
    {
      code: '<img src="dog.jpg" />',
      errors: [
        {
          messageId: 'missingAlt' as const,
          suggestions: [
            {
              messageId: 'emptyAlt' as const,
              output: '<img alt="" src="dog.jpg" />',
            },
          ],
        },
      ],
    },

    // ── Empty alt without role="presentation" ──
    {
      code: '<img alt="" src="photo.jpg" />',
      errors: [
        {
          messageId: 'emptyAlt' as const,
          suggestions: [
            {
              messageId: 'emptyAlt' as const,
              output: '<img role="presentation" alt="" src="photo.jpg" />',
            },
          ],
        },
      ],
    },

    // ── Whitespace-only alt ──
    {
      code: '<img alt="  " src="photo.jpg" />',
      errors: [
        {
          messageId: 'emptyAlt' as const,
          suggestions: [
            {
              messageId: 'emptyAlt' as const,
              output: '<img role="presentation" alt="  " src="photo.jpg" />',
            },
          ],
        },
      ],
    },

    // ── Alt attribute with no value (boolean-style) ──
    {
      code: '<img alt src="photo.jpg" />',
      errors: [
        {
          messageId: 'emptyAlt' as const,
          suggestions: [
            {
              messageId: 'emptyAlt' as const,
              output: '<img role="presentation" alt src="photo.jpg" />',
            },
          ],
        },
      ],
    },

    // ── Meaningless alt: "image" ──
    {
      code: '<img alt="image" src="hero.jpg" />',
      errors: [{ messageId: 'meaninglessAlt' as const }],
    },

    // ── Meaningless alt: "photo" ──
    {
      code: '<img alt="photo" src="team.jpg" />',
      errors: [{ messageId: 'meaninglessAlt' as const }],
    },

    // ── Meaningless alt: "picture" ──
    {
      code: '<img alt="picture" src="gallery.jpg" />',
      errors: [{ messageId: 'meaninglessAlt' as const }],
    },

    // ── Meaningless alt: "icon" ──
    {
      code: '<img alt="icon" src="check.svg" />',
      errors: [{ messageId: 'meaninglessAlt' as const }],
    },

    // ── Meaningless alt: "logo" ──
    {
      code: '<img alt="logo" src="brand.png" />',
      errors: [{ messageId: 'meaninglessAlt' as const }],
    },

    // ── Meaningless alt: "placeholder" ──
    {
      code: '<img alt="placeholder" src="avatar.png" />',
      errors: [{ messageId: 'meaninglessAlt' as const }],
    },

    // ── Meaningless alt: "untitled" ──
    {
      code: '<img alt="untitled" src="file.png" />',
      errors: [{ messageId: 'meaninglessAlt' as const }],
    },

    // ── Meaningless alt: "screenshot" ──
    {
      code: '<img alt="screenshot" src="screen.png" />',
      errors: [{ messageId: 'meaninglessAlt' as const }],
    },

    // ── Meaningless alt: "img" ──
    {
      code: '<img alt="img" src="file.png" />',
      errors: [{ messageId: 'meaninglessAlt' as const }],
    },

    // ── Case-insensitive: "Icon" ──
    {
      code: '<img alt="Icon" src="check.svg" />',
      errors: [{ messageId: 'meaninglessAlt' as const }],
    },

    // ── Case-insensitive: "IMAGE" ──
    {
      code: '<img alt="IMAGE" src="hero.jpg" />',
      errors: [{ messageId: 'meaninglessAlt' as const }],
    },

    // ── Case-insensitive with whitespace: " Photo " ──
    {
      code: '<img alt=" Photo " src="team.jpg" />',
      errors: [{ messageId: 'meaninglessAlt' as const }],
    },

    // ── Next.js Image missing alt (checkNextImage: true by default) ──
    {
      code: '<Image src="/hero.jpg" />',
      errors: [
        {
          messageId: 'missingAlt' as const,
          suggestions: [
            {
              messageId: 'emptyAlt' as const,
              output: '<Image alt="" src="/hero.jpg" />',
            },
          ],
        },
      ],
    },

    // ── Next.js Image with empty alt ──
    {
      code: '<Image alt="" src="/hero.jpg" />',
      errors: [
        {
          messageId: 'emptyAlt' as const,
          suggestions: [
            {
              messageId: 'emptyAlt' as const,
              output: '<Image role="presentation" alt="" src="/hero.jpg" />',
            },
          ],
        },
      ],
    },

    // ── Next.js Image with meaningless alt ──
    {
      code: '<Image alt="image" src="/hero.jpg" />',
      errors: [{ messageId: 'meaninglessAlt' as const }],
    },

    // ── Multiple images in one component ──
    {
      code: '<><img src="a.jpg" /><img alt="photo" src="b.jpg" /></>',
      errors: [
        {
          messageId: 'missingAlt' as const,
          suggestions: [
            {
              messageId: 'emptyAlt' as const,
              output: '<><img alt="" src="a.jpg" /><img alt="photo" src="b.jpg" /></>',
            },
          ],
        },
        { messageId: 'meaninglessAlt' as const },
      ],
    },

    // ── Empty string via JSX expression ──
    {
      code: '<img alt={""} src="x.jpg" />',
      errors: [
        {
          messageId: 'emptyAlt' as const,
          suggestions: [
            {
              messageId: 'emptyAlt' as const,
              output: '<img role="presentation" alt={""} src="x.jpg" />',
            },
          ],
        },
      ],
    },

    // ── Meaningless alt via JSX expression ──
    {
      code: '<img alt={"placeholder"} src="x.jpg" />',
      errors: [{ messageId: 'meaninglessAlt' as const }],
    },

    // ── Custom meaningless patterns ──
    {
      code: '<img alt="banner" src="x.jpg" />',
      options: [{ meaninglessPatterns: ['banner', 'hero'] }],
      errors: [{ messageId: 'meaninglessAlt' as const }],
    },

    // ── Empty alt with role="img" (not presentation, so still flagged) ──
    {
      code: '<img alt="" role="img" src="bg.jpg" />',
      errors: [
        {
          messageId: 'emptyAlt' as const,
          suggestions: [
            {
              messageId: 'emptyAlt' as const,
              output: '<img role="presentation" alt="" role="img" src="bg.jpg" />',
            },
          ],
        },
      ],
    },
  ],
});
