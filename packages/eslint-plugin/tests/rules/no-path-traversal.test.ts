import { RuleTester } from '@typescript-eslint/rule-tester';
import { describe, it, afterAll } from 'vitest';
import rule from '../../src/rules/no-path-traversal.js';

RuleTester.afterAll = afterAll;
RuleTester.describe = describe;
RuleTester.it = it;

const ruleTester = new RuleTester();

ruleTester.run('no-path-traversal', rule, {
  valid: [
    // Hardcoded paths.
    { code: 'fs.readFile("/etc/config", cb);' },
    { code: 'fs.readFileSync(`./data/static.json`, "utf8");' },
    { code: 'res.sendFile("/var/www/index.html");' },
    { code: 'res.sendFile(path.join(__dirname, "public", "index.html"));' },
    // Path built from server-loaded resources, not user input.
    { code: 'fs.readFile(path.join(__dirname, req.user.documentPath), cb);' },
    { code: 'res.sendFile(uploadsDir + "/" + req.pet.filename);' },
    // Allowlist-derived.
    { code: 'fs.readFile(ALLOWED_FILES[req.query.id], cb);' },
    // Functions on non-fs receivers — must not fire (we have no receiver, so generic names are skipped).
    { code: 'lodash.join([1,2,3], "-");' },
    // path.join WITHOUT request input.
    { code: 'path.join(__dirname, "public", "index.html");' },
    // Bare `join`/`resolve` is too generic to flag without an fs receiver.
    { code: 'join(req.query.x, req.query.y);' },
  ],
  invalid: [
    // Classic — req.query.file straight into readFile.
    {
      code: 'fs.readFile(req.query.file, cb);',
      errors: [{ messageId: 'pathTraversal' }],
    },
    // req.params.name into readFileSync.
    {
      code: 'const buf = fs.readFileSync(req.params.name);',
      errors: [{ messageId: 'pathTraversal' }],
    },
    // Template concat with body field.
    {
      code: 'fs.createReadStream(`/uploads/${req.body.filename}`);',
      errors: [{ messageId: 'pathTraversal' }],
    },
    // path.join concatenating user input.
    {
      code: 'const p = path.join("/uploads", req.query.f);',
      errors: [{ messageId: 'pathTraversal' }],
    },
    // path.resolve with body data.
    {
      code: 'const p = path.resolve(__dirname, req.body.target);',
      errors: [{ messageId: 'pathTraversal' }],
    },
    // res.sendFile.
    {
      code: 'app.get("/file", (req, res) => res.sendFile(req.query.name));',
      errors: [{ messageId: 'sendFileTraversal' }],
    },
    // res.download.
    {
      code: 'res.download(req.params.path);',
      errors: [{ messageId: 'sendFileTraversal' }],
    },
    // fs.promises shape.
    {
      code: 'await fsPromises.readFile(req.query.file);',
      errors: [{ messageId: 'pathTraversal' }],
    },
    // Concat — string + dynamic.
    {
      code: 'fs.writeFile("/uploads/" + req.body.name, data, cb);',
      errors: [{ messageId: 'pathTraversal' }],
    },
    // unlink / rm of a user-supplied path.
    {
      code: 'fs.unlink(req.query.target, cb);',
      errors: [{ messageId: 'pathTraversal' }],
    },
    // request.headers.get('X-File') flow.
    {
      code: 'fs.readFile(request.headers.get("X-File"), cb);',
      errors: [{ messageId: 'pathTraversal' }],
    },
  ],
});
