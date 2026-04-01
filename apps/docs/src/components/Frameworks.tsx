'use client';

import { FadeIn } from './motion';

const FRAMEWORKS = [
  { name: 'React', sub: 'className', color: '#61DAFB' },
  { name: 'Next.js', sub: 'App Router', color: '#000000' },
  { name: 'Vue', sub: ':class bindings', color: '#42B883' },
  { name: 'Svelte', sub: 'class directives', color: '#FF3E00' },
  { name: 'Angular', sub: '[ngClass]', color: '#DD0031' },
  { name: 'HTML', sub: 'class attr', color: '#E34F26' },
];

export function Frameworks() {
  return (
    <section className="py-20 px-6 bg-white border-t border-gray-100">
      <div className="mx-auto max-w-5xl">
        <FadeIn className="text-center mb-12">
          <p className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
            Framework agnostic
          </p>
          <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-balance">
            Works everywhere Tailwind does
          </h2>
        </FadeIn>

        <FadeIn delay={0.2}>
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {FRAMEWORKS.map((fw) => (
              <div
                key={fw.name}
                className="group flex flex-col items-center gap-2.5 px-4 py-3 rounded-xl transition-all hover:bg-gray-50"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl bg-gray-50 border border-gray-100 text-lg font-bold group-hover:scale-110 transition-transform"
                  style={{ color: fw.color }}
                >
                  {fw.name[0]}
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold text-gray-900">{fw.name}</p>
                  <p className="text-xs text-gray-400">{fw.sub}</p>
                </div>
              </div>
            ))}
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
