import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-shell-injection.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('no-shell-injection', rule, {
  valid: [
    // Hardcoded command — no dynamic operand at all.
    { code: 'exec("ls -la");' },
    { code: 'execSync("git status");' },
    { code: 'exec(`pwd`);' },
    // Safe argv form — no shell, even with dynamic args.
    { code: 'execFile("/usr/bin/git", ["clone", repoUrl]);' },
    { code: 'spawn("node", ["script.js", filename]);' },
    // spawn with shell: false explicitly — argv form.
    { code: 'spawn(cmd, [arg], { shell: false });' },
    // spawn without `shell` option at all — no shell parsing happens.
    { code: 'spawn(cmd, args);' },
    // Non-shell function with similar name.
    { code: 'this.exec("noop");' },
    // RegExp.exec — same method name, different receiver. Must not fire.
    { code: 'const m = this.regexp.exec(path);' },
    { code: 'const m = pattern.exec(input);' },
    { code: 'const m = /^GET/.exec(line);' },
  ],
  invalid: [
    // Classic — interpolation into exec.
    {
      code: 'exec(`ls ${dir}`);',
      errors: [{ messageId: 'execWithDynamicCommand', data: { fn: 'exec' } }],
    },
    // Concat into exec.
    {
      code: 'exec("rm -rf " + path);',
      errors: [{ messageId: 'execWithDynamicCommand' }],
    },
    // execSync with dynamic arg.
    {
      code: 'execSync(`git log ${ref}`);',
      errors: [{ messageId: 'execWithDynamicCommand', data: { fn: 'execSync' } }],
    },
    // Identifier arg — still dynamic.
    {
      code: 'exec(cmd);',
      errors: [{ messageId: 'execWithDynamicCommand' }],
    },
    // Member expression arg.
    {
      code: 'execSync(req.body.command);',
      errors: [{ messageId: 'execWithDynamicCommand' }],
    },
    // spawn with shell:true + dynamic command.
    {
      code: 'spawn(`echo ${msg}`, [], { shell: true });',
      errors: [{ messageId: 'shellTrueWithDynamic' }],
    },
    // execFile with shell:true and dynamic argv element.
    {
      code: 'execFile("sh", ["-c", "rm " + path], { shell: true });',
      errors: [{ messageId: 'shellTrueWithDynamic' }],
    },
    // child_process.exec namespaced call.
    {
      code: 'child_process.exec(`tar xf ${file}`);',
      errors: [{ messageId: 'execWithDynamicCommand' }],
    },
  ],
});
