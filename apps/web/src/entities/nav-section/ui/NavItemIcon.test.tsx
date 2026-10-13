import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { NavItemIcon } from './NavItemIcon.tsx'

const ICON =
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="8"/></svg>'

describe('NavItemIcon', () => {
  afterEach(() => {
    cleanup()
  })

  it('рисует проверенный svg внутри shadow root', () => {
    render(<NavItemIcon svg={ICON} size={24} />)
    const svg = document.querySelector('span')?.shadowRoot?.querySelector('svg')
    expect(svg?.getAttribute('fill')).toBe('currentColor')
    expect(svg?.querySelector('circle')?.getAttribute('r')).toBe('8')
  })

  it('не вставляет скрипт из загруженного файла', () => {
    render(
      <NavItemIcon
        svg={'<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="1" cy="1" r="1"/></svg>'}
        size={20}
      />,
    )
    const root = document.querySelector('span')?.shadowRoot
    expect(root?.querySelector('script')).toBeNull()
    expect(root?.textContent).not.toContain('alert')
  })
})
