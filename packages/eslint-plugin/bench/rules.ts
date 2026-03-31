/**
 * Simple rule performance benchmark.
 * Budget: each rule must process a file in < 2ms.
 * Runs via: pnpm --filter eslint-plugin-vizlint bench
 */

import { ESLint } from 'eslint';
import plugin from '../src/index.js';

const SAMPLE_CODE = `
const App = () => (
  <div className="bg-[#FF0000] p-[13px] text-white">
    <h1 className="text-[#333] m-[7px]">Title</h1>
    <p className={cn("bg-[#3b82f6]", "p-4 m-2")}>Content</p>
    <div className="sm:bg-[#00FF00] md:p-[16px] border-blue-500" />
    <span className="gap-[20px] w-[200px] h-[48px]" />
    <div className="bg-red-500 p-4 m-2 text-white rounded-lg" />
    <div className="flex items-center justify-between gap-4" />
    <div className="grid grid-cols-3 gap-6 p-8" />
  </div>
);
export default App;
`;

const ITERATIONS = 100;

async function bench() {
  const eslint = new ESLint({
    overrideConfigFile: true,
    overrideConfig: {
      plugins: { vizlint: plugin as any },
      rules: {
        'vizlint/no-arbitrary-colors': 'error',
        'vizlint/no-arbitrary-spacing': 'error',
      },
      languageOptions: {
        parserOptions: { ecmaFeatures: { jsx: true } },
      },
    },
  });

  // Warmup
  await eslint.lintText(SAMPLE_CODE, { filePath: 'warmup.tsx' });

  // Benchmark
  const start = performance.now();
  for (let i = 0; i < ITERATIONS; i++) {
    await eslint.lintText(SAMPLE_CODE, { filePath: `bench-${i}.tsx` });
  }
  const elapsed = performance.now() - start;
  const perFile = elapsed / ITERATIONS;

  console.log(`\n  Rule Benchmark Results`);
  console.log(`  ─────────────────────`);
  console.log(`  Files:    ${ITERATIONS}`);
  console.log(`  Total:    ${elapsed.toFixed(1)}ms`);
  console.log(`  Per file: ${perFile.toFixed(2)}ms`);
  console.log(`  Budget:   < 2ms per file`);
  console.log(`  Status:   ${perFile < 2 ? 'PASS ✓' : 'FAIL ✗'}\n`);

  if (perFile >= 2) {
    process.exit(1);
  }
}

bench().catch((err) => {
  console.error('Benchmark failed:', err);
  process.exit(1);
});
