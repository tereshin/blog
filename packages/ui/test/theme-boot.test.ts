import { describe, expect, it } from 'vitest';
import { theme_boot_script } from '../src/theme-boot';

describe('theme boot script', () => {
  it('applies a stored dark theme before paint', () => {
    localStorage.setItem('blog.theme', 'dark');

    eval(theme_boot_script);

    expect(document.documentElement.classList.contains('dark')).toBe(true);
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
  });

  it('keeps system as the theme when nothing is stored', () => {
    localStorage.removeItem('blog.theme');

    eval(theme_boot_script);

    expect(document.documentElement.classList.contains('dark')).toBe(false);
    expect(document.documentElement.classList.contains('light')).toBe(false);
  });
});
