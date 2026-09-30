import { eq } from 'drizzle-orm';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { categories_table, category_translations } from './categories-schema';
import type { CategoryLocale, CategoryRecord, CategoryStore, CategoryTranslation } from './category-store';

export class DrizzleCategoryStore implements CategoryStore {
  private readonly db: NodePgDatabase;

  constructor(database_url: string) {
    const pool = new Pool({ connectionString: database_url });
    this.db = drizzle(pool);
  }

  async insert(category: CategoryRecord): Promise<void> {
    await this.db.transaction(async (tx) => {
      await tx.insert(categories_table).values({ id: category.id, slug: category.slug });
      await tx.insert(category_translations).values(
        category.translations.map((row) => ({
          category_id: category.id,
          locale: row.locale,
          name: row.name,
        })),
      );
    });
  }

  async findBySlug(slug: string): Promise<CategoryRecord | null> {
    const rows = await this.db
      .select()
      .from(categories_table)
      .where(eq(categories_table.slug, slug))
      .limit(1);
    const row = rows[0];
    if (!row) {
      return null;
    }
    return this.withTranslations(row.id, row.slug);
  }

  async list(): Promise<CategoryRecord[]> {
    const rows = await this.db.select().from(categories_table);
    const categories: CategoryRecord[] = [];
    for (const row of rows) {
      categories.push(await this.withTranslations(row.id, row.slug));
    }
    return categories;
  }

  private async withTranslations(id: string, slug: string): Promise<CategoryRecord> {
    const rows = await this.db
      .select()
      .from(category_translations)
      .where(eq(category_translations.category_id, id));
    const translations: CategoryTranslation[] = rows
      .filter((row): row is typeof row & { locale: CategoryLocale } =>
        row.locale === 'en' || row.locale === 'sr-Latn' || row.locale === 'ru',
      )
      .map((row) => ({ locale: row.locale, name: row.name }));
    return { id, slug, translations };
  }
}
