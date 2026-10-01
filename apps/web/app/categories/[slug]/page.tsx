import { CategoryPreview, MissingCategory } from '../../../src/features/feeds/category-preview';

export default async function CategoryPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;

  if (slug !== 'test-topic') {
    return <MissingCategory slug={slug} />;
  }

  return <CategoryPreview name="Test Topic" slug={slug} />;
}
