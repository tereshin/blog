import { createElement, useId } from 'react'
import type { CSSProperties, ReactElement, SVGProps } from 'react'
import { icons } from './icons.generated'
import type { IconNode } from './icons.generated'

export type BaseIconProps = Omit<SVGProps<SVGSVGElement>, 'name' | 'style' | 'children'> & {
  name: string
  style?: 'fill' | 'line'
  className?: string
  size?: number | string
  svg_style?: CSSProperties
  alt?: string
}

/**
 * Icons that point somewhere along the reading axis, so they have to be
 * mirrored under `dir="rtl"`. Names that merely contain "left" or "right" as a
 * label (`align_left`, `text_direction_right`) are deliberately left out: they
 * describe a fixed physical direction and must not flip.
 */
const DIRECTIONAL_ICONS = new Set([
  'arrow_left',
  'arrow_left_circle',
  'arrow_left_down',
  'arrow_left_down_circle',
  'arrow_left_up',
  'arrow_left_up_circle',
  'arrow_right',
  'arrow_right_circle',
  'arrow_right_down',
  'arrow_right_down_circle',
  'arrow_right_up',
  'arrow_right_up_circle',
  'arrow_to_left',
  'arrow_to_right',
  'arrows_left',
  'arrows_right',
  'back',
  'back_2',
  'corner_down_left',
  'corner_down_right',
  'corner_up_left',
  'corner_up_right',
  'forward',
  'forward_2',
  'large_arrow_left',
  'large_arrow_right',
  'left',
  'left_small',
  'right',
  'right_small',
  'share_forward',
  'square_arrow_left',
  'square_arrow_right',
])

/**
 * A handful of icons carry gradients, whose ids would collide as soon as the
 * icon renders twice on a page. Scoping them to the instance keeps each
 * `url(#…)` pointing at its own definition.
 */
function scopeAttribute(value: string, scope: string): string {
  return value.replace(/url\(#([^)]+)\)/g, `url(#${scope}-$1)`)
}

function renderNode(node: IconNode, scope: string, key: number): ReactElement {
  const props: Record<string, unknown> = { key }

  for (const [name, value] of Object.entries(node.attrs)) {
    props[name] = name === 'id' ? `${scope}-${value}` : scopeAttribute(value, scope)
  }

  const children = node.children?.map((child, index) => renderNode(child, scope, index))

  return createElement(node.tag, props, children)
}

/**
 * Renders an icon from the build-time catalogue in `icons.generated.ts`.
 *
 * The markup is inlined rather than fetched so that `currentColor` works, no
 * request is made per icon, and only the icons the app references are shipped.
 * Add a new icon by using its name here and running `pnpm --filter web icons`.
 */
export function BaseIcon({
  name,
  style = 'fill',
  className = '',
  size = 24,
  svg_style,
  alt = '',
  'aria-hidden': aria_hidden,
  ...rest
}: BaseIconProps) {
  // React wraps generated ids in characters that are not safe inside a
  // `url(#…)` fragment reference, so keep only the identifier-safe part.
  const scope = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  // Icons are decorative unless an alt text is provided, matching how
  // aria-hidden inline SVG icons behave inside labelled controls.
  const hidden = aria_hidden === undefined ? !alt : aria_hidden === true || aria_hidden === 'true'
  const icon_class_name = DIRECTIONAL_ICONS.has(name) ? `rtl:-scale-x-100 ${className}` : className

  const icon = icons[`${name}:${style}`]

  if (!icon) {
    return (
      <span
        aria-hidden="true"
        className={icon_class_name}
        style={{ width: size, height: size, display: 'inline-block' }}
      />
    )
  }

  return (
    <svg
      aria-hidden={hidden || undefined}
      aria-label={alt || undefined}
      className={icon_class_name}
      fill="none"
      role={hidden ? undefined : 'img'}
      style={svg_style}
      width={size}
      height={size}
      focusable="false"
      viewBox={icon.viewBox}
      xmlns="http://www.w3.org/2000/svg"
      {...rest}
    >
      {icon.nodes.map((node, index) => renderNode(node, scope, index))}
    </svg>
  )
}
