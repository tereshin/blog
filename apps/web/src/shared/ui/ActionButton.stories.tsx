import type { Meta, StoryObj } from '@storybook/react-vite'
import { ActionButton } from './ActionButton.tsx'
import { BookmarkIcon, ShareIcon } from './icons.tsx'

const meta = {
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
} satisfies Meta<typeof ActionButton>
export default meta
type Story = StoryObj<typeof meta>

export const Default: Story = {}
export const Saved: Story = {
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
}
export const Disabled: Story = { args: { isDisabled: true } }
export const IconOnly: Story = {
  args: {
    isIconOnly: true,
    'aria-label': 'Поделиться',
    children: (
      <span className="action-control__icon">
        <ShareIcon />
      </span>
    ),
  },
}
