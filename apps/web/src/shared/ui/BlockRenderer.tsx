import { sanitizeInline } from '@/shared/lib/sanitize-inline'
import { safeEmbedUrl } from '@/shared/lib/embed-url'
import type { DocumentBlock } from './document-block.ts'

type ListItem = string | { content?: string; items?: ListItem[]; meta?: { checked?: boolean } }

function textOf(data: Record<string, unknown> | undefined, key: string): string {
  const value = data?.[key]
  return typeof value === 'string' ? value : ''
}

function httpsUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null
  try {
    const url = new URL(value)
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.toString() : null
  } catch {
    return null
  }
}

/**
 * Встроенная разметка Editor.js приходит HTML-строкой. В DOM она попадает только отсюда,
 * после DOMPurify: белый список тегов, ссылки `http(s)`/`mailto`, `rel` и `target` проставляем сами.
 */
function InlineHtml({ html }: { html: string }) {
  return <span dangerouslySetInnerHTML={{ __html: sanitizeInline(html) }} />
}

const LIST_CLASSES: Record<string, string> = {
  ordered: 'list-decimal',
  unordered: 'list-disc',
  checklist: 'list-none',
}

function ListView({ items, style }: { items: ListItem[]; style: string }) {
  const Tag = style === 'ordered' ? 'ol' : 'ul'
  return (
    <Tag className={`my-2 space-y-3 pl-5 ${LIST_CLASSES[style] ?? 'list-disc'}`}>
      {items.map((item, index) => {
        if (typeof item === 'string') {
          return (
            <li key={index}>
              <InlineHtml html={item} />
            </li>
          )
        }
        return (
          <li key={index}>
            {style === 'checklist' ? (
              <input
                type="checkbox"
                disabled
                checked={item.meta?.checked === true}
                className="mr-2"
              />
            ) : null}
            <InlineHtml html={item.content ?? ''} />
            {item.items && item.items.length > 0 ? (
              <ListView items={item.items} style={style} />
            ) : null}
          </li>
        )
      })}
    </Tag>
  )
}

function fileUrl(data: Record<string, unknown> | undefined): string | null {
  const file = data?.file
  if (!file || typeof file !== 'object') return null
  return httpsUrl('url' in file ? file.url : null)
}

function Block({ block }: { block: DocumentBlock }) {
  const data = block.data
  switch (block.type) {
    case 'paragraph':
      return (
        <p className="my-4 whitespace-pre-line break-words">
          <InlineHtml html={textOf(data, 'text')} />
        </p>
      )
    case 'header': {
      const level = data?.level === 3 || data?.level === 4 ? data.level : 2
      const Tag = level === 3 ? 'h3' : level === 4 ? 'h4' : 'h2'
      return (
        <Tag className="my-4 font-semibold">
          <InlineHtml html={textOf(data, 'text')} />
        </Tag>
      )
    }
    case 'list':
      return (
        <ListView
          items={Array.isArray(data?.items) ? (data.items as ListItem[]) : []}
          style={textOf(data, 'style')}
        />
      )
    case 'quote':
      return (
        <blockquote className="my-4 border-l-4 border-red-400 pl-3">
          <InlineHtml html={textOf(data, 'text')} />
          {textOf(data, 'caption') ? (
            <footer className="mt-3 text-base">
              <InlineHtml html={textOf(data, 'caption')} />
            </footer>
          ) : null}
        </blockquote>
      )
    case 'warning':
      return (
        <aside className="my-4 rounded-xl bg-surface-secondary p-3">
          <strong>
            <InlineHtml html={textOf(data, 'title')} />
          </strong>
          <p>
            <InlineHtml html={textOf(data, 'message')} />
          </p>
        </aside>
      )
    case 'delimiter':
      return <hr className="my-6 border-separator" />
    case 'code':
      return (
        <pre className="my-4 overflow-x-auto rounded-xl bg-surface-secondary p-3 text-sm">
          <code>{textOf(data, 'code')}</code>
        </pre>
      )
    case 'image': {
      const src = fileUrl(data)
      if (!src) return null
      return (
        <figure className="my-4">
          <img
            src={src}
            alt={textOf(data, 'caption')}
            loading="lazy"
            className="w-full rounded-xl"
          />
          {textOf(data, 'caption') ? (
            <figcaption className="mt-3 text-base text-muted">
              <InlineHtml html={textOf(data, 'caption')} />
            </figcaption>
          ) : null}
        </figure>
      )
    }
    case 'embed': {
      const service = textOf(data, 'service')
      const src = safeEmbedUrl(service, data?.embed)
      if (!src) return null
      return (
        <iframe
          src={src}
          title={service}
          loading="lazy"
          className="my-4 aspect-video w-full rounded-xl"
          allow="fullscreen"
        />
      )
    }
    case 'table': {
      const rows = Array.isArray(data?.content) ? (data.content as unknown[]) : []
      return (
        <div className="my-4 overflow-x-auto">
          <table className="w-full border-collapse text-sm">
            <tbody>
              {rows.map((row, row_index) => (
                <tr key={row_index}>
                  {(Array.isArray(row) ? row : []).map((cell, cell_index) => {
                    const Cell = data?.withHeadings === true && row_index === 0 ? 'th' : 'td'
                    return (
                      <Cell
                        key={cell_index}
                        className="border border-separator px-2 py-1 text-left"
                      >
                        <InlineHtml html={typeof cell === 'string' ? cell : ''} />
                      </Cell>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
    }
    case 'attaches': {
      const src = fileUrl(data)
      if (!src) return null
      return (
        <p className="my-4">
          <a href={src} rel="noopener noreferrer" target="_blank" className="text-accent underline">
            {textOf(data, 'title') || src}
          </a>
        </p>
      )
    }
    case 'personality': {
      const photo = httpsUrl(data?.photo)
      const name = textOf(data, 'name')
      const position = textOf(data, 'position')
      if (!photo && !name && !position) return null
      return (
        <div className="my-6 flex flex-col items-start">
          {photo ? (
            <img src={photo} alt="" loading="lazy" className="size-40 rounded-avatar object-cover" />
          ) : null}
          {name ? <div className={`text-lg font-medium ${photo ? 'mt-4' : ''}`}>{name}</div> : null}
          {position ? <p className="text-sm text-muted">{position}</p> : null}
        </div>
      )
    }
    default:
      return null
  }
}

/** Рендер блоков статьи. Неизвестный тип пропускается, HTML автора не вставляется как есть. */
export function BlockRenderer({ blocks }: { blocks: readonly DocumentBlock[] }) {
  return (
    <div>
      {blocks.map((block, index) => (
        <Block key={block.id ?? index} block={block} />
      ))}
    </div>
  )
}
