import { sql } from 'drizzle-orm'
import type { EditorBlock } from '@blog/contracts'
import { articles } from './schema.ts'

/** Карточка получает первые два блока в исходном порядке, без загрузки остального документа. */
export const preview_blocks = sql<EditorBlock[]>`jsonb_path_query_array(${articles.blocks}, '$.blocks[0 to 1]')`

export const has_more_content = sql<boolean>`jsonb_array_length(coalesce(${articles.blocks}->'blocks', '[]'::jsonb)) > 2`
