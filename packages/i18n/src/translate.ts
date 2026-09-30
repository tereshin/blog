export const locales = ['en', 'sr-Latn', 'ru'] as const;

export type Locale = (typeof locales)[number];

export type Messages = Record<string, string>;

export type Catalog = Record<Locale, Messages>;

export function translate(
  locale: Locale,
  key: string,
  catalog: Catalog,
): string {
  return catalog[locale][key] ?? catalog.en[key] ?? key;
}

export function mergeCatalogs(features: Catalog[]): Catalog {
  const merged: Catalog = {
    en: {},
    'sr-Latn': {},
    ru: {},
  };

  for (const feature of features) {
    for (const locale of locales) {
      Object.assign(merged[locale], feature[locale]);
    }
  }

  return merged;
}
