import { NoticeListScreen, type NoticeItem } from '../../../src/features/notices/notice-list-screen';

const notices: NoticeItem[] = [
  {
    id: '018f3c2a-7b10-7c3e-8f21-0000000000aa',
    type: 'reply',
    actor_id: '018f3c2a-7b10-7c3e-8f21-0000000000b2',
    entity_type: 'comment',
    entity_id: '018f3c2a-7b10-7c3e-8f21-0000000000c9',
    created_at: '2026-10-01T12:00:00Z',
  },
  {
    id: '018f3c2a-7b10-7c3e-8f21-0000000000ac',
    type: 'follow',
    actor_id: '018f3c2a-7b10-7c3e-8f21-0000000000b2',
    entity_type: 'user',
    entity_id: '018f3c2a-7b10-7c3e-8f21-0000000000b2',
    created_at: '2026-10-01T12:01:00Z',
  },
];

export default async function NoticesPage({
  searchParams,
}: {
  searchParams: Promise<{ state?: string }>;
}) {
  const params = await searchParams;
  const empty = params.state === 'empty';

  return <NoticeListScreen locale="en" status={empty ? 'empty' : 'default'} notices={empty ? [] : notices} />;
}
