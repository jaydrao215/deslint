import { ESLintUtils, type TSESTree } from '@typescript-eslint/utils';
import { debugLog } from '../utils/debug.js';

const createRule = ESLintUtils.RuleCreator(
  (name) => `https://deslint.com/docs/rules/${name}`
);

export type Options = [];
export type MessageIds = 'emptyCatch' | 'commentOnlyCatch';

/**
 * Catch the specific AI-coding shape: `try { … } catch {}` /
 * `catch (e) {}` / `catch (e) { /_ TODO _/ }` (real source uses
 * a block comment). These pass type-check, pass lint (sometimes),
 * and silently swallow errors at runtime — so the first user the
 * broken code path hits gets a blank page or a "nothing happened"
 * failure with no stack trace anywhere.
 *
 * ESLint's stock `no-empty` rule covers this conceptually but ships
 * with `allowEmptyCatch: false` defaulting to disabled in most
 * presets. We carry our own variant so the AI-mistake message is
 * specific and so the rule is on by default in the deslint preset.
 *
 * Two arms:
 *
 *   - `emptyCatch`        — body has no statements at all
 *   - `commentOnlyCatch`  — body has comments only (the TODO form)
 */
export default createRule<Options, MessageIds>({
  name: 'no-empty-catch',
  meta: {
    type: 'problem',
    docs: {
      description:
        'Forbid empty `catch` blocks (`catch {}`, `catch (e) {}`, `catch (e) { /* TODO */ }`). AI coding tools use this shape to silence the type checker without addressing the underlying error — the runtime failure then ships invisibly.',
    },
    schema: [],
    messages: {
      emptyCatch:
        'Empty `catch` block — the error is silently swallowed. Log it, re-throw with context, or handle the specific failure mode you expected.',
      commentOnlyCatch:
        '`catch` block contains only comments — runtime errors are still swallowed. Replace the comment with real handling (log + re-throw, fallback value, etc.).',
    },
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      CatchClause(node: TSESTree.CatchClause) {
        try {
          const body = node.body;
          if (!body || body.type !== 'BlockStatement') return;

          if (body.body.length > 0) return;

          // Block has no statements. Distinguish "truly empty" from
          // "contains only comments" so the report can point at the
          // exact AI pattern.
          const comments = sourceCode.getCommentsInside(body);
          const messageId: MessageIds =
            comments.length > 0 ? 'commentOnlyCatch' : 'emptyCatch';

          context.report({ node: body as TSESTree.Node, messageId });
        } catch (err) {
          debugLog('no-empty-catch', err);
        }
      },
    };
  },
});
