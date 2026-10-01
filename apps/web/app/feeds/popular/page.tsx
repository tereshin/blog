import { FeedScreen } from '../../../src/features/feeds/feed-screen';
import { popular_fixture } from '../../../src/features/feeds/fixtures';

export default async function PopularPage({
  searchParams,
}: {
  searchParams: Promise<{ signed_in?: string; state?: string }>;
}) {
  const params = await searchParams;
  const state = params.state === 'empty' || params.state === 'loading' ? params.state : 'default';

  return (
    <FeedScreen
      kind="popular"
      status={state}
      signed_in={params.signed_in === '1'}
      locale="en"
      page={state === 'empty' ? { ...popular_fixture, items: [] } : popular_fixture}
    />
  );
}
