import { translate, type Locale } from '@blog/i18n';
import { admin_catalog } from '@blog/i18n/features/admin';
import { Button, Skeleton, Toast, toast } from '@heroui/react';
import { useEffect } from 'react';

export function StaffGate({
  locale,
  status,
  error_code,
  on_confirm,
}: {
  locale: Locale;
  status: 'default' | 'loading' | 'closed' | 'refused';
  error_code?: string;
  on_confirm: () => void;
}) {
  const message =
    error_code === 'STAFF_FORBIDDEN'
      ? translate(locale, 'admin.gate.refused', admin_catalog)
      : error_code === 'STAFF_MFA_REQUIRED'
        ? translate(locale, 'admin.gate.closed', admin_catalog)
        : null;

  if (status === 'loading') {
    return (
      <div role="status" aria-label={translate(locale, 'admin.gate.loading', admin_catalog)}>
        <Skeleton className="h-10 w-full rounded-lg" />
      </div>
    );
  }

  if (status === 'refused') {
    return (
      <main>
        <Toast.Provider />
        <Notice message={message} />
      </main>
    );
  }

  return (
    <main>
      <Toast.Provider />
      <Notice message={message} />
      <Button variant="primary" onPress={on_confirm}>
        {translate(locale, 'admin.gate.confirm', admin_catalog)}
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
