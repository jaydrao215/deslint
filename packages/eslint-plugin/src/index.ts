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
import langAttribute from './rules/lang-attribute.js';
import viewportMeta from './rules/viewport-meta.js';
import headingHierarchy from './rules/heading-hierarchy.js';

import { createRequire } from 'node:module';
const _require = createRequire(import.meta.url);
const _pkg = _require('../package.json') as { version: string };

const plugin = {
  meta: {
    name: '@deslint/eslint-plugin',
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
    'lang-attribute': langAttribute,
    'viewport-meta': viewportMeta,
    'heading-hierarchy': headingHierarchy,
  },
  configs: {} as Record<string, any>,
};

// Flat config presets (ESLint v10+ only)
plugin.configs.recommended = {
  plugins: { deslint: plugin },
  rules: {
    'deslint/no-arbitrary-colors': 'warn',
    'deslint/no-arbitrary-spacing': 'warn',
    'deslint/no-arbitrary-typography': 'warn',
    'deslint/responsive-required': 'warn',
    'deslint/consistent-component-spacing': 'warn',
    'deslint/a11y-color-contrast': 'warn',
    'deslint/max-component-lines': 'off',
    'deslint/missing-states': 'off',
    'deslint/dark-mode-coverage': 'off',
    'deslint/no-arbitrary-zindex': 'warn',
    'deslint/no-inline-styles': 'off',
    'deslint/consistent-border-radius': 'warn',
    'deslint/image-alt-text': 'warn',
    'deslint/no-magic-numbers-layout': 'warn',
    'deslint/lang-attribute': 'warn',
    'deslint/viewport-meta': 'error',
    'deslint/heading-hierarchy': 'warn',
  },
};

plugin.configs.strict = {
  plugins: { deslint: plugin },
  rules: {
    'deslint/no-arbitrary-colors': 'error',
    'deslint/no-arbitrary-spacing': 'error',
    'deslint/no-arbitrary-typography': 'error',
    'deslint/responsive-required': 'error',
    'deslint/consistent-component-spacing': 'error',
    'deslint/a11y-color-contrast': 'error',
    'deslint/max-component-lines': 'error',
    'deslint/missing-states': 'error',
    'deslint/dark-mode-coverage': 'error',
    'deslint/no-arbitrary-zindex': 'error',
    'deslint/no-inline-styles': 'error',
    'deslint/consistent-border-radius': 'error',
    'deslint/image-alt-text': 'error',
    'deslint/no-magic-numbers-layout': 'error',
    'deslint/lang-attribute': 'error',
    'deslint/viewport-meta': 'error',
    'deslint/heading-hierarchy': 'error',
  },
};

export default plugin;
