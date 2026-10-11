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
    <Switch {...props} className="w-full">
      <Switch.Content className="w-full justify-between gap-4">
        <Label>{label}</Label>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  )
}
