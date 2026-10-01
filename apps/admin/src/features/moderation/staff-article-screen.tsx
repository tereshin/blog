import { translate, type Locale } from '@blog/i18n';
import { moderation_catalog } from '@blog/i18n/features/moderation';
import { Button, Toast, toast } from '@heroui/react';
import { useEffect, useState } from 'react';

export type StaffArticle = {
  id: string;
  title: string;
  body: string;
  status: string;
  removed_by: string | null;
  category_id: string;
};

export function StaffArticleScreen({
  locale,
  status,
  role,
  article,
  categories,
  error_code,
  on_move,
  on_remove,
}: {
  locale: Locale;
  status: 'default' | 'loading' | 'category-moved' | 'reason-required' | 'removed' | 'admin-only' | 'not-found';
  role: 'moderator' | 'administrator';
  article: StaffArticle;
  categories: Array<{ id: string; name: string }>;
  error_code?: string;
  on_move: (category_id: string) => void;
  on_remove: (reason: string) => void;
}) {
  const [category_id, set_category_id] = useState(article.category_id);
  const [reason, set_reason] = useState('');
  const [invalid, set_invalid] = useState<string | null>(null);
  const admin_only =
    error_code === 'ADMIN_ONLY' || role === 'moderator'
      ? translate(locale, 'moderation.admin_only', moderation_catalog)
      : null;
  const reason_required =
    error_code === 'REASON_REQUIRED' ? translate(locale, 'moderation.reason_required', moderation_catalog) : null;

  function remove() {
    if (role !== 'administrator') {
      return;
    }
    if (reason.trim() === '') {
      set_invalid(translate(locale, 'moderation.reason_required', moderation_catalog));
      return;
    }
    on_remove(reason);
  }

  if (status === 'not-found') {
    return <p>{translate(locale, 'moderation.not_found', moderation_catalog)}</p>;
  }

  return (
    <main>
      <Toast.Provider />
      <Notice message={status === 'admin-only' ? admin_only : reason_required} />
      <Notice message={invalid} />
      <h1>{article.title}</h1>
      <p>{article.body}</p>
      <p>{articleState(locale, article)}</p>
      <label>
        {translate(locale, 'moderation.category', moderation_catalog)}
        <select aria-label={translate(locale, 'moderation.category', moderation_catalog)} value={category_id} onChange={(event) => set_category_id(event.target.value)}>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <Button variant="secondary" onPress={() => on_move(category_id)}>
        {translate(locale, 'moderation.move', moderation_catalog)}
      </Button>
      <textarea
        aria-label={translate(locale, 'moderation.reason', moderation_catalog)}
        value={reason}
        onChange={(event) => set_reason(event.target.value)}
      />
      <Button variant="primary" onPress={remove}>
        {translate(locale, 'moderation.remove', moderation_catalog)}
      </Button>
    </main>
  );
}

function articleState(locale: Locale, article: StaffArticle): string {
  if (article.status === 'soft_removed' && article.removed_by === 'author') {
    return translate(locale, 'moderation.withdrawn', moderation_catalog);
  }
  if (article.removed_by === 'staff' || article.status === 'hidden') {
    return translate(locale, 'moderation.hidden', moderation_catalog);
  }
  if (article.status === 'soft_removed') {
    return translate(locale, 'moderation.removed', moderation_catalog);
  }
  return translate(locale, 'moderation.published', moderation_catalog);
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
