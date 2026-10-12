import { Label } from '@heroui/react/label'
import { Switch } from '@heroui/react/switch'

type ToggleFieldProps = {
  label: string
  isSelected: boolean
  onChange: (value: boolean) => void
  isDisabled?: boolean
}

export function ToggleField({ label, ...props }: ToggleFieldProps) {
  return (
    <Switch {...props} className="w-full max-w-lg">
      <Switch.Content className="min-h-12 w-full justify-between gap-4">
        <Label className="text-base font-medium">{label}</Label>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  )
}
