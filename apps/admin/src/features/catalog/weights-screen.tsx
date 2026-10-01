import { translate, type Locale } from '@blog/i18n';
import { catalog_catalog } from '@blog/i18n/features/catalog';
import { Button, Toast, toast } from '@heroui/react';
import { useEffect } from 'react';

export type PopularWeights = {
  views_weight: number;
  likes_weight: number;
  comments_weight: number;
  bookmarks_weight: number;
  age_decay: number;
};

export function WeightsScreen({
  locale,
  status,
  role,
  weights,
  error_code,
  on_save,
}: {
  locale: Locale;
  status: 'default' | 'loading' | 'saved' | 'admin-only';
  role: 'moderator' | 'administrator';
  weights: PopularWeights;
  error_code?: string;
  on_save: (weights: PopularWeights) => void;
}) {
  const message =
    error_code === 'ADMIN_ONLY' || status === 'admin-only' || role === 'moderator'
      ? translate(locale, 'catalog.weights.admin_only', catalog_catalog)
      : null;

  if (status === 'admin-only' || role === 'moderator') {
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
      <WeightField locale={locale} label_key="catalog.weights.views" value={weights.views_weight} />
      <WeightField locale={locale} label_key="catalog.weights.likes" value={weights.likes_weight} />
      <WeightField locale={locale} label_key="catalog.weights.comments" value={weights.comments_weight} />
      <WeightField locale={locale} label_key="catalog.weights.bookmarks" value={weights.bookmarks_weight} />
      <WeightField locale={locale} label_key="catalog.weights.age" value={weights.age_decay} />
      <Button variant="primary" onPress={() => on_save(weights)}>
        {translate(locale, 'catalog.weights.save', catalog_catalog)}
      </Button>
    </main>
  );
}

function WeightField({ locale, label_key, value }: { locale: Locale; label_key: string; value: number }) {
  const label = translate(locale, label_key, catalog_catalog);
  return <input aria-label={label} type="number" defaultValue={value} />;
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
