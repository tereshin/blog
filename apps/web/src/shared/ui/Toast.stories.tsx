import type { Meta, StoryObj } from '@storybook/react-vite'
import { Button } from './Button.tsx'
import { ToastProvider, useToast } from './Toast.tsx'

const meta = { title: 'shared/ui/Toast', component: ToastProvider } satisfies Meta<typeof ToastProvider>
export default meta
type Story = StoryObj<typeof meta>

function Demo() {
  const toast = useToast()
  return (
    <ToastProvider>
      <div className="flex gap-2 p-4">
        <Button onPress={() => toast.success('Сохранено')}>Успех</Button>
        <Button onPress={() => toast.error('Не получилось', 'Попробуйте ещё раз')}>Ошибка</Button>
      </div>
    </ToastProvider>
  )
}

export const Default: Story = { render: () => <Demo /> }
