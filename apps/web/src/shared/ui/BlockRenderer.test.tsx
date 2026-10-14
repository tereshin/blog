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
  it('renders buttons as external HeroUI links and drops unsafe urls and svg scripts', () => {
    const { container } = render(
      <BlockRenderer
        blocks={[
          {
            type: 'buttons',
            data: {
              items: [
                {
                  text: 'Купить',
                  url: 'https://shop.test/',
                  size: 'lg',
                  variant: 'outline',
                  icon: '<svg xmlns="http://www.w3.org/2000/svg"><script>alert(1)</script><circle cx="1" cy="1" r="1"/></svg>',
                },
                { text: 'Скрипт', url: 'javascript:alert(1)', size: 'md', variant: 'primary' },
              ],
            },
          },
        ]}
      />,
    )
    const links = container.querySelectorAll('a')
    expect(links).toHaveLength(1)
    const link = links[0]
    expect(link?.getAttribute('href')).toBe('https://shop.test/')
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link?.className).toContain('button--lg')
    expect(link?.className).toContain('button--outline')
    const icon = link?.querySelector('span')?.shadowRoot
    expect(icon?.querySelector('circle')).toBeTruthy()
    expect(icon?.querySelector('script')).toBeNull()
  })
  it('renders an attachment as a themed card and drops a non-http address', () => {
    const { container } = render(
      <BlockRenderer
        blocks={[
          { type: 'attaches', data: { title: 'Скрипт', file: { url: 'javascript:alert(1)', extension: 'pdf' } } },
          {
            type: 'attaches',
            data: {
              title: '<b>Отчёт</b>',
              file: { url: 'https://media.test/report.pdf', size: 2048, extension: 'PDF' },
            },
          },
        ]}
      />,
    )
    const link = container.querySelector('a')
    expect(container.querySelectorAll('a')).toHaveLength(1)
    expect(link?.getAttribute('href')).toBe('https://media.test/report.pdf')
    expect(link?.getAttribute('rel')).toBe('noopener noreferrer')
    expect(link?.textContent).toContain('<b>Отчёт</b>')
    expect(link?.textContent).toContain('PDF')
    expect(link?.querySelector('b,script')).toBeNull()
  })
})
