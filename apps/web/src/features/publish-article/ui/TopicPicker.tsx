import { useEffect, useRef, useState } from 'react'
import type { Topic } from '@/entities/topic'
import { useT } from '@/shared/i18n'
import { Avatar, BaseIcon, Link, ListBox, Popover, SearchIcon } from '@/shared/ui'

type TopicPickerProps = { topics: Topic[]; value: string; onChange: (topic_id: string) => void }

export function TopicPicker({ topics, value, onChange }: TopicPickerProps) {
  const { t } = useT()
  const [is_open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const search_ref = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (!is_open) return
    const frame = requestAnimationFrame(() => search_ref.current?.focus())
    return () => cancelAnimationFrame(frame)
  }, [is_open])
  const trigger_ref = useRef<HTMLAnchorElement>(null)
  const selected = topics.find((topic) => topic.id === value)
  const filtered = topics.filter((topic) =>
    topic.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  )
  const handleOpen = (open: boolean) => {
    setOpen(open)
    if (!open) setSearch('')
  }
  return (
    <Popover isOpen={is_open} onOpenChange={handleOpen}>
      <Link
        ref={trigger_ref}
        aria-label={t('editor.topic')}
        aria-haspopup="dialog"
        aria-expanded={is_open}
        className="max-w-48 gap-1 text-sm font-normal text-muted"
        onPress={() => handleOpen(!is_open)}
      >
        <span className="truncate">{selected?.title ?? t('editor.no_topic')}</span>
        <BaseIcon
          name="down"
          style="line"
          size={16}
          className={is_open ? 'shrink-0 rotate-180' : 'shrink-0'}
        />
      </Link>
      <Popover.Content
        triggerRef={trigger_ref}
        placement="bottom start"
        className="topic-picker-popover w-72 max-w-[calc(100vw-32px)] p-2"
      >
        <label className="mb-2 flex items-center gap-2 rounded-xl border border-separator bg-surface-secondary px-3 py-2 focus-within:border-accent focus-within:ring-1 focus-within:ring-accent">
          <SearchIcon className="shrink-0 text-muted" />
          <input
            ref={search_ref}
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            aria-label={t('editor.topic_search')}
            placeholder={t('editor.topic_search')}
            className="min-w-0 flex-1 bg-transparent text-sm outline-none"
          />
        </label>
        <ListBox
          aria-label={t('editor.topic')}
          selectionMode="single"
          disallowEmptySelection
          selectedKeys={[value || 'none']}
          className="max-h-64 overflow-y-auto"
          onSelectionChange={(keys) => {
            if (keys === 'all') return
            const key = [...keys][0]
            if (key === undefined) return
            onChange(key === 'none' ? '' : String(key))
            handleOpen(false)
          }}
          onAction={(key) => {
            onChange(key === 'none' ? '' : String(key))
            handleOpen(false)
          }}
        >
          <ListBox.Item
            id="none"
            textValue={t('editor.no_topic')}
            className="gap-3 rounded-xl px-3 py-2"
          >
            <BaseIcon name="forbid_circle" style="line" className="size-6 text-muted" />
            <span className="flex-1">{t('editor.no_topic')}</span>
            <ListBox.ItemIndicator />
          </ListBox.Item>
          {filtered.map((topic) => (
            <ListBox.Item
              key={topic.id}
              id={topic.id}
              textValue={topic.title}
              aria-label={topic.title}
              className="gap-3 rounded-xl px-3 py-2"
            >
              <Avatar
                src={topic.avatar_url}
                name={topic.title}
                size="sm"
                className="size-6 shrink-0"
              />
              <span className="min-w-0 flex-1 truncate">{topic.title}</span>
              <ListBox.ItemIndicator />
            </ListBox.Item>
          ))}
        </ListBox>
      </Popover.Content>
    </Popover>
  )
}
