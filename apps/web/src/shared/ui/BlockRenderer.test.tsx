import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { BlockRenderer } from './BlockRenderer.tsx'
describe('shared document renderer', () => {
  it('sanitizes quote captions before unsaved preview reaches the DOM', () => {
    const { container } = render(
      <BlockRenderer
        blocks={[
          {
            type: 'quote',
            data: {
              text: 'Quote',
              caption: '<img src=x onerror="alert(1)"><script>bad()</script><b>Caption</b>',
            },
          },
        ]}
      />,
    )
    expect(screen.getByText('Caption')).toBeTruthy()
    expect(container.querySelector('script,img')).toBeNull()
  })
  it('rejects embed origins controlled by an author', () => {
    const { container } = render(
      <BlockRenderer
        blocks={[
          { type: 'embed', data: { service: 'youtube', embed: 'https://evil.test/embed/video' } },
          {
            type: 'embed',
            data: { service: 'youtube', embed: 'https://www.youtube-nocookie.com/embed/test' },
          },
        ]}
      />,
    )
    expect(container.querySelectorAll('iframe')).toHaveLength(1)
    expect(container.querySelector('iframe')?.src).toContain('youtube-nocookie.com')
  })
  it('renders a person as text under an http photo', () => {
    const { container } = render(
      <BlockRenderer
        blocks={[
          {
            type: 'personality',
            data: {
              name: '<b>Анна</b>',
              position: 'Редактор',
              photo: 'javascript:alert(1)',
            },
          },
        ]}
      />,
    )
    expect(screen.getByText('<b>Анна</b>')).toBeTruthy()
    expect(screen.getByText('Редактор')).toBeTruthy()
    expect(container.querySelector('img,b,script')).toBeNull()
  })
})
