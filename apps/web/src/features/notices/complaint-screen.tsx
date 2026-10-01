'use client';

import { translate, type Locale } from '@blog/i18n';
import { notices_catalog } from '@blog/i18n/features/notices';
import { Button, Modal, Skeleton, Toast, toast } from '@heroui/react';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { EmptyState } from '../../shared/empty-state';

export function ComplaintScreen({
  locale,
  status,
  target_type,
  target_id,
  error_code,
  on_submit,
}: {
  locale: Locale;
  status: 'default' | 'loading' | 'reason-required' | 'not-found';
  target_type: 'article' | 'comment';
  target_id: string;
  error_code?: string;
  on_submit: (reason: string) => void;
}) {
  const blocked =
    error_code === 'COMPLAINT_REASON_REQUIRED'
      ? translate(locale, 'notices.complaint.reason_required', notices_catalog)
      : null;

  if (status === 'loading') {
    return (
      <div role="status" aria-label={translate(locale, 'notices.loading', notices_catalog)}>
        <Skeleton className="h-24 w-full rounded-lg" />
      </div>
    );
  }

  return (
    <Modal isOpen>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            <Modal.Header>
              <Modal.Heading>{translate(locale, 'notices.complaint.submit', notices_catalog)}</Modal.Heading>
            </Modal.Header>
            <Modal.Body>
              <Toast.Provider />
              <Notice message={blocked} />
              {status === 'not-found' ? (
                <EmptyState title={translate(locale, 'notices.complaint.not_found', notices_catalog)} />
              ) : (
                <ComplaintForm locale={locale} target_type={target_type} target_id={target_id} on_submit={on_submit} />
              )}
            </Modal.Body>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}

function ComplaintForm({
  locale,
  target_type,
  target_id,
  on_submit,
}: {
  locale: Locale;
  target_type: 'article' | 'comment';
  target_id: string;
  on_submit: (reason: string) => void;
}) {
  const [reason, set_reason] = useState('');
  const [invalid, set_invalid] = useState<string | null>(null);

  function submit() {
    if (reason.trim() === '') {
      set_invalid(translate(locale, 'notices.complaint.reason_required', notices_catalog));
      return;
    }
    on_submit(reason);
  }

  return (
    <form
      data-target-type={target_type}
      data-target-id={target_id}
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <Notice message={invalid} />
      <textarea
        aria-label={translate(locale, 'notices.complaint.reason', notices_catalog)}
        value={reason}
        onChange={(event) => set_reason(event.target.value)}
      />
      <Button variant="primary" onPress={submit}>
        {translate(locale, 'notices.complaint.submit', notices_catalog)}
      </Button>
      <Link href={`/articles/${target_id}`}>{translate(locale, 'notices.complaint.back', notices_catalog)}</Link>
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
