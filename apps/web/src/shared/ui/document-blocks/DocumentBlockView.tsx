import { safeEmbedUrl } from '@/shared/lib/embed-url'
import { AttachmentCard } from '../AttachmentCard.tsx'
import type { DocumentBlock } from '../document-block.ts'
import { InlineHtml } from './InlineHtml.tsx'
import type { ListItem } from './ListView.tsx'
import { ListView } from './ListView.tsx'
import { ButtonsView } from './ButtonsView.tsx'
import { TableView } from './TableView.tsx'
import { fileUrl, httpsUrl, textOf } from './block-data.ts'

type DocumentBlockViewProps = { block: DocumentBlock }

export function DocumentBlockView({ block }: DocumentBlockViewProps) {
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
    case 'table':
      return <TableView data={data} />
    case 'attaches': {
      const src = fileUrl(data)
      if (!src) return null
      const file =
        data?.file && typeof data.file === 'object' ? (data.file as Record<string, unknown>) : {}
      const extension = [file.extension, data?.extension].find(
        (value): value is string => typeof value === 'string' && /^[a-z0-9]{1,8}$/i.test(value),
      )
      const size = [file.size, data?.size].find(
        (value): value is number =>
          typeof value === 'number' && Number.isFinite(value) && value >= 0,
      )
      return (
        <AttachmentCard
          href={src}
          title={textOf(data, 'title')}
          extension={extension?.toLowerCase() ?? null}
          size={size ?? null}
        />
      )
    }
    case 'personality': {
      const photo = httpsUrl(data?.photo)
      const name = textOf(data, 'name')
      const position = textOf(data, 'position')
      if (!photo && !name && !position) return null
      return (
        <div className="my-4 flex flex-col items-start">
          {photo ? (
            <img
              src={photo}
              alt=""
              loading="lazy"
              className="size-40 rounded-avatar object-cover"
            />
          ) : null}
          {name ? <div className={`text-lg font-medium ${photo ? 'mt-4' : ''}`}>{name}</div> : null}
          {position ? <p className="text-sm text-muted">{position}</p> : null}
        </div>
      )
    }
    case 'buttons':
      return <ButtonsView items={Array.isArray(data?.items) ? data.items : []} />
    default:
      return null
  }
}
