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
    <h1 className="text-[#333] m-[7px] text-[18px] font-[700]">Title</h1>
    <p className={cn("bg-[#3b82f6]", "p-4 m-2")}>Content</p>
    <div className="sm:bg-[#00FF00] md:p-[16px] border-blue-500 leading-[24px]" />
    <span className="gap-[20px] w-[200px] h-[48px] tracking-[0.05em]" />
    <section className="w-[1200px] bg-white p-8" />
    <div className="bg-red-500 p-4 m-2 text-white rounded-lg" />
    <div className="flex items-center justify-between gap-4" />
    <div className="grid grid-cols-3 gap-6 p-8 text-sm font-bold" />
    <div className="text-gray-300 bg-gray-400 p-4">Poor contrast text</div>
    <input className="border rounded px-3 py-2" type="text" />
    <div className="bg-white text-black p-6">No dark mode variant</div>
    <div className="z-[999] absolute top-0 left-0">Arbitrary z-index</div>
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
        'vizlint/no-arbitrary-typography': 'error',
        'vizlint/responsive-required': 'error',
        'vizlint/consistent-component-spacing': 'error',
        'vizlint/a11y-color-contrast': 'error',
        'vizlint/max-component-lines': 'error',
        'vizlint/missing-states': 'error',
        'vizlint/dark-mode-coverage': 'error',
        'vizlint/no-arbitrary-zindex': 'error',
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
