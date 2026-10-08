import type { Meta, StoryObj } from '@storybook/react-vite'
import { ErrorState } from './ErrorState.tsx'

const meta = { title: 'shared/ui/ErrorState', component: ErrorState, args: { title: 'Не удалось открыть раздел' } } satisfies Meta<typeof ErrorState>
export default meta
type Story = StoryObj<typeof meta>

export const WithRetry: Story = { args: { onRetry: () => {}, description: 'Боковые карточки на месте. Повторите загрузку.' } }
export const WithoutRetry: Story = {}
