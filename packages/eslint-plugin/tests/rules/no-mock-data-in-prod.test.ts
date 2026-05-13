import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-mock-data-in-prod.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('no-mock-data-in-prod', rule, {
  valid: [
    // Real-shaped variables.
    { code: 'const users = await loadUsers();' },
    { code: 'const filters = { region, tier };' },
    // Real-sounding constant array — not a mock name.
    { code: 'const SUPPORTED_LOCALES = ["en", "fr", "de"];' },
    // Mock-named but not a literal collection — runtime value.
    { code: 'const mockUsers = await db.users.findAll();' },
    // Inside a test path.
    {
      filename: 'src/__tests__/user.test.ts',
      code: 'const mockUsers = [{ id: 1, name: "Alice" }];',
    },
    {
      filename: 'tests/fixtures/users.ts',
      code: 'export const mockUsers = [{ id: 1 }];',
    },
    {
      filename: 'src/components/Card.stories.ts',
      code: 'export const sampleData = [{ id: 1, name: "Acme" }];',
    },
    // Non-placeholder email.
    { code: 'const support = "support@deslint.com";' },
    // Mock-name regex variant — the `test` prefix on its own is too noisy.
    { code: 'const test = "ok";' },
  ],
  invalid: [
    // Classic mock array.
    {
      code: 'const mockUsers = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];',
      errors: [{ messageId: 'mockNamedDeclaration' }],
    },
    // Mock object.
    {
      code: 'const fakeUser = { id: 1, name: "Test" };',
      errors: [{ messageId: 'mockNamedDeclaration' }],
    },
    // Seed data.
    {
      code: 'export const seedUsers = [{ id: 1 }, { id: 2 }];',
      errors: [{ messageId: 'mockNamedDeclaration' }],
    },
    // Sample.
    {
      code: 'const sampleOrders = [{ id: 1, total: 100 }];',
      errors: [{ messageId: 'mockNamedDeclaration' }],
    },
    // dummy.
    {
      code: 'const dummyConfig = { feature: true };',
      errors: [{ messageId: 'mockNamedDeclaration' }],
    },
    // Object.freeze wrapper.
    {
      code: 'const mockUsers = Object.freeze([{ id: 1 }]);',
      errors: [{ messageId: 'mockNamedDeclaration' }],
    },
    // As const.
    {
      code: 'const mockUsers = [{ id: 1 }] as const;',
      errors: [{ messageId: 'mockNamedDeclaration' }],
    },
    // Placeholder email literal anywhere.
    {
      code: 'const defaultAdmin = "admin@example.com";',
      errors: [{ messageId: 'placeholderEmail' }],
    },
    // John Doe / Jane Smith pattern.
    {
      code: 'const user = { email: "john.doe@example.com", role: "admin" };',
      errors: [{ messageId: 'placeholderEmail' }],
    },
    {
      code: 'const u = "jane.smith@test.com";',
      errors: [{ messageId: 'placeholderEmail' }],
    },
    // Template literal with placeholder.
    {
      code: 'const greet = `Hi user@example.com`;',
      errors: [{ messageId: 'placeholderEmail' }],
    },
    // Custom extra-names option.
    {
      code: 'const lorem = [{ id: 1 }];',
      options: [{ extraNames: ['^lorem$'] }],
      errors: [{ messageId: 'mockNamedDeclaration' }],
    },
  ],
});
