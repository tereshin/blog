import {
  ColorPicker,
  ColorArea,
  ColorSlider,
  ColorSwatch,
  ColorField,
  ColorSwatchPicker,
  Label,
} from '@heroui/react'
import { fieldVariants } from './field-variants.ts'
export function ColorPickerField({
  label,
  value,
  onChange,
}: {
  label: string
  value: string
  onChange: (hex: string) => void
}) {
  return (
    <ColorPicker value={value} onChange={(color) => onChange(color.toString('hex'))}>
      <div className="flex w-full min-w-0 flex-col gap-3">
        <Label className="text-base font-semibold">{label}</Label>
        <ColorPicker.Trigger
          className={`${fieldVariants({ size: 'lg', variant: 'secondary' })} flex h-12 items-center gap-3`}
          aria-label={label}
        >
          <ColorSwatch className="size-6 rounded-md" />
          <span>{value}</span>
        </ColorPicker.Trigger>
      </div>
      <ColorPicker.Popover className="w-64 max-w-[calc(100vw-32px)] p-4">
        <div className="flex flex-col gap-4">
          <ColorArea
            colorSpace="hsb"
            xChannel="saturation"
            yChannel="brightness"
            aria-label={label}
          >
            <ColorArea.Thumb />
          </ColorArea>
          <ColorSlider channel="hue" colorSpace="hsb" aria-label={label}>
            <ColorSlider.Track>
              <ColorSlider.Thumb />
            </ColorSlider.Track>
          </ColorSlider>
          <ColorField aria-label={label}>
            <ColorField.Group
              className={`${fieldVariants({ size: 'base', variant: 'secondary' })} h-10`}
            >
              <ColorField.Input className="form-control__input" />
            </ColorField.Group>
          </ColorField>
          <ColorSwatchPicker aria-label={label}>
            {[
              '#20232A',
              '#FFFFFF',
              '#000000',
              '#0485F7',
              '#E53935',
              '#43A047',
              '#FBC02D',
              '#8E24AA',
            ].map((color) => (
              <ColorSwatchPicker.Item key={color} color={color} aria-label={color}>
                <ColorSwatch />
              </ColorSwatchPicker.Item>
            ))}
          </ColorSwatchPicker>
        </div>
      </ColorPicker.Popover>
    </ColorPicker>
  )
}
