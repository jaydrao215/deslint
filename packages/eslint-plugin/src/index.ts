import noArbitraryColors from './rules/no-arbitrary-colors.js';

const plugin = {
  meta: {
    name: 'eslint-plugin-vizlint',
    version: '0.1.0',
  },
  rules: {
    'no-arbitrary-colors': noArbitraryColors,
    // Sprint 2: 'no-arbitrary-spacing'
    // Sprint 2: 'typography-scale'
    // Sprint 3: 'responsive-required'
    // Sprint 3: 'consistent-component-spacing'
  },
  configs: {} as Record<string, any>,
};

// Flat config presets (ESLint v10+ only)
plugin.configs.recommended = {
  plugins: { vizlint: plugin },
  rules: {
    'vizlint/no-arbitrary-colors': 'warn',
    // Added as rules ship:
    // 'vizlint/no-arbitrary-spacing': 'warn',
    // 'vizlint/typography-scale': 'warn',
    // 'vizlint/responsive-required': 'warn',
    // 'vizlint/consistent-component-spacing': 'warn',
  },
};

plugin.configs.strict = {
  plugins: { vizlint: plugin },
  rules: {
    'vizlint/no-arbitrary-colors': 'error',
  },
};

export default plugin;
