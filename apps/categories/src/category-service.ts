import type { AuditAppender } from './audit-appender';
import { CategoryError } from './category-error';
import {
  category_locales,
  type CategoryLocale,
  type CategoryRecord,
  type CategoryStore,
  type CategoryTranslation,
} from './category-store';
import { uuidV7 } from './uuid-v7';

export class CategoryService {
  now: () => Date = () => new Date();

  constructor(
    private readonly store: CategoryStore,
    private readonly audit: AuditAppender,
  ) {}

  async create(input: {
    actor_id: string;
    role: string;
    translations: CategoryTranslation[];
  }): Promise<CategoryRecord> {
    if (input.role !== 'administrator') {
      throw new CategoryError('ADMIN_ONLY');
    }
    const translations = this.requireTranslations(input.translations);
    const english = translations.find((row) => row.locale === 'en');
    if (!english) {
      throw new CategoryError('CATEGORY_TRANSLATIONS_REQUIRED');
    }
    const category: CategoryRecord = {
      id: uuidV7(this.now().getTime()),
      slug: this.slug(english.name),
      translations,
    };
    await this.store.insert(category);
    await this.appendAudit(input.actor_id, category.id);
    return category;
  }

  async read(slug: string): Promise<CategoryRecord> {
    const category = await this.store.findBySlug(slug);
    if (!category) {
      throw new CategoryError('CATEGORY_NOT_FOUND');
    }
    return { ...category, translations: this.withEnglishFallback(category.translations) };
  }

  async list(): Promise<{
    items: CategoryRecord[];
    has_next: boolean;
    has_prev: boolean;
    next_cursor: null;
  }> {
    const categories = await this.store.list();
    return {
      items: categories.map((category) => ({
        ...category,
        translations: this.withEnglishFallback(category.translations),
      })),
      has_next: false,
      has_prev: false,
      next_cursor: null,
    };
  }

  private requireTranslations(translations: CategoryTranslation[]): CategoryTranslation[] {
    const by_locale = new Map<CategoryLocale, string>();
    for (const row of translations) {
      if (!category_locales.includes(row.locale) || row.name.trim().length === 0) {
        throw new CategoryError('CATEGORY_TRANSLATIONS_REQUIRED');
      }
      by_locale.set(row.locale, row.name.trim());
    }
    if (by_locale.size !== category_locales.length) {
      throw new CategoryError('CATEGORY_TRANSLATIONS_REQUIRED');
    }
    return category_locales.map((locale) => ({ locale, name: by_locale.get(locale) ?? '' }));
  }

  private withEnglishFallback(translations: CategoryTranslation[]): CategoryTranslation[] {
    const english = translations.find((row) => row.locale === 'en')?.name ?? '';
    return category_locales.map((locale) => ({
      locale,
      name: translations.find((row) => row.locale === locale)?.name ?? english,
    }));
  }

  private slug(name: string): string {
    return name
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  }

  private async appendAudit(actor_id: string, entity_id: string): Promise<void> {
    const entry = {
      actor_id,
      action: 'category.create' as const,
      entity_type: 'category' as const,
      entity_id,
      reason: null,
    };
    try {
      await this.audit.append(entry);
    } catch {
      await this.audit.append(entry);
    }
  }
}
