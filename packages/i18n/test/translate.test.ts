import { describe, expect, it } from 'vitest';
import { shell_catalog } from '../src/features/shell/catalog';
import { translate } from '../src/translate';

describe('interface language', () => {
  it('uses Serbian Latin when that catalog has the string', () => {
    expect(translate('sr-Latn', 'shell.greeting', shell_catalog)).toBe('Zdravo');
  });

  it('uses Russian when that catalog has the string', () => {
    expect(translate('ru', 'shell.greeting', shell_catalog)).toBe('Здравствуйте');
  });

  it('falls back to English when the chosen language has no string', () => {
    expect(translate('sr-Latn', 'shell.english_only', shell_catalog)).toBe(
      'English fallback',
    );
    expect(translate('ru', 'shell.english_only', shell_catalog)).toBe(
      'English fallback',
    );
  });
});
