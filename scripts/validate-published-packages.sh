#!/usr/bin/env bash
# validate-published-packages.sh
#
# End-to-end validation of the Deslint packages against two real open-source
# Next.js + React + Tailwind projects (shadcn/taxonomy and vercel/ai-chatbot).
#
# Exercises every published surface from a clean install:
#   1. @deslint/cli       — scan, scan --budget, scan --diff, attest
#   2. @deslint/eslint-plugin — flat-config run via ESLint
#   3. @deslint/mcp       — stdio JSON-RPC (initialize, tools/list, enforce_budget)
#
# Default mode installs from local workspace tarballs so un-published changes
# are tested exactly as they would ship. Pass `--from-npm` to install from the
# npm registry instead (for verifying what users currently get).
#
# Usage:
#   scripts/validate-published-packages.sh                 # local tarballs
#   scripts/validate-published-packages.sh --from-npm      # registry versions

set -euo pipefail

FROM_NPM=0
if [[ "${1:-}" == "--from-npm" ]]; then FROM_NPM=1; fi

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
WORKSPACE="${DESLINT_VALIDATION_DIR:-/tmp/deslint-validation}"
TARBALLS="$WORKSPACE/tarballs"
RUNNER="$WORKSPACE/runner"
REPORT_DIR="$WORKSPACE/reports"

mkdir -p "$WORKSPACE" "$REPORT_DIR"

log() { printf '\n\033[1;35m==>\033[0m %s\n' "$*"; }

