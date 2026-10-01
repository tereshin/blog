import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BlockScreen } from '../src/features/block/block-screen';

const user_id = '018f3c2a-7b10-7c3e-8f21-0000000000b2';

afterEach(() => {
  cleanup();
});

describe('block account', () => {
  it('blocks a block that has no reason', async () => {
    const user = userEvent.setup();
    const on_block = vi.fn();
    render(
      <BlockScreen
        locale="en"
        status="reason-required"
        user_id={user_id}
        blocked={false}
        error_code="REASON_REQUIRED"
        on_block={on_block}
        on_lift={() => undefined}
      />,
    );

    expect(await screen.findByText('A reason must be present')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Block' }));
    expect(on_block).not.toHaveBeenCalled();
  });

  it('offers a lift after the account is blocked', () => {
    render(
      <BlockScreen
        locale="en"
        status="blocked"
        user_id={user_id}
        blocked
        on_block={() => undefined}
        on_lift={() => undefined}
      />,
    );

    expect(screen.getByText(user_id)).toBeTruthy();
    expect(screen.getByText('This account is blocked')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Lift block' })).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Block' })).toBeNull();
  });

  it('shows the block is lifted', () => {
    render(
      <BlockScreen
        locale="en"
        status="lifted"
        user_id={user_id}
        blocked={false}
        on_block={() => undefined}
        on_lift={() => undefined}
      />,
    );

    expect(screen.getByText('The block is lifted')).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Block' })).toBeTruthy();
  });
});
