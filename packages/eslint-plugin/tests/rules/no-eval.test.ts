import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-eval.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('no-eval', rule, {
  valid: [
    // Non-eval timer arg.
    { code: 'setTimeout(() => { doThing(); }, 100);' },
    { code: 'setInterval(handler, 1000);' },
    // Unrelated methods on a non-vm receiver.
    { code: 'helpers.runInNewContext(payload);' },
    { code: 'myVm.runInNewContext(payload);' }, // myVm not in known list
    // JSON.parse — the right tool.
    { code: 'const data = JSON.parse(req.body.json);' },
    // .eval as a method on a non-global object — not the global eval.
    { code: 'expr.eval(env);' },
  ],
  invalid: [
    // eval with a dynamic arg.
    {
      code: 'const out = eval(req.body.code);',
      errors: [{ messageId: 'evalDynamic' }],
    },
    // eval with a static arg.
    {
      code: 'eval("2 + 2");',
      errors: [{ messageId: 'evalAny' }],
    },
    // eval with concat.
    {
      code: 'eval("return " + x);',
      errors: [{ messageId: 'evalDynamic' }],
    },
    // new Function with dynamic body.
    {
      code: 'const fn = new Function("x", "y", body);',
      errors: [{ messageId: 'newFunctionDynamic' }],
    },
    // new Function with literal body — still flagged.
    {
      code: 'const fn = new Function("x", "return x + 1");',
      errors: [{ messageId: 'newFunctionDynamic' }],
    },
    // vm.runInNewContext.
    {
      code: 'vm.runInNewContext(req.body.script);',
      errors: [{ messageId: 'vmDynamic', data: { method: 'runInNewContext' } }],
    },
    // vm.runInThisContext.
    {
      code: 'vm.runInThisContext(code);',
      errors: [{ messageId: 'vmDynamic' }],
    },
    // setTimeout with string body.
    {
      code: 'setTimeout("alert(\'hi\')", 100);',
      errors: [{ messageId: 'evalAny' }],
    },
    // setTimeout with template literal body.
    {
      code: 'setTimeout(`runUser(${userId})`, 100);',
      errors: [{ messageId: 'evalDynamic' }],
    },
    // setInterval with string body.
    {
      code: 'setInterval("poll()", 1000);',
      errors: [{ messageId: 'evalAny' }],
    },
  ],
});
