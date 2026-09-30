import { describe, expect, it } from 'vitest';
import { CategoryService } from '../src/category-service';
import { MemoryCategoryStore } from '../src/memory-category-store';
import type { AuditAppender } from '../src/audit-appender';

const locales = [
  { locale: 'en' as const, name: 'Test Topic' },
  { locale: 'sr-Latn' as const, name: 'Test tema' },
  { locale: 'ru' as const, name: 'Тестовая тема' },
];

function failingThenOk(): AuditAppender & { calls: number } {
  const appender = {
    calls: 0,
    async append(): Promise<void> {
      this.calls += 1;
      if (this.calls === 1) {
        throw new Error('audit down');
      }
    },
  };
  return appender;
}

describe('categories', () => {
  it('stores three names and assigns the slug', async () => {
    const store = new MemoryCategoryStore();
    const audit = failingThenOk();
    const categories = new CategoryService(store, audit);

    const created = await categories.create({
      actor_id: '018f3c2a-7b10-7c3e-8f21-000000000001',
      role: 'administrator',
      translations: locales,
    });

    expect(created.slug).toBe('test-topic');
    expect(created.translations).toEqual(locales);
    expect(audit.calls).toBe(2);
    expect(store.users_writes).toEqual([]);

    const found = await categories.read(created.slug);
    expect(found.translations.map((row) => row.name)).toEqual([
      'Test Topic',
      'Test tema',
      'Тестовая тема',
    ]);
  });

  it('refuses a moderator and a body that misses a locale', async () => {
    const store = new MemoryCategoryStore();
    const categories = new CategoryService(store, { async append() {} });

    await expect(
      categories.create({
        actor_id: '018f3c2a-7b10-7c3e-8f21-0000000000d1',
        role: 'moderator',
        translations: locales,
      }),
    ).rejects.toMatchObject({ code: 'ADMIN_ONLY' });

    await expect(
      categories.create({
        actor_id: '018f3c2a-7b10-7c3e-8f21-000000000001',
        role: 'administrator',
        translations: locales.slice(0, 2),
      }),
    ).rejects.toMatchObject({ code: 'CATEGORY_TRANSLATIONS_REQUIRED' });

    expect(store.categories).toHaveLength(0);
  });

  it('falls back to English when a translation row is missing', async () => {
    const store = new MemoryCategoryStore();
    store.categories.push({
      id: '018f3c2a-7b10-7c3e-8f21-0000000000c1',
      slug: 'test-topic',
      translations: [{ locale: 'en', name: 'Test Topic' }],
    });
    const categories = new CategoryService(store, { async append() {} });

    const found = await categories.read('test-topic');
    expect(found.translations.find((row) => row.locale === 'ru')?.name).toBe('Test Topic');
    expect(found.translations.find((row) => row.locale === 'sr-Latn')?.name).toBe('Test Topic');
  });

  it('returns CATEGORY_NOT_FOUND for an unknown slug', async () => {
    const categories = new CategoryService(new MemoryCategoryStore(), { async append() {} });
    await expect(categories.read('missing')).rejects.toMatchObject({ code: 'CATEGORY_NOT_FOUND' });
  });
});
