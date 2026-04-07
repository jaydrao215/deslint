import noArbitraryColors from './rules/no-arbitrary-colors.js';
import noArbitrarySpacing from './rules/no-arbitrary-spacing.js';
import noArbitraryTypography from './rules/no-arbitrary-typography.js';
import responsiveRequired from './rules/responsive-required.js';
import consistentComponentSpacing from './rules/consistent-component-spacing.js';
import a11yColorContrast from './rules/a11y-color-contrast.js';
import maxComponentLines from './rules/max-component-lines.js';
import missingStates from './rules/missing-states.js';
import darkModeCoverage from './rules/dark-mode-coverage.js';
import noArbitraryZindex from './rules/no-arbitrary-zindex.js';
import noInlineStyles from './rules/no-inline-styles.js';
import consistentBorderRadius from './rules/consistent-border-radius.js';
import imageAltText from './rules/image-alt-text.js';
import noMagicNumbersLayout from './rules/no-magic-numbers-layout.js';

import { createRequire } from 'node:module';
const _require = createRequire(import.meta.url);
const _pkg = _require('../package.json') as { version: string };

const plugin = {
  meta: {
    name: '@vizlint/eslint-plugin',
    version: _pkg.version,
  },
  rules: {
    'no-arbitrary-colors': noArbitraryColors,
    'no-arbitrary-spacing': noArbitrarySpacing,
    'no-arbitrary-typography': noArbitraryTypography,
    'responsive-required': responsiveRequired,
    'consistent-component-spacing': consistentComponentSpacing,
    'a11y-color-contrast': a11yColorContrast,
    'max-component-lines': maxComponentLines,
    'missing-states': missingStates,
    'dark-mode-coverage': darkModeCoverage,
    'no-arbitrary-zindex': noArbitraryZindex,
    'no-inline-styles': noInlineStyles,
    'consistent-border-radius': consistentBorderRadius,
    'image-alt-text': imageAltText,
    'no-magic-numbers-layout': noMagicNumbersLayout,
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
    'vizlint/max-component-lines': 'off',
    'vizlint/missing-states': 'off',
    'vizlint/dark-mode-coverage': 'off',
    'vizlint/no-arbitrary-zindex': 'warn',
    'vizlint/no-inline-styles': 'off',
    'vizlint/consistent-border-radius': 'warn',
    'vizlint/image-alt-text': 'warn',
    'vizlint/no-magic-numbers-layout': 'warn',
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
    'vizlint/max-component-lines': 'error',
    'vizlint/missing-states': 'error',
    'vizlint/dark-mode-coverage': 'error',
    'vizlint/no-arbitrary-zindex': 'error',
    'vizlint/no-inline-styles': 'error',
    'vizlint/consistent-border-radius': 'error',
    'vizlint/image-alt-text': 'error',
    'vizlint/no-magic-numbers-layout': 'error',
  },
};

export default plugin;
