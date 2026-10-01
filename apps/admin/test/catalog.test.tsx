import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CategoryScreen } from '../src/features/catalog/category-screen';
import { RoleScreen } from '../src/features/catalog/role-screen';
import { WeightsScreen } from '../src/features/catalog/weights-screen';

const seed = {
  views_weight: 1,
  likes_weight: 1,
  comments_weight: 1,
  bookmarks_weight: 1,
  age_decay: 1,
};

afterEach(() => {
  cleanup();
});

describe('categories', () => {
  it('requires English, Serbian Latin, and Russian names', async () => {
    const user = userEvent.setup();
    const on_create = vi.fn();
    render(
      <CategoryScreen
        locale="en"
        status="translations-required"
        role="administrator"
        error_code="CATEGORY_TRANSLATIONS_REQUIRED"
        on_create={on_create}
      />,
    );

    expect(await screen.findByText('English, Serbian Latin, and Russian names are required')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: 'Create category' }));
    expect(on_create).not.toHaveBeenCalled();
  });

  it('refuses a moderator', async () => {
    render(
      <CategoryScreen locale="en" status="admin-only" role="moderator" error_code="ADMIN_ONLY" on_create={() => undefined} />,
    );

    expect(await screen.findByText('A moderator cannot create a category')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Create category' })).toBeNull();
  });
});

describe('roles', () => {
  it('keeps the last administrator', async () => {
    const on_save = vi.fn();
    render(
      <RoleScreen
        locale="en"
        status="last-administrator"
        role="administrator"
        error_code="LAST_ADMINISTRATOR"
        on_save={on_save}
      />,
    );

    expect(await screen.findByText('One administrator must remain')).toBeTruthy();
    expect(on_save).not.toHaveBeenCalled();
  });
});

describe('popular weights', () => {
  it('refuses a moderator and keeps the seed until an administrator saves', async () => {
    const { rerender } = render(
      <WeightsScreen
        locale="en"
        status="admin-only"
        role="moderator"
        error_code="ADMIN_ONLY"
        weights={seed}
        on_save={() => undefined}
      />,
    );

    expect(await screen.findByText('A moderator cannot change the weights')).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Save weights' })).toBeNull();

    rerender(
      <WeightsScreen locale="en" status="default" role="administrator" weights={seed} on_save={() => undefined} />,
    );
    expect(screen.getByRole('spinbutton', { name: 'Views' })).toHaveProperty('value', '1');
    expect(screen.getByRole('button', { name: 'Save weights' })).toBeTruthy();
  });
});
