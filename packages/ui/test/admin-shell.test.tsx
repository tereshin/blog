import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it } from 'vitest';
import { AdminShell } from '../src/admin-shell';

describe('admin shell theme and interface language', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = '';
    document.documentElement.removeAttribute('data-theme');
  });

  it('uses the chosen theme and falls back to English', async () => {
    const user = userEvent.setup();

    render(
      <AdminShell>
        <p>staff</p>
      </AdminShell>,
    );

    expect(await screen.findByRole('button', { name: 'System', pressed: true })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Light' }));
    expect(localStorage.getItem('blog.theme')).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Russian' }));
    expect(await screen.findByText('Здравствуйте')).toBeTruthy();
    expect(screen.getByText('English fallback')).toBeTruthy();
    expect(screen.getByText('staff')).toBeTruthy();
  });
});
