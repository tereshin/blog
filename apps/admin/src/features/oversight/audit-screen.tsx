import { translate, type Locale } from '@blog/i18n';
import { oversight_catalog } from '@blog/i18n/features/oversight';
import { Button, Skeleton } from '@heroui/react';
import { EmptyState } from '../../shared/empty-state';
import { StaffTable } from '../../shared/staff-table';

export type AuditRow = {
  id: string;
  action: string;
  actor_id: string;
  entity_id: string;
  reason: string | null;
  created_at: string;
};

export function AuditScreen({
  locale,
  status,
  rows,
  has_next,
  on_next,
}: {
  locale: Locale;
  status: 'default' | 'own' | 'loading' | 'empty';
  rows: AuditRow[];
  has_next: boolean;
  on_next: () => void;
}) {
  if (status === 'loading') {
    return (
      <div role="status" aria-label={translate(locale, 'oversight.loading', oversight_catalog)}>
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  if (status === 'empty' || rows.length === 0) {
    return (
      <main>
        <EmptyState title={translate(locale, 'oversight.empty', oversight_catalog)} />
      </main>
    );
  }

  return (
    <main>
      <StaffTable
        caption={translate(locale, 'oversight.audit', oversight_catalog)}
        headers={['Action', 'Actor', 'Entity', 'Reason', 'Time']}
        rows={rows.map((row) => ({
          id: row.id,
          cells: [row.action, row.actor_id, row.entity_id, row.reason ?? '', row.created_at],
        }))}
      />
      {has_next ? (
        <Button variant="secondary" onPress={on_next}>
          {translate(locale, 'oversight.next', oversight_catalog)}
        </Button>
      ) : null}
    </main>
  );
}
