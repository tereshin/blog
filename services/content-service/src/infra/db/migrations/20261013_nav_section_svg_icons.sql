-- Иконка пункта секции — загруженный SVG, а не имя из набора.
-- Длина совпадает с NAV_ICON_SVG_MAX в packages/contracts.
UPDATE nav_section_items
SET icon = NULL
WHERE icon IS NOT NULL AND icon !~ '^<svg';

DO $$
DECLARE
  constraint_name text;
BEGIN
  FOR constraint_name IN
    SELECT con.conname
    FROM pg_constraint con
    JOIN pg_class rel ON rel.oid = con.conrelid
    JOIN pg_namespace nsp ON nsp.oid = rel.relnamespace
    JOIN pg_attribute attr ON attr.attrelid = rel.oid AND attr.attnum = ANY (con.conkey)
    WHERE nsp.nspname = 'public'
      AND rel.relname = 'nav_section_items'
      AND con.contype = 'c'
      AND attr.attname = 'icon'
  LOOP
    EXECUTE format('ALTER TABLE nav_section_items DROP CONSTRAINT %I', constraint_name);
  END LOOP;
END $$;

ALTER TABLE nav_section_items
  ALTER COLUMN icon TYPE text;

ALTER TABLE nav_section_items
  ADD CONSTRAINT nav_section_items_icon_check
  CHECK (
    icon IS NULL
    OR (
      char_length(icon) BETWEEN 1 AND 8192
      AND icon ~ '^<svg([[:space:]]|>|/)'
      AND (icon ~ '</svg>[[:space:]]*$' OR icon ~ '/>[[:space:]]*$')
    )
  );
