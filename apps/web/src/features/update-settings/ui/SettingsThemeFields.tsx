import { DEFAULT_THEME_SETTINGS } from '@blog/contracts'
import type { ThemeSettings } from '@blog/contracts'
import { ColorSlider, Label, Slider } from '@heroui/react'
import { useEffect, useMemo } from 'react'
import { parseColor } from 'react-aria-components'
import { applyThemeCssVars, useSettings } from '@/entities/settings'
import { useT } from '@/shared/i18n'
import { FormTextField } from '@/shared/ui'

type SettingsThemeFieldsProps = {
  value: ThemeSettings
  onChange: (value: ThemeSettings) => void
}

export function SettingsThemeFields({ value, onChange }: SettingsThemeFieldsProps) {
  const { t } = useT()
  const { data } = useSettings()
  const saved = data?.theme ?? DEFAULT_THEME_SETTINGS
  const hue_color = useMemo(
    () => parseColor(`hsl(${value.header_overlay_hue}, 100%, 50%)`),
    [value.header_overlay_hue],
  )

  useEffect(() => {
    applyThemeCssVars(value)
    return () => applyThemeCssVars(saved)
  }, [value, saved])

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <FormTextField
        label={t('admin.settings.theme.radius_card')}
        value={value.radius_card}
        placeholder={DEFAULT_THEME_SETTINGS.radius_card}
        hint={t('admin.settings.theme.radius_card_hint')}
        maxLength={16}
        onChange={(event) => onChange({ ...value, radius_card: event.target.value })}
      />
      <ColorSlider
        channel="hue"
        className="w-full max-w-md"
        value={hue_color}
        onChange={(color) =>
          onChange({ ...value, header_overlay_hue: Math.round(color.getChannelValue('hue')) })
        }
      >
        <Label>{t('admin.settings.theme.header_hue')}</Label>
        <ColorSlider.Output />
        <ColorSlider.Track>
          <ColorSlider.Thumb />
        </ColorSlider.Track>
      </ColorSlider>
      <Slider
        className="w-full max-w-md"
        minValue={0}
        maxValue={100}
        step={1}
        value={value.header_overlay_lightness}
        formatOptions={{ style: 'unit', unit: 'percent', unitDisplay: 'narrow' }}
        onChange={(next) => {
          if (typeof next === 'number') onChange({ ...value, header_overlay_lightness: next })
        }}
      >
        <Label>{t('admin.settings.theme.header_lightness')}</Label>
        <Slider.Output />
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
      <Slider
        className="w-full max-w-md"
        minValue={0}
        maxValue={100}
        step={1}
        value={value.header_overlay_opacity}
        formatOptions={{ style: 'unit', unit: 'percent', unitDisplay: 'narrow' }}
        onChange={(next) => {
          if (typeof next === 'number') onChange({ ...value, header_overlay_opacity: next })
        }}
      >
        <Label>{t('admin.settings.theme.header_opacity')}</Label>
        <Slider.Output />
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
      <Slider
        className="w-full max-w-md"
        minValue={0}
        maxValue={40}
        step={1}
        value={value.header_overlay_blur_px}
        onChange={(next) => {
          if (typeof next === 'number') onChange({ ...value, header_overlay_blur_px: next })
        }}
      >
        <Label>{t('admin.settings.theme.header_blur')}</Label>
        <Slider.Output>{({ state }) => `${state.getThumbValueLabel(0)}px`}</Slider.Output>
        <Slider.Track>
          <Slider.Fill />
          <Slider.Thumb />
        </Slider.Track>
      </Slider>
    </div>
  )
}
