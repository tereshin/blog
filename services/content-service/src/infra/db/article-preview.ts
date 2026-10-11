import { sql } from 'drizzle-orm'
import { articles } from './schema.ts'

/** Вычисляем только признак: тело статьи не передаётся из БД в выборки карточек. */
export const has_more_content = sql<boolean>`(
  select
    count(*) filter (where block->>'type' = 'paragraph') > 1
    or count(*) filter (where block->>'type' = 'image') > 1
    or coalesce(bool_or(
      case block->>'type'
        when 'paragraph' then
          btrim(regexp_replace(regexp_replace(block->'data'->>'text', '<[^>]+>', ' ', 'g'), '\\s+', ' ', 'g')) <> ${articles.excerpt}
        when 'image' then
          coalesce(block->'data'->>'caption', '') <> ''
          or (block->'data'->'file'->>'url') is distinct from ${articles.first_image_url}
        else true
      end
    ), false)
  from jsonb_array_elements(coalesce(${articles.blocks}->'blocks', '[]'::jsonb)) as block
)`
