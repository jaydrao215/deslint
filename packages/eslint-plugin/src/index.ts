import noArbitraryColors from './rules/no-arbitrary-colors.js';
import noArbitrarySpacing from './rules/no-arbitrary-spacing.js';
import noArbitraryTypography from './rules/no-arbitrary-typography.js';
import responsiveRequired from './rules/responsive-required.js';

const plugin = {
  meta: {
    name: 'eslint-plugin-vizlint',
    version: '0.1.0',
  },
  rules: {
    'no-arbitrary-colors': noArbitraryColors,
    'no-arbitrary-spacing': noArbitrarySpacing,
    'no-arbitrary-typography': noArbitraryTypography,
    'responsive-required': responsiveRequired,
    // Sprint 4: 'consistent-component-spacing'
  },
  configs: {} as Record<string, any>,
};

// Flat config presets (ESLint v10+ only)
plugin.configs.recommended = {
  plugins: { vizlint: plugin },
  rules: {
    'vizlint/no-arbitrary-colors': 'warn',
    'vizlint/no-arbitrary-spacing': 'warn',
    'vizlint/no-arbitrary-typography': 'warn',
    'vizlint/responsive-required': 'warn',
    // Sprint 4: 'vizlint/consistent-component-spacing': 'warn',
  },
};

plugin.configs.strict = {
  plugins: { vizlint: plugin },
  rules: {
    'vizlint/no-arbitrary-colors': 'error',
    'vizlint/no-arbitrary-spacing': 'error',
    'vizlint/no-arbitrary-typography': 'error',
    'vizlint/responsive-required': 'error',
  },
};

export default plugin;
