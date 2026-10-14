import type { ReactionAppearances } from '@blog/contracts'
import { useState } from 'react'
import { ReactionGlyph } from '@/entities/reaction'
import type { ReactionKind } from '@/entities/reaction'
import { useT } from '@/shared/i18n'
import { BaseIcon, ListBox, Popover } from '@/shared/ui'
import { ReactionButton } from './ReactionButton.tsx'

type ReactionPickerProps = {
  appearances: ReactionAppearances
  onSelect: (kind: ReactionKind) => void
  is_pending: boolean
}

/** Компактная сетка реакций; навигацией и фокусом управляет React Aria. */
export function ReactionPicker({ appearances, onSelect, is_pending }: ReactionPickerProps) {
  const { t } = useT()
  const [is_open, setOpen] = useState(false)

  return (
    <Popover isOpen={is_open} onOpenChange={setOpen}>
      <ReactionButton
        variant="secondary"
        isIconOnly
        className="text-muted"
        aria-label={t('reaction.add')}
        isDisabled={is_pending}
      >
        <BaseIcon name="add" style="line" size={18} />
      </ReactionButton>
      <Popover.Content placement="top" offset={8} className="reaction-picker p-1">
        <ListBox
          aria-label={t('reaction.menu')}
          layout="grid"
          selectionMode="none"
          disabledKeys={is_pending ? appearances.map((appearance) => appearance.kind) : []}
          className="reaction-picker__grid"
          onAction={(key) => {
            onSelect(String(key))
            setOpen(false)
          }}
        >
          {appearances.map((appearance) => (
            <ListBox.Item
              key={appearance.kind}
              id={appearance.kind}
              textValue={appearance.label}
              aria-label={appearance.label}
              className="reaction-picker__item"
            >
              <span title={appearance.label} className="inline-flex items-center justify-center">
                <ReactionGlyph appearance={appearance} label={appearance.label} size="lg" />
              </span>
            </ListBox.Item>
          ))}
        </ListBox>
      </Popover.Content>
    </Popover>
  )
}
