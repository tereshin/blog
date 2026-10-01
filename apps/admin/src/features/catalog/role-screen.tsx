import { translate, type Locale } from '@blog/i18n';
import { catalog_catalog } from '@blog/i18n/features/catalog';
import { Button, Toast, toast } from '@heroui/react';
import { useEffect, useState } from 'react';

const roles = ['user', 'moderator', 'administrator'] as const;

export function RoleScreen({
  locale,
  status,
  role,
  error_code,
  on_save,
}: {
  locale: Locale;
  status: 'default' | 'loading' | 'saved' | 'reason-required' | 'last-administrator' | 'first-administrator' | 'admin-only';
  role: 'moderator' | 'administrator';
  error_code?: string;
  on_save: (input: { user_id: string; role: (typeof roles)[number]; reason: string }) => void;
}) {
  const [user_id, set_user_id] = useState('');
  const [next_role, set_next_role] = useState<(typeof roles)[number]>('moderator');
  const [reason, set_reason] = useState('');
  const message =
    error_code === 'LAST_ADMINISTRATOR'
      ? translate(locale, 'catalog.role.last_administrator', catalog_catalog)
      : error_code === 'ADMIN_ONLY' || role === 'moderator'
        ? translate(locale, 'catalog.category.admin_only', catalog_catalog)
        : null;

  function save() {
    if (role !== 'administrator' || status === 'last-administrator' || status === 'first-administrator' || status === 'admin-only') {
      return;
    }
    if (reason.trim() === '') {
      return;
    }
    on_save({ user_id, role: next_role, reason });
  }

  return (
    <main>
      <Toast.Provider />
      <Notice message={message} />
      <input
        aria-label={translate(locale, 'catalog.role.user_id', catalog_catalog)}
        value={user_id}
        onChange={(event) => set_user_id(event.target.value)}
      />
      <select
        aria-label={translate(locale, 'catalog.role.role', catalog_catalog)}
        value={next_role}
        onChange={(event) => set_next_role(event.target.value as (typeof roles)[number])}
      >
        {roles.map((value) => (
          <option key={value} value={value}>
            {translate(locale, `catalog.role.${value}`, catalog_catalog)}
          </option>
        ))}
      </select>
      <textarea
        aria-label={translate(locale, 'catalog.role.reason', catalog_catalog)}
        value={reason}
        onChange={(event) => set_reason(event.target.value)}
      />
      <Button variant="primary" onPress={save}>
        {translate(locale, 'catalog.role.save', catalog_catalog)}
      </Button>
    </main>
  );
}

function Notice({ message }: { message: string | null }) {
  useEffect(() => {
    if (!message) {
      return;
    }
    toast.danger(message);
  }, [message]);

  return null;
}
