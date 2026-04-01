import noArbitraryColors from './rules/no-arbitrary-colors.js';
import noArbitrarySpacing from './rules/no-arbitrary-spacing.js';
import noArbitraryTypography from './rules/no-arbitrary-typography.js';
import responsiveRequired from './rules/responsive-required.js';
import consistentComponentSpacing from './rules/consistent-component-spacing.js';
import a11yColorContrast from './rules/a11y-color-contrast.js';

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
    'consistent-component-spacing': consistentComponentSpacing,
    'a11y-color-contrast': a11yColorContrast,
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
    'vizlint/consistent-component-spacing': 'warn',
    'vizlint/a11y-color-contrast': 'warn',
  },
};

plugin.configs.strict = {
  plugins: { vizlint: plugin },
  rules: {
    'vizlint/no-arbitrary-colors': 'error',
    'vizlint/no-arbitrary-spacing': 'error',
    'vizlint/no-arbitrary-typography': 'error',
    'vizlint/responsive-required': 'error',
    'vizlint/consistent-component-spacing': 'error',
    'vizlint/a11y-color-contrast': 'error',
  },
};

export default plugin;
