export const category_locales = ['en', 'sr-Latn', 'ru'] as const;

export type CategoryLocale = (typeof category_locales)[number];

export type CategoryTranslation = {
  locale: CategoryLocale;
  name: string;
};

export type CategoryRecord = {
  id: string;
  slug: string;
  translations: CategoryTranslation[];
};

export interface CategoryStore {
  insert(category: CategoryRecord): Promise<void>;
  findBySlug(slug: string): Promise<CategoryRecord | null>;
  list(): Promise<CategoryRecord[]>;
}
