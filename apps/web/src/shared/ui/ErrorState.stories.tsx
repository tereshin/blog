import preview from '#.storybook/preview'
import { ErrorState } from './ErrorState.tsx'

const meta = preview.meta({ title: 'shared/ui/ErrorState', component: ErrorState, args: { title: 'Не удалось открыть раздел' } })
export const WithRetry = meta.story({ args: { onRetry: () => {}, description: 'Боковые карточки на месте. Повторите загрузку.' } })
export const WithoutRetry = meta.story()
