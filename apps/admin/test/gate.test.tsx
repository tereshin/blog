import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { AdminFrame } from '../src/shell/admin-frame';
import { AdminApp } from '../src/admin-app';
import { StaffGate } from '../src/features/gate/staff-gate';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
  document.documentElement.className = '';
  document.documentElement.removeAttribute('data-theme');
});

describe('staff gate', () => {
  it('asks for the second factor and keeps staff tools closed', () => {
    render(
      <StaffGate locale="en" status="default" on_confirm={() => undefined} />,
    );

    expect(screen.getByRole('button', { name: 'Confirm the second factor' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Complaints' })).toBeNull();
  });

  it('does not leave a refused user inside the panel', async () => {
    render(<StaffGate locale="en" status="refused" error_code="STAFF_FORBIDDEN" on_confirm={() => undefined} />);

    expect(await screen.findByText('You cannot use the admin panel')).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Complaints' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Confirm the second factor' })).toBeNull();
  });

  it('keeps the gate open when the second factor is missing', async () => {
    const on_confirm = vi.fn();
    render(<StaffGate locale="en" status="closed" error_code="STAFF_MFA_REQUIRED" on_confirm={on_confirm} />);

    expect(await screen.findByText('Confirm a second factor before using staff tools')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Confirm the second factor' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: 'Complaints' })).toBeNull();
  });
});

describe('admin theme', () => {
  it('stores the chosen theme and falls back to English', async () => {
    const user = userEvent.setup();
    render(
      <AdminFrame>
        <StaffGate locale="en" status="default" on_confirm={() => undefined} />
      </AdminFrame>,
    );

    expect(await screen.findByRole('button', { name: 'System', pressed: true })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Light' }));
    expect(localStorage.getItem('blog.theme')).toBe('light');
    expect(document.documentElement.classList.contains('light')).toBe(true);

    await user.click(screen.getByRole('button', { name: 'Russian' }));
    expect(localStorage.getItem('blog.interface-language')).toBe('ru');
    expect(await screen.findByText('Здравствуйте')).toBeTruthy();
    expect(screen.getByText('English fallback')).toBeTruthy();
  });

  it('translates the gate when the interface language changes', async () => {
    const user = userEvent.setup();
    render(<AdminApp />);

    await user.click(screen.getByRole('button', { name: 'Russian' }));
    expect(await screen.findByRole('button', { name: 'Подтвердите второй фактор' })).toBeTruthy();
    expect(screen.getByText('English fallback')).toBeTruthy();
  });
});
