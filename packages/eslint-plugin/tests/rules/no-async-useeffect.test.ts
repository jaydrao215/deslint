import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-async-useeffect.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('no-async-useeffect', rule, {
  valid: [
    // Sync effect — fine.
    { code: 'useEffect(() => { doThing(); }, []);' },
    // IIFE-wrapped async — the recommended pattern.
    {
      code: `useEffect(() => {
        (async () => { await load(); })();
      }, []);`,
    },
    // Inner-named async fn — also fine.
    {
      code: `useEffect(() => {
        async function go() { await load(); }
        go();
      }, []);`,
    },
    // Sync effect that returns a cleanup.
    { code: 'useEffect(() => { const id = setInterval(tick, 1000); return () => clearInterval(id); }, []);' },
    // Other hook (useMemo) with async — not our concern; flagged
    // elsewhere if at all.
    { code: 'useMemo(async () => await heavy(), []);' },
    // Function declaration — not an effect call.
    { code: 'async function load() { await fetch("/"); }' },
  ],
  invalid: [
    // Classic AI mistake.
    {
      code: 'useEffect(async () => { await load(); }, []);',
      errors: [{ messageId: 'asyncEffect', data: { hook: 'useEffect' } }],
    },
    // Async arrow with implicit return.
    {
      code: 'useEffect(async () => fetch("/api"), []);',
      errors: [{ messageId: 'asyncEffect' }],
    },
    // Async function expression form.
    {
      code: 'useEffect(async function () { await load(); }, []);',
      errors: [{ messageId: 'asyncEffect' }],
    },
    // useLayoutEffect.
    {
      code: 'useLayoutEffect(async () => { await measure(); }, []);',
      errors: [{ messageId: 'asyncEffect', data: { hook: 'useLayoutEffect' } }],
    },
    // useInsertionEffect.
    {
      code: 'useInsertionEffect(async () => { await inject(); }, []);',
      errors: [{ messageId: 'asyncEffect' }],
    },
    // React.useEffect — namespaced.
    {
      code: 'React.useEffect(async () => { await load(); }, []);',
      errors: [{ messageId: 'asyncEffect', data: { hook: 'useEffect' } }],
    },
    // Community alias useIsomorphicLayoutEffect.
    {
      code: 'useIsomorphicLayoutEffect(async () => { await measure(); }, []);',
      errors: [{ messageId: 'asyncEffect' }],
    },
  ],
});