# --- 1. Build + pack the workspace (local mode only) -----------------------
if [[ $FROM_NPM -eq 0 ]]; then
  log "Building local packages"
  (cd "$REPO_ROOT" && pnpm -r \
    --filter @deslint/shared \
    --filter @deslint/eslint-plugin \
    --filter @deslint/cli \
    --filter @deslint/mcp \
    build >/dev/null)

  log "Packing local packages (rewriting workspace:* deps to literal versions)"
  rm -rf "$TARBALLS"; mkdir -p "$TARBALLS"
  for p in shared eslint-plugin cli mcp; do
    tmp=$(mktemp -d)
    (cd "$REPO_ROOT/packages/$p" && npm pack --pack-destination "$tmp" >/dev/null)
    src=$(ls "$tmp"/*.tgz)
    mkdir -p "$tmp/extract"
    tar -xzf "$src" -C "$tmp/extract"
    version=$(node -e "console.log(require('$REPO_ROOT/packages/$p/package.json').version)")
    node -e "
      const fs=require('fs'),path=require('path');
      const pj=path.join('$tmp/extract','package','package.json');
      const j=JSON.parse(fs.readFileSync(pj,'utf8'));
      for (const k of Object.keys(j.dependencies||{})) {
        if (/^workspace:/.test(j.dependencies[k])) j.dependencies[k]='$version';
      }
      fs.writeFileSync(pj, JSON.stringify(j,null,2));
    "
    (cd "$tmp/extract" && tar -czf "$TARBALLS/deslint-$p-$version.tgz" package)
    rm -rf "$tmp"
  done
  ls -la "$TARBALLS"
fi

# --- 2. Clean runner workspace --------------------------------------------
log "Provisioning runner workspace"
rm -rf "$RUNNER"; mkdir -p "$RUNNER"
if [[ $FROM_NPM -eq 1 ]]; then
  DEPS='"@deslint/shared":"latest","@deslint/eslint-plugin":"latest","@deslint/cli":"latest","@deslint/mcp":"latest"'
else
  V=$(node -e "console.log(require('$REPO_ROOT/packages/cli/package.json').version)")
  DEPS="\"@deslint/shared\":\"file:$TARBALLS/deslint-shared-$V.tgz\",\"@deslint/eslint-plugin\":\"file:$TARBALLS/deslint-eslint-plugin-$V.tgz\",\"@deslint/cli\":\"file:$TARBALLS/deslint-cli-$V.tgz\",\"@deslint/mcp\":\"file:$TARBALLS/deslint-mcp-$V.tgz\""
fi
cat >"$RUNNER/package.json" <<EOF
{
  "name": "deslint-runner",
  "version": "0.0.0",
  "private": true,
  "dependencies": { $DEPS, "eslint": "^10.2.1", "typescript-eslint": "^8.58.0" }
}
EOF
(cd "$RUNNER" && npm install --no-fund --no-audit --silent)
CLI="$RUNNER/node_modules/@deslint/cli/dist/index.js"
INSTALLED_VERSION=$(node "$CLI" --version)
log "Installed @deslint/cli = $INSTALLED_VERSION"

# --- 3. Clone the two test projects ---------------------------------------
clone_if_missing() {
  local name="$1" url="$2"
  if [[ ! -d "$WORKSPACE/$name/.git" ]]; then
    log "Cloning $name"
    git clone --depth 50 "$url" "$WORKSPACE/$name"
  else
    log "Reusing existing clone: $name"
  fi
}
clone_if_missing taxonomy    https://github.com/shadcn-ui/taxonomy.git
clone_if_missing ai-chatbot  https://github.com/vercel/ai-chatbot.git

# --- 4. CLI scan for each project -----------------------------------------
for project in taxonomy ai-chatbot; do
  log "deslint scan $project (JSON)"
  node "$CLI" scan "$WORKSPACE/$project" --format json --no-history \
    > "$REPORT_DIR/$project-scan.json" 2>/dev/null
  node -e "
    const j=JSON.parse(require('fs').readFileSync('$REPORT_DIR/$project-scan.json','utf8'));
    console.log('  score:', j.score?.overall, '| grade:', j.score?.grade);
    console.log('  files:', j.summary?.totalFiles, '| violations:', j.violations?.length, '| parseErrors:', j.summary?.parseErrors);
    const cats={}; (j.violations||[]).forEach(v=>{cats[v.ruleId]=(cats[v.ruleId]||0)+1});
    console.log('  distinct rules:', Object.keys(cats).length);
  "
done

# --- 5. CLI --budget + attest (uses taxonomy) -----------------------------
log "scan --budget (expect enforce=true, exit 1)"
mkdir -p "$WORKSPACE/taxonomy/.deslint"
cat >"$WORKSPACE/taxonomy/.deslint/budget.yml" <<'EOF'
enforce: true
minOverallScore: 95
maxViolations: 20
maxRuleViolations:
  deslint/prefers-reduced-motion: 10
  deslint/no-arbitrary-spacing: 5
  deslint/responsive-required: 5
EOF
set +e
node "$CLI" scan "$WORKSPACE/taxonomy" --budget "$WORKSPACE/taxonomy/.deslint/budget.yml" --no-history >"$REPORT_DIR/budget-run.txt" 2>&1
BUDGET_EXIT=$?
set -e
grep -E 'Budget:' "$REPORT_DIR/budget-run.txt" | head -1
echo "  exit code: $BUDGET_EXIT (expect: 1)"

log "deslint attest --stdout (JSON attestation)"
node "$CLI" attest "$WORKSPACE/taxonomy" --budget "$WORKSPACE/taxonomy/.deslint/budget.yml" --stdout \
  > "$REPORT_DIR/attestation.json" 2>/dev/null
node -e "
  const j=JSON.parse(require('fs').readFileSync('$REPORT_DIR/attestation.json','utf8'));
  console.log('  schema:', j.schema, '| files with sha256:', j.files?.length, '| budget.enforced:', j.budget?.enforced, '| breaches:', (j.budget?.breaches||[]).length);
"

log "scan --diff HEAD~50 (git-scoped scan)"
node "$CLI" scan "$WORKSPACE/taxonomy" --diff HEAD~50 --format json --no-history \
  > "$REPORT_DIR/diff-scan.json" 2>/dev/null
node -e "
  const j=JSON.parse(require('fs').readFileSync('$REPORT_DIR/diff-scan.json','utf8'));
  console.log('  diff-scoped violations:', j.violations?.length, '| files:', j.summary?.totalFiles);
"

# --- 6. ESLint plugin flat-config run -------------------------------------
log "ESLint plugin run on taxonomy (should match CLI rules)"
cat >"$WORKSPACE/taxonomy/eslint.config.mjs" <<EOF
import deslint from '$RUNNER/node_modules/@deslint/eslint-plugin/dist/index.js';
import tseslint from '$RUNNER/node_modules/typescript-eslint/dist/index.js';
export default [
  { ignores: ['**/node_modules/**','**/.next/**','**/.contentlayer/**','pages/**','prisma/**','public/**','lib/**','hooks/**','styles/**','content/**'] },
  {
    files: ['**/*.{ts,tsx,js,jsx}'],
    languageOptions: { parser: tseslint.parser, parserOptions: { ecmaFeatures: { jsx: true }, ecmaVersion: 'latest', sourceType: 'module' } },
    plugins: { deslint: deslint.configs.recommended.plugins.deslint },
    rules: deslint.configs.recommended.rules,
  },
];
EOF
(cd "$WORKSPACE/taxonomy" && "$RUNNER/node_modules/.bin/eslint" -f json "app/**/*.tsx" "components/**/*.tsx" > "$REPORT_DIR/eslint.json" 2>/dev/null) || true
node -e "
  const arr=JSON.parse(require('fs').readFileSync('$REPORT_DIR/eslint.json','utf8'));
  const cats={}; let total=0, parseErrors=0;
  for (const f of arr) for (const m of f.messages) { if (m.fatal) parseErrors++; else { cats[m.ruleId||'(no-rule)']=(cats[m.ruleId||'(no-rule)']||0)+1; total++; } }
  console.log('  files linted:', arr.length, '| messages:', total, '| parse errors:', parseErrors, '| distinct rules:', Object.keys(cats).length);
