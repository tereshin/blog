import type { Locale } from '@blog/i18n';
import type { ReactNode } from 'react';
import { AdminShell } from '@blog/ui';

export function AdminFrame({
  children,
  on_locale,
}: {
  children: ReactNode;
  on_locale?: (locale: Locale) => void;
}) {
  return <AdminShell on_locale={on_locale}>{children}</AdminShell>;
}
