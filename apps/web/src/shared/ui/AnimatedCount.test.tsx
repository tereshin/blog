import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, it } from 'vitest'
import { AnimatedCount } from './AnimatedCount.tsx'

afterEach(cleanup)

describe('AnimatedCount', () => {
  it('keeps the initial value still and rolls only changed places', () => {
    const { container, rerender } = render(<AnimatedCount value={128} />)
    expect(container.querySelector('.animated-count__in')).toBeNull()
    const unchanged = container.querySelector('.animated-count__place')
    rerender(<AnimatedCount value={129} />)
    expect(container.querySelector('.animated-count__place')).toBe(unchanged)
    expect(container.querySelectorAll('.animated-count__in')).toHaveLength(1)
    expect(container.querySelector('.animated-count__in')).toHaveAttribute('data-digit', '9')
    expect(container.querySelector('.animated-count__out')).toHaveAttribute('data-digit', '8')
    expect(container.querySelector('.sr-only')).toHaveTextContent('129')
    expect(container.querySelector('[aria-hidden="true"]')).toContainElement(container.querySelector('.animated-count__out'))
  })

  it('handles a carry, a decreasing value and rapid consecutive changes', () => {
    const { container, rerender } = render(<AnimatedCount value={99} />)
    rerender(<AnimatedCount value={100} />)
    expect(container.querySelector('.sr-only')).toHaveTextContent('100')
    expect(container.querySelectorAll('.animated-count__place')).toHaveLength(3)
    rerender(<AnimatedCount value={98} />)
    expect(container.firstElementChild).toHaveAttribute('data-direction', 'down')
    expect(container.querySelector('.sr-only')).toHaveTextContent('98')
    rerender(<AnimatedCount value={101} />)
    expect(container.firstElementChild).toHaveAttribute('data-direction', 'up')
    expect(container.querySelector('.sr-only')).toHaveTextContent('101')
  })

  it('preserves compact formatting and updates the locale', () => {
    const { container, rerender } = render(<AnimatedCount value={999} />)
    rerender(<AnimatedCount value={1000} />)
    expect(container.querySelector('.sr-only')).toHaveTextContent('1К')
    rerender(<AnimatedCount value={1900} locale="en" />)
    expect(container.querySelector('.sr-only')).toHaveTextContent('1.9K')
  })

  it('normalizes unavailable and negative counts without repeated renders', () => {
    const { container, rerender } = render(<AnimatedCount value={NaN} />)
    expect(container.textContent).toBe('0')
    rerender(<AnimatedCount value={-1} />)
    expect(container.textContent).toBe('0')
    rerender(<AnimatedCount value={Infinity} />)
    expect(container.textContent).toBe('0')
  })
})
