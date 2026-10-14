import { InlineHtml } from './InlineHtml.tsx'

export type ListItem =
  string | { content?: string; items?: ListItem[]; meta?: { checked?: boolean } }

const LIST_CLASSES: Record<string, string> = {
  ordered: 'list-decimal',
  unordered: 'list-disc',
  checklist: 'list-none',
}

type ListViewProps = { items: ListItem[]; style: string }

export function ListView({ items, style }: ListViewProps) {
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
