import { translate, type Locale } from '@blog/i18n';
import { catalog_catalog } from '@blog/i18n/features/catalog';
import { Button, Toast, toast } from '@heroui/react';
import { useEffect, useState } from 'react';

export function CategoryScreen({
  locale,
  status,
  role,
  error_code,
  on_create,
}: {
  locale: Locale;
  status: 'default' | 'loading' | 'created' | 'translations-required' | 'admin-only';
  role: 'moderator' | 'administrator';
  error_code?: string;
  on_create: (names: { en: string; 'sr-Latn': string; ru: string }) => void;
}) {
  const [en, set_en] = useState('');
  const [sr, set_sr] = useState('');
  const [ru, set_ru] = useState('');
  const [invalid, set_invalid] = useState<string | null>(null);
  const message =
    error_code === 'CATEGORY_TRANSLATIONS_REQUIRED'
      ? translate(locale, 'catalog.category.translations_required', catalog_catalog)
      : error_code === 'ADMIN_ONLY' || role === 'moderator'
        ? translate(locale, 'catalog.category.admin_only', catalog_catalog)
        : null;

  function create() {
    if (en.trim() === '' || sr.trim() === '' || ru.trim() === '') {
      set_invalid(translate(locale, 'catalog.category.translations_required', catalog_catalog));
      return;
    }
    on_create({ en, 'sr-Latn': sr, ru });
  }

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
      <Notice message={status === 'translations-required' ? message : invalid} />
      <input aria-label={translate(locale, 'catalog.category.en', catalog_catalog)} value={en} onChange={(event) => set_en(event.target.value)} />
      <input aria-label={translate(locale, 'catalog.category.sr', catalog_catalog)} value={sr} onChange={(event) => set_sr(event.target.value)} />
      <input aria-label={translate(locale, 'catalog.category.ru', catalog_catalog)} value={ru} onChange={(event) => set_ru(event.target.value)} />
      <Button variant="primary" onPress={create}>
        {translate(locale, 'catalog.category.create', catalog_catalog)}
      </Button>
    </main>
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
