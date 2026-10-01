import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ProfileForm } from '../src/features/profile/profile-form';
import { ProfileScreen } from '../src/features/profile/profile-screen';
import { signInPath, SignInScreen } from '../src/features/profile/sign-in-screen';

afterEach(() => {
  cleanup();
});

describe('sign in', () => {
  it('asks a guest to sign in and toasts a rejected session', async () => {
    const user = userEvent.setup();
    const on_sign_in = vi.fn();
    const { rerender } = render(<SignInScreen locale="en" status="default" on_sign_in={on_sign_in} />);
    await user.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(on_sign_in).toHaveBeenCalledOnce();
    expect(signInPath('AUTH_REQUIRED')).toBe('/sign-in');

    rerender(<SignInScreen locale="en" status="error" error_code="AUTH_REQUIRED" on_sign_in={on_sign_in} />);
    expect(await screen.findByText('Sign-in was not accepted')).toBeTruthy();
  });
});

describe('public profile', () => {
  it('shows saved fields and omits a biography that was not saved', () => {
    const { rerender } = render(
      <ProfileScreen
        locale="en"
        status="default"
        profile={{ username: 'ada', display_name: 'Ada Lovelace', biography: 'Writes essays', avatar_url: 'https://media.local/ada' }}
      />,
    );
    expect(screen.getByText('ada')).toBeTruthy();
    expect(screen.getByText('Ada Lovelace')).toBeTruthy();
    expect(screen.getByText('Writes essays')).toBeTruthy();
    expect(screen.getByRole('img', { name: 'ada' })).toBeTruthy();

    rerender(<ProfileScreen locale="en" status="default" profile={{ username: 'ada' }} />);
    expect(screen.queryByText('Writes essays')).toBeNull();
    expect(screen.queryByRole('img')).toBeNull();
  });

  it('follows and unfollows, and shows not-found', async () => {
    const user = userEvent.setup();
    const on_follow = vi.fn();
    const on_unfollow = vi.fn();
    const { rerender } = render(
      <ProfileScreen
        locale="en"
        status="default"
        profile={{ username: 'ada', following: false }}
        on_follow={on_follow}
        on_unfollow={on_unfollow}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Follow' }));
    expect(on_follow).toHaveBeenCalledOnce();

    rerender(
      <ProfileScreen
        locale="en"
        status="following"
        profile={{ username: 'ada', following: true }}
        on_follow={on_follow}
        on_unfollow={on_unfollow}
      />,
    );
    await user.click(screen.getByRole('button', { name: 'Unfollow' }));
    expect(on_unfollow).toHaveBeenCalledOnce();

    rerender(<ProfileScreen locale="en" status="not-found" profile={null} />);
    expect(screen.getByText('No user has this username')).toBeTruthy();
  });
});

describe('profile form', () => {
  it('blocks a taken username and a blank username', async () => {
    const user = userEvent.setup();
    const on_save = vi.fn();
    const { rerender } = render(<ProfileForm locale="en" status="default" username="" on_save={on_save} />);
    await user.click(screen.getByRole('button', { name: 'Save' }));
    expect(on_save).not.toHaveBeenCalled();
    expect(await screen.findByText('A username is required')).toBeTruthy();

    rerender(<ProfileForm locale="en" status="username-taken" username="ada" error_code="USERNAME_TAKEN" on_save={on_save} />);
    expect(await screen.findByText('That username is already taken')).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Username' })).toBeTruthy();
  });
});
