import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-hydration-mismatch.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester({
  languageOptions: {
    parserOptions: { ecmaFeatures: { jsx: true } },
  },
});

ruleTester.run('no-hydration-mismatch', rule, {
  valid: [
    // Static JSX.
    { code: '<div>Hello</div>' },
    // Deterministic computed value.
    { code: 'function C({ name }) { return <div>{name}</div>; }' },
    // new Date with a value — deterministic.
    {
      code: 'function C({ ts }) { return <time>{new Date(ts).toISOString()}</time>; }',
    },
    // Math.random outside JSX — fine.
    {
      code: 'function C() { const id = Math.random(); useEffect(() => setX(id)); return <div />; }',
    },
    // Inside useEffect callback.
    {
      code: `function C() {
        const [now, setNow] = useState(0);
        useEffect(() => {
          const t = setInterval(() => setNow(Date.now()), 1000);
          return () => clearInterval(t);
        }, []);
        return <div>{now}</div>;
      }`,
    },
    // Inside useLayoutEffect.
    {
      code: `function C() {
        useLayoutEffect(() => { console.log(Math.random()); }, []);
        return <div />;
      }`,
    },
    // React.useEffect — namespaced.
    {
      code: `function C() {
        React.useEffect(() => { console.log(Date.now()); }, []);
        return <div />;
      }`,
    },
    // Date with an argument inline — deterministic.
    {
      code: 'function C({ ts }) { return <p>{new Date(ts).toLocaleDateString()}</p>; }',
    },
  ],
  invalid: [
    // Math.random inline.
    {
      code: 'function C() { return <div key={Math.random()} />; }',
      errors: [{ messageId: 'nonDeterministicInJsx' }],
    },
    // Date.now inline.
    {
      code: 'function C() { return <span>{Date.now()}</span>; }',
      errors: [{ messageId: 'nonDeterministicInJsx' }],
    },
    // new Date() zero-arg inline.
    {
      code: 'function C() { return <time>{new Date().toLocaleTimeString()}</time>; }',
      errors: [{ messageId: 'nonDeterministicInJsx' }],
    },
    // performance.now inline.
    {
      code: 'function C() { return <p>{performance.now()}</p>; }',
      errors: [{ messageId: 'nonDeterministicInJsx' }],
    },
    // crypto.randomUUID inline.
    {
      code: 'function C() { return <input id={crypto.randomUUID()} />; }',
      errors: [{ messageId: 'nonDeterministicInJsx' }],
    },
    // Math.random nested inside a template literal in JSX.
    {
      code: 'function C() { return <div id={`item-${Math.random()}`} />; }',
      errors: [{ messageId: 'nonDeterministicInJsx' }],
    },
    // Object expression with non-deterministic value.
    {
      code: 'function C() { return <div style={{ opacity: Math.random() }} />; }',
      errors: [{ messageId: 'nonDeterministicInJsx' }],
    },
  ],
});
