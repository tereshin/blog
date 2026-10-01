import { translate, type Locale } from '@blog/i18n';
import { block_catalog } from '@blog/i18n/features/block';
import { Button, Skeleton, Toast, toast } from '@heroui/react';
import { useEffect, useState } from 'react';
import { EmptyState } from '../../shared/empty-state';

export function BlockScreen({
  locale,
  status,
  user_id,
  blocked,
  error_code,
  on_block,
  on_lift,
}: {
  locale: Locale;
  status: 'default' | 'loading' | 'reason-required' | 'blocked' | 'lifted' | 'not-found';
  user_id: string;
  blocked: boolean;
  error_code?: string;
  on_block: (reason: string) => void;
  on_lift: () => void;
}) {
  const blocked_message =
    error_code === 'REASON_REQUIRED' ? translate(locale, 'block.reason_required', block_catalog) : null;

  if (status === 'loading') {
    return (
      <div role="status" aria-label={translate(locale, 'block.loading', block_catalog)}>
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  if (status === 'not-found') {
    return (
      <main>
        <EmptyState title={translate(locale, 'block.not_found', block_catalog)} />
      </main>
    );
  }

  return (
    <main>
      <Toast.Provider />
      <Notice message={blocked_message} />
      <p>{user_id}</p>
      {status === 'blocked' || blocked ? <p>{translate(locale, 'block.blocked', block_catalog)}</p> : null}
      {status === 'lifted' ? <p>{translate(locale, 'block.lifted', block_catalog)}</p> : null}
      {status === 'blocked' || blocked ? (
        <Button variant="primary" onPress={on_lift}>
          {translate(locale, 'block.lift', block_catalog)}
        </Button>
      ) : (
        <BlockForm locale={locale} on_block={on_block} />
      )}
    </main>
  );
}

function BlockForm({ locale, on_block }: { locale: Locale; on_block: (reason: string) => void }) {
  const [reason, set_reason] = useState('');
  const [invalid, set_invalid] = useState<string | null>(null);

  function block() {
    if (reason.trim() === '') {
      set_invalid(translate(locale, 'block.reason_required', block_catalog));
      return;
    }
    on_block(reason);
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        block();
      }}
    >
      <Notice message={invalid} />
      <textarea
        aria-label={translate(locale, 'block.reason', block_catalog)}
        value={reason}
        onChange={(event) => set_reason(event.target.value)}
      />
      <Button variant="primary" onPress={block}>
        {translate(locale, 'block.block', block_catalog)}
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