"

# --- 7. MCP stdio smoke test ----------------------------------------------
log "MCP server: initialize + tools/list + enforce_budget"
cat >"$WORKSPACE/mcp-smoke.mjs" <<'EOF'
import { spawn } from 'node:child_process';
import { once } from 'node:events';
const RUNNER = process.env.RUNNER;
const TAXONOMY = process.env.TAXONOMY;
const server = spawn('node', [`${RUNNER}/node_modules/@deslint/mcp/dist/cli.js`], { cwd: TAXONOMY, stdio: ['pipe','pipe','pipe'] });
server.stderr.on('data', () => {});
let buf=''; const pending=new Map();
server.stdout.on('data', c => { buf += c.toString(); let nl; while ((nl=buf.indexOf('\n'))!==-1) { const line=buf.slice(0,nl).trim(); buf=buf.slice(nl+1); if (!line) continue; try { const m=JSON.parse(line); if (m.id && pending.has(m.id)) { pending.get(m.id)(m); pending.delete(m.id); } } catch {} } });
const rpc = (method, params, id) => new Promise((res, rej) => { pending.set(id, res); server.stdin.write(JSON.stringify({ jsonrpc:'2.0', id, method, params }) + '\n'); setTimeout(() => { if (pending.has(id)) { pending.delete(id); rej(new Error('timeout: '+method)); } }, 30000); });
try {
  const init = await rpc('initialize', { protocolVersion: '2025-06-18', capabilities: {}, clientInfo: { name: 'deslint-smoke', version: '0.0.0' } }, 1);
  console.log('  MCP protocolVersion:', init.result?.protocolVersion, '| server:', init.result?.serverInfo?.name, init.result?.serverInfo?.version);
  server.stdin.write(JSON.stringify({ jsonrpc:'2.0', method:'notifications/initialized' }) + '\n');
  const tools = await rpc('tools/list', {}, 2);
  const names = (tools.result?.tools||[]).map(t=>t.name);
  console.log('  tools:', names.join(', '));
  const call = await rpc('tools/call', { name: 'enforce_budget', arguments: { projectDir: TAXONOMY, budgetPath: `${TAXONOMY}/.deslint/budget.yml` } }, 3);
  const res = JSON.parse(call.result?.content?.[0]?.text || '{}');
  console.log('  enforce_budget: allowed=', res.allowed, '| enforced=', res.enforced, '| reasons=', (res.reasons||[]).length);
} finally { server.kill('SIGTERM'); await once(server, 'exit').catch(()=>{}); }
EOF
RUNNER="$RUNNER" TAXONOMY="$WORKSPACE/taxonomy" node "$WORKSPACE/mcp-smoke.mjs"

log "All checks complete — reports in $REPORT_DIR"
