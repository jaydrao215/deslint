import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';
import {
  createElementVisitor,
  getAttribute,
} from '../utils/element-visitor.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [
  {
    defaultLang?: string;
  },
];

export type MessageIds =
  | 'missingLang'
  | 'emptyLang'
  | 'invalidLang'
  | 'suggestLang';

/**
 * Very permissive BCP 47 sanity check. Matches common valid forms:
 *   en, fr, zh, en-US, zh-CN, pt-BR, en-Latn-US, sr-Cyrl-RS
 * Does NOT attempt full RFC 5646 validation — a linter that flagged
 * every unusual subtag would be a false-positive machine. We're just
 * catching obvious mistakes like `lang="true"` or `lang="english"`.
 */
const BCP47_SANITY = /^[a-zA-Z]{2,3}(-[a-zA-Z]{4})?(-([a-zA-Z]{2}|\d{3}))?$/;

export default createRule<Options, MessageIds>({
  name: 'lang-attribute',
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'Require a valid `lang` attribute on the <html> element. Maps to WCAG 2.2 Success Criterion 3.1.1 (Language of Page, Level A).',
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          defaultLang: {
            type: 'string',
            description:
              'Language code to insert when autofixing a missing lang attribute. BCP 47 format, e.g. "en", "en-US", "fr". When unset the rule reports but does NOT autofix — guessing the language wrong (writing "en" on a French site) regresses screen-reader pronunciation across the whole page.',
          },
        },
        additionalProperties: false,
      },
    ],
    messages: {
      missingLang:
        '`<html>` is missing a `lang` attribute. WCAG 3.1.1 requires the page language to be programmatically set so screen readers pronounce content correctly.',
      emptyLang:
        '`<html>` has an empty `lang` attribute. Set a valid BCP 47 language tag like "en", "en-US", or "fr".',
      invalidLang:
        '`<html lang="{{lang}}">` does not look like a valid BCP 47 language tag. Use a short code like "en", "en-US", "zh-CN", or "pt-BR".',
      suggestLang: 'Insert `lang="{{lang}}"` (verify this matches the page content)',
    },
  },
  // IMPORTANT: no implicit defaultLang. If we default to 'en', then
  // `deslint fix --all` stamps `lang="en"` on every French/Spanish/German/
  // Japanese site it sees, telling screen readers to pronounce the entire
  // page as English. That's a page-wide a11y regression. Users opt into
  // autofix by explicitly setting `defaultLang`.
  defaultOptions: [{}],
  create(context, [options]) {
    const defaultLang = options.defaultLang;
    const hasConfiguredLang = typeof defaultLang === 'string' && defaultLang.length > 0;

    return createElementVisitor({
      tagNames: ['html'],
      check(element) {
        try {
          // Spread attributes → benefit of the doubt (could contain lang)
          if (element.hasSpread) return;

          const langAttr = getAttribute(element, 'lang');

          // Missing lang entirely → report; autofix only if user configured it.
          if (!langAttr) {
            // Build a fix closure bound to the configured lang — ONLY used
            // as a top-level fix when `defaultLang` is explicitly set. The
            // suggestion path always offers the placeholder "en" so IDE
            // users can review before accepting.
            const suggestedLang = hasConfiguredLang ? defaultLang : 'en';
            const applyFix =
              element.framework === 'jsx'
                ? (fixer: Parameters<NonNullable<Parameters<typeof context.report>[0]['fix']>>[0]) => {
                    const jsxNode = element.node as TSESTree.JSXOpeningElement;
                    const tagEnd = jsxNode.name.range[1];
                    return fixer.insertTextAfterRange(
                      [tagEnd, tagEnd],
                      ` lang="${suggestedLang}"`,
                    );
                  }
                : undefined;

            context.report({
              node: element.node as TSESTree.Node,
              messageId: 'missingLang',
              ...(hasConfiguredLang && applyFix ? { fix: applyFix } : {}),
              ...(applyFix
                ? {
                    suggest: [
                      {
                        messageId: 'suggestLang',
                        data: { lang: suggestedLang },
                        fix: applyFix,
                      },
                    ],
                  }
                : {}),
            });
            return;
          }

          // Dynamic expression — can't evaluate, skip
          if (langAttr.value === null) return;

          const langValue = langAttr.value;

          // Empty or whitespace-only
          if (langValue.trim() === '') {
            context.report({
              node: element.node as TSESTree.Node,
              messageId: 'emptyLang',
            });
            return;
          }

          // Sanity check against BCP 47 shape
          if (!BCP47_SANITY.test(langValue.trim())) {
            context.report({
              node: element.node as TSESTree.Node,
              messageId: 'invalidLang',
              data: { lang: langValue },
            });
          }
        } catch (err) {
          debugLog('lang-attribute', err);
          return;
        }
      },
    });
  },
});
