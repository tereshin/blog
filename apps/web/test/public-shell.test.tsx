import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PublicShell } from '../app/public-shell';

describe('public shell theme and interface language', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
    document.documentElement.lang = 'en';
  });

  afterEach(() => {
    cleanup();
  });

  it('starts on the system theme and the three theme choices', async () => {
    render(
      <PublicShell>
        <p>child</p>
      </PublicShell>,
    );

    expect(await screen.findByRole('button', { name: 'System', pressed: true })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Light' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Dark' })).toBeTruthy();
    expect(screen.getByText('child')).toBeTruthy();
  });

  it('keeps a dark theme on a later visit', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <PublicShell>
        <p>child</p>
      </PublicShell>,
    );

    await user.click(await screen.findByRole('button', { name: 'Dark' }));

    expect(localStorage.getItem('blog.theme')).toBe('dark');
    expect(document.documentElement.classList.contains('dark')).toBe(true);
    unmount();

    render(
      <PublicShell>
        <p>child</p>
      </PublicShell>,
    );

    expect(await screen.findByRole('button', { name: 'Dark', pressed: true })).toBeTruthy();
  });

  it('switches among English, Serbian Latin, and Russian and falls back to English', async () => {
    const user = userEvent.setup();
    const { unmount } = render(
      <PublicShell>
        <p>child</p>
      </PublicShell>,
    );

    expect(await screen.findByText('Hello')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Serbian Latin' }));

    expect(await screen.findByText('Zdravo')).toBeTruthy();
    expect(screen.getByText('English fallback')).toBeTruthy();
    expect(localStorage.getItem('blog.interface-language')).toBe('sr-Latn');
    unmount();

    render(
      <PublicShell>
        <p>child</p>
      </PublicShell>,
    );

    expect(await screen.findByText('Zdravo')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Ruski' }));
    expect(await screen.findByText('Здравствуйте')).toBeTruthy();
    expect(screen.getByText('English fallback')).toBeTruthy();
  });
});
