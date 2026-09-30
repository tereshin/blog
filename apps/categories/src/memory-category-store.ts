import type { CategoryRecord, CategoryStore } from './category-store';

export class MemoryCategoryStore implements CategoryStore {
  readonly categories: CategoryRecord[] = [];
  readonly users_writes: never[] = [];

  async insert(category: CategoryRecord): Promise<void> {
    this.categories.push({
      ...category,
      translations: category.translations.map((row) => ({ ...row })),
    });
  }

  async findBySlug(slug: string): Promise<CategoryRecord | null> {
    return this.categories.find((category) => category.slug === slug) ?? null;
  }

  async list(): Promise<CategoryRecord[]> {
    return this.categories.map((category) => ({
      ...category,
      translations: category.translations.map((row) => ({ ...row })),
    }));
  }
}
