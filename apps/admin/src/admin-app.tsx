import { useState, type ReactNode } from 'react';
import type { Locale } from '@blog/i18n';
import { locale_storage_key } from '@blog/ui';
import { AdminFrame } from './shell/admin-frame';
import { StaffGate } from './features/gate/staff-gate';

function storedLocale(): Locale {
  const stored = localStorage.getItem(locale_storage_key);
  if (stored === 'sr-Latn' || stored === 'ru' || stored === 'en') {
    return stored;
  }
  return 'en';
}

function useInterfaceLocale(): readonly [Locale, (locale: Locale) => void] {
  const [locale, set_locale] = useState<Locale>(storedLocale);
  return [locale, set_locale];
}

export function AdminApp({ children }: { children?: ReactNode }) {
  const [locale, set_locale] = useInterfaceLocale();
  const params = new URLSearchParams(window.location.search);
  const state = params.get('state');
  const status = state === 'refused' || state === 'closed' || state === 'loading' ? state : 'default';
  const error_code =
    status === 'refused' ? 'STAFF_FORBIDDEN' : status === 'closed' ? 'STAFF_MFA_REQUIRED' : undefined;

  return (
    <AdminFrame on_locale={set_locale}>
      {children ?? <StaffGate locale={locale} status={status} error_code={error_code} on_confirm={() => undefined} />}
    </AdminFrame>
  );
}
