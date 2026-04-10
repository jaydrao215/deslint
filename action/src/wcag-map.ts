/**
 * Maps deslint rule IDs to their WCAG criterion for inline review comments.
 * Only rules with direct WCAG mappings are included.
 */

export interface WcagMapping {
  criterion: string;
  title: string;
  level: 'A' | 'AA' | 'AAA';
}

export const WCAG_RULE_MAP: Record<string, WcagMapping> = {
  'deslint/image-alt-text': {
    criterion: '1.1.1',
    title: 'Non-text Content',
    level: 'A',
  },
  'deslint/heading-hierarchy': {
    criterion: '1.3.1',
    title: 'Info and Relationships',
    level: 'A',
  },
  'deslint/autocomplete-attribute': {
    criterion: '1.3.5',
    title: 'Identify Input Purpose',
    level: 'AA',
  },
  'deslint/a11y-color-contrast': {
    criterion: '1.4.3',
    title: 'Contrast (Minimum)',
    level: 'AA',
  },
  'deslint/responsive-required': {
    criterion: '1.4.10',
    title: 'Reflow',
    level: 'AA',
  },
  'deslint/focus-visible-style': {
    criterion: '2.4.7',
    title: 'Focus Visible',
    level: 'AA',
  },
  'deslint/link-text': {
    criterion: '2.4.4',
    title: 'Link Purpose (In Context)',
    level: 'A',
  },
  'deslint/lang-attribute': {
    criterion: '3.1.1',
    title: 'Language of Page',
    level: 'A',
  },
  'deslint/aria-validation': {
    criterion: '4.1.2',
    title: 'Name, Role, Value',
    level: 'A',
  },
  'deslint/form-labels': {
    criterion: '1.3.1',
    title: 'Info and Relationships',
    level: 'A',
  },
  'deslint/viewport-meta': {
    criterion: '1.4.4',
    title: 'Resize Text',
    level: 'AA',
  },
  'deslint/touch-target-size': {
    criterion: '2.5.8',
    title: 'Target Size (Minimum)',
    level: 'AA',
  },
  'deslint/prefer-semantic-html': {
    criterion: '4.1.2',
    title: 'Name, Role, Value',
    level: 'A',
  },
};
