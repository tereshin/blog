import { ArticleError } from './article-error';
import type { EditorBlock, EditorJson } from './article-store';

const rejected_types = new Set(['embed', 'raw', 'rawHtml']);

function escape_text(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function text_of(block: EditorBlock): string {
  const text = block.data?.text;
  return typeof text === 'string' ? escape_text(text) : '';
}

function render_block(block: EditorBlock): string {
  if (block.type === 'header') {
    const level = block.data?.level;
    const tag = level === 1 || level === 2 || level === 3 ? `h${level}` : 'h2';
    return `<${tag}>${text_of(block)}</${tag}>`;
  }
  if (block.type === 'list') {
    const items = Array.isArray(block.data?.items) ? block.data.items : [];
    const body = items
      .filter((item): item is string => typeof item === 'string')
      .map((item) => `<li>${escape_text(item)}</li>`)
      .join('');
    const tag = block.data?.style === 'ordered' ? 'ol' : 'ul';
    return `<${tag}>${body}</${tag}>`;
  }
  if (block.type === 'image') {
    const file = block.data?.file;
    const url =
      file && typeof file === 'object' && 'url' in file && typeof file.url === 'string'
        ? escape_text(file.url)
        : '';
    return `<img src="${url}" alt="">`;
  }
  if (block.type === 'quote') {
    return `<blockquote>${text_of(block)}</blockquote>`;
  }
  if (block.type === 'delimiter') {
    return '<hr>';
  }
  return `<p>${text_of(block)}</p>`;
}

export function renderEditor(editor_json: EditorJson): string {
  for (const block of editor_json.blocks) {
    if (rejected_types.has(block.type)) {
      throw new ArticleError('ARTICLE_BLOCK_REJECTED');
    }
  }
  return editor_json.blocks.map((block) => render_block(block)).join('');
}
