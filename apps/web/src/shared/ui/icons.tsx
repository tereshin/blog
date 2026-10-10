import type { SVGProps } from 'react'
import { BaseIcon } from './BaseIcon.tsx'

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'>

/** Совместимые обёртки над перенесённым каталогом SVG. */
export function SearchIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="search_2" style="line" size={20} {...props} svg_style={style} />
}

export function BellIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="notification" style="line" size={20} {...props} svg_style={style} />
}

export function PenIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="pencil" style="line" size={20} {...props} svg_style={style} />
}

export function ChevronDownIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="down" style="line" size={20} {...props} svg_style={style} />
}

export function MenuIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="menu" style="line" size={20} {...props} svg_style={style} />
}

export function ArrowUpIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="arrow_up" style="line" size={20} {...props} svg_style={style} />
}

export function ArrowLeftIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="arrow_left" style="line" size={20} {...props} svg_style={style} />
}

export function CommentIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="chat_1" style="line" size={20} {...props} svg_style={style} />
}

export function BookmarkIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="bookmark" style="line" size={20} {...props} svg_style={style} />
}

export function ShareIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="upload" style="line" size={20} {...props} svg_style={style} />
}

export function EyeIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="eye" style="line" size={20} {...props} svg_style={style} />
}

export function InboxIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="inbox" style="line" size={20} {...props} svg_style={style} />
}

export function AlertIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="alert" style="line" size={20} {...props} svg_style={style} />
}

export function MoreIcon({ style, ...props }: IconProps) {
  return <BaseIcon name="more_1" style="line" size={20} {...props} svg_style={style} />
}
