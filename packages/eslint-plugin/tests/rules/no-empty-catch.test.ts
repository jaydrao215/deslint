import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-empty-catch.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('no-empty-catch', rule, {
  valid: [
    // Real handling — logged.
    { code: 'try { doThing(); } catch (e) { console.error(e); }' },
    // Real handling — re-thrown with context.
    { code: 'try { doThing(); } catch (e) { throw new Error("Wrapped: " + e.message); }' },
    // Fallback value.
    { code: 'let x; try { x = parse(s); } catch (e) { x = null; }' },
    // Optional catch binding with real body.
    { code: 'try { doThing(); } catch { fallback(); }' },
    // Re-thrown bare.
    { code: 'try { doThing(); } catch (e) { throw e; }' },
  ],
  invalid: [
    // Classic AI mistake — empty catch, no binding.
    {
      code: 'try { doThing(); } catch {}',
      errors: [{ messageId: 'emptyCatch' }],
    },
    // Empty catch with binding.
    {
      code: 'try { doThing(); } catch (e) {}',
      errors: [{ messageId: 'emptyCatch' }],
    },
    // Whitespace-only body — still empty.
    {
      code: 'try { doThing(); } catch (e) {\n  \n  \n}',
      errors: [{ messageId: 'emptyCatch' }],
    },
    // Comment-only body.
    {
      code: 'try { doThing(); } catch (e) { /* TODO */ }',
      errors: [{ messageId: 'commentOnlyCatch' }],
    },
    // Single-line comment in body.
    {
      code: 'try { doThing(); } catch (e) {\n  // ignore\n}',
      errors: [{ messageId: 'commentOnlyCatch' }],
    },
    // Multi-comment, no code.
    {
      code: 'try { doThing(); } catch (e) {\n  // FIXME: handle this\n  // for now we ignore\n}',
      errors: [{ messageId: 'commentOnlyCatch' }],
    },
  ],
});
