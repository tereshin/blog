import { translate, type Locale } from '@blog/i18n';
import { moderation_catalog } from '@blog/i18n/features/moderation';
import { Button, Skeleton } from '@heroui/react';
import { EmptyState } from '../../shared/empty-state';
import { StaffTable } from '../../shared/staff-table';

export type OpenComplaint = {
  id: string;
  target_type: 'article' | 'comment';
  target_id: string;
  author_id: string;
  reason: string;
};

export function ComplaintListScreen({
  locale,
  status,
  complaints,
  has_next,
  on_next,
}: {
  locale: Locale;
  status: 'default' | 'loading' | 'empty';
  complaints: OpenComplaint[];
  has_next: boolean;
  on_next: () => void;
}) {
  if (status === 'loading') {
    return (
      <div role="status" aria-label={translate(locale, 'moderation.loading', moderation_catalog)}>
        <Skeleton className="h-16 w-full rounded-lg" />
      </div>
    );
  }

  if (status === 'empty' || complaints.length === 0) {
    return (
      <main>
        <EmptyState title={translate(locale, 'moderation.empty', moderation_catalog)} />
      </main>
    );
  }

  return (
    <main>
      <StaffTable
        caption={translate(locale, 'moderation.complaints', moderation_catalog)}
        headers={['Target', 'Reason']}
        rows={complaints.map((complaint) => ({
          id: complaint.id,
          cells: [complaint.target_type, complaint.reason],
        }))}
      />
      {has_next ? (
        <Button variant="secondary" onPress={on_next}>
          {translate(locale, 'moderation.next', moderation_catalog)}
        </Button>
      ) : null}
    </main>
  );
}
