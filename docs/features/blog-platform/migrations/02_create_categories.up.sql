-- Schema categories. The categories service is the only writer.

CREATE SCHEMA IF NOT EXISTS categories;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS categories.categories (
  id uuid PRIMARY KEY,
  slug text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT categories_categories_slug_key UNIQUE (slug)
);
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS categories.category_translations (
  category_id uuid NOT NULL REFERENCES categories.categories (id) ON DELETE RESTRICT,
  locale text NOT NULL,
  name text NOT NULL,
  description text,
  PRIMARY KEY (category_id, locale)
);
--> statement-breakpoint
COMMENT ON TABLE categories.category_translations IS
  'locale is en, sr-Latn, or ru. A new Category is stored with all three names.';
