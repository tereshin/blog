import preview from '#.storybook/preview'
import { Button } from './Button.tsx'
import { ToastProvider, useToast } from './ToastProvider.tsx'

const meta = preview.meta({ title: 'shared/ui/Toast', component: ToastProvider })
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

export const Default = meta.story({ render: () => <Demo /> })
