import preview from '#.storybook/preview'
import { ActionButton } from './ActionButton.tsx'
import { BookmarkIcon, ShareIcon } from './icons.tsx'

const meta = preview.meta({
  title: 'shared/ui/ActionButton',
  component: ActionButton,
  args: {
    'aria-label': 'В закладки',
    children: (
      <>
        <span className="action-control__icon">
          <BookmarkIcon />
        </span>
        <span>3</span>
      </>
    ),
  },
})
export const Default = meta.story()
export const Saved = meta.story({
  args: {
    'aria-pressed': true,
    'aria-label': 'Убрать из закладок',
    children: (
      <>
        <span className="action-control__icon">
          <BookmarkIcon icon_style="fill" />
        </span>
        <span>3</span>
      </>
    ),
  },
})
export const Disabled = meta.story({ args: { isDisabled: true } })
export const IconOnly = meta.story({
  args: {
    isIconOnly: true,
    'aria-label': 'Поделиться',
    children: (
      <span className="action-control__icon">
        <ShareIcon />
      </span>
    ),
  },
})
