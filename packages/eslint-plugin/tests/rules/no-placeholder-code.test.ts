import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-placeholder-code.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('no-placeholder-code', rule, {
  valid: [
    // Real error messages — fine.
    { code: 'throw new Error("User not found");' },
    { code: 'throw new TypeError("Expected a number");' },
    { code: 'throw new Error(`Invalid value: ${v}`);' },
    // Throwing a variable / dynamic message — we can't tell, stay quiet.
    { code: 'throw new Error(msg);' },
    // Throwing something that isn't an *Error.
    { code: 'throw "boom";' },
    { code: 'throw { code: 42 };' },
    // The literal text "Error" itself but in a sensible message.
    { code: 'throw new Error("Authentication error: invalid credentials");' },
  ],
  invalid: [
    {
      code: 'throw new Error("not implemented");',
      errors: [{ messageId: 'notImplemented' }],
    },
    {
      code: 'throw new Error("Not Implemented");',
      errors: [{ messageId: 'notImplemented' }],
    },
    {
      code: 'throw new Error("not yet implemented");',
      errors: [{ messageId: 'notImplemented' }],
    },
    {
      code: 'throw new Error("TODO: implement this");',
      errors: [{ messageId: 'todoThrow' }],
    },
    {
      code: 'throw new Error("FIXME: deal with edge case");',
      errors: [{ messageId: 'todoThrow' }],
    },
    {
      code: 'throw new Error("unimplemented");',
      errors: [{ messageId: 'notImplemented' }],
    },
    {
      code: 'throw new Error("Method not implemented.");',
      errors: [{ messageId: 'notImplemented' }],
    },
    {
      code: 'throw new TypeError("placeholder");',
      errors: [{ messageId: 'notImplemented' }],
    },
    // Template literal with no expressions still counts.
    {
      code: 'throw new Error(`Coming soon`);',
      errors: [{ messageId: 'notImplemented' }],
    },
  ],
});
