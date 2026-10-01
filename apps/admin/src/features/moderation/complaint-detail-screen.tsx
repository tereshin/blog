import { translate, type Locale } from '@blog/i18n';
import { moderation_catalog } from '@blog/i18n/features/moderation';
import { Button, Toast, toast } from '@heroui/react';
import { useEffect, useState } from 'react';
import type { OpenComplaint } from './complaint-list-screen';

export function ComplaintDetailScreen({
  locale,
  status,
  complaint,
  error_code,
  on_dismiss,
  on_hide,
}: {
  locale: Locale;
  status: 'default' | 'loading' | 'reason-required' | 'not-found';
  complaint: OpenComplaint;
  error_code?: string;
  on_dismiss: (reason: string) => void;
  on_hide: (reason: string) => void;
}) {
  const blocked =
    error_code === 'REASON_REQUIRED' ? translate(locale, 'moderation.reason_required', moderation_catalog) : null;

  return (
    <main>
      <Toast.Provider />
      <Notice message={blocked} />
      <p>{complaint.reason}</p>
      <ReasonActions
        locale={locale}
        on_dismiss={on_dismiss}
        on_hide={on_hide}
        disabled={status === 'not-found'}
      />
    </main>
  );
}

function ReasonActions({
  locale,
  on_dismiss,
  on_hide,
  disabled,
}: {
  locale: Locale;
  on_dismiss: (reason: string) => void;
  on_hide: (reason: string) => void;
  disabled: boolean;
}) {
  const [reason, set_reason] = useState('');
  const [invalid, set_invalid] = useState<string | null>(null);

  function act(submit: (reason: string) => void) {
    if (reason.trim() === '' || disabled) {
      set_invalid(translate(locale, 'moderation.reason_required', moderation_catalog));
      return;
    }
    submit(reason);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
      }}
    >
      <Notice message={invalid} />
      <textarea
        aria-label={translate(locale, 'moderation.reason', moderation_catalog)}
        value={reason}
        onChange={(event) => set_reason(event.target.value)}
      />
      <Button variant="primary" onPress={() => act(on_hide)}>
        {translate(locale, 'moderation.hide', moderation_catalog)}
      </Button>
      <Button variant="secondary" onPress={() => act(on_dismiss)}>
        {translate(locale, 'moderation.dismiss', moderation_catalog)}
      </Button>
    </form>
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
