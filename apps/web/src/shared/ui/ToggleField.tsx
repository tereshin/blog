import { Label } from '@heroui/react/label'
import { Switch } from '@heroui/react/switch'

type ToggleFieldProps = {
  label: string
  is_selected: boolean
  onChange: (value: boolean) => void
  is_disabled?: boolean
}

export function ToggleField({ label, is_selected, onChange, is_disabled }: ToggleFieldProps) {
  return (
    <Switch
      isSelected={is_selected}
      isDisabled={is_disabled}
      onChange={onChange}
      className="w-full max-w-lg"
    >
      <Switch.Content className="min-h-12 w-full justify-between gap-4">
        <Label className="text-base font-medium">{label}</Label>
        <Switch.Control>
          <Switch.Thumb />
        </Switch.Control>
      </Switch.Content>
    </Switch>
  )
}
