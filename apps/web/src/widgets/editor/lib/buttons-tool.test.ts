import type { API, BlockAPI } from '@editorjs/editorjs'
import { describe, expect, it, vi } from 'vitest'
import { ButtonsTool } from './buttons-tool.ts'
import type { ButtonsData } from './buttons-tool.ts'

const ICON = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><circle cx="12" cy="12" r="8"/></svg>'

function create(data: Partial<ButtonsData>, readOnly = false) {
  const dispatchChange = vi.fn()
  // Тесту нужны только уведомление и сигнал изменения блока, не весь API Editor.js.
  const api = { notifier: { show: vi.fn() } } as unknown as API
  const block = { dispatchChange } as unknown as BlockAPI
  const tool = new ButtonsTool({ data, readOnly, api, block, config: {} })
  return { tool, root: tool.render(), dispatchChange }
}

function input(root: HTMLElement, selector: string): HTMLInputElement | HTMLSelectElement {
  const node = root.querySelector(selector)
  if (!(node instanceof HTMLInputElement) && !(node instanceof HTMLSelectElement)) throw new Error(selector)
  return node
}

describe('ButtonsTool', () => {
  it('рисует кнопки классами HeroUI и сохраняет размер, вариацию и иконку', () => {
    const { tool, root } = create({
      items: [{ text: 'Купить', url: 'https://shop.test/', size: 'lg', variant: 'outline', icon: ICON }],
    })
    const preview = root.querySelector('.buttons-tool__preview')
    expect(preview?.className).toContain('button--lg')
    expect(preview?.className).toContain('button--outline')
    expect(preview?.querySelector('.buttons-tool__glyph')?.shadowRoot?.querySelector('circle')).toBeTruthy()
    expect(tool.save()).toEqual({
      items: [{ text: 'Купить', url: 'https://shop.test/', size: 'lg', variant: 'outline', icon: ICON }],
    })
  })

  it('правит выбранную кнопку из полей и добавляет новую', () => {
    const { tool, root, dispatchChange } = create({})
    const text = input(root, '.buttons-tool__text')
    text.value = '  Подробнее '
    text.dispatchEvent(new Event('input'))
    const url = input(root, '.buttons-tool__url')
    url.value = 'https://blog.test/about'
    url.dispatchEvent(new Event('input'))
    const variant = input(root, '.buttons-tool__variant')
    variant.value = 'danger-soft'
    variant.dispatchEvent(new Event('change'))
    root.querySelector<HTMLButtonElement>('.buttons-tool__add')?.click()
    expect(root.querySelectorAll('.buttons-tool__preview')).toHaveLength(2)
    expect(dispatchChange).toHaveBeenCalled()
    expect(tool.save()).toEqual({
      items: [{ text: 'Подробнее', url: 'https://blog.test/about', size: 'md', variant: 'danger-soft' }],
    })
  })

  it('не сохраняет кнопку без текста или со ссылкой не по http(s)', () => {
    const { tool, root } = create({
      items: [
        { text: 'Скрипт', url: 'javascript:alert(1)', size: 'md', variant: 'primary' },
        { text: '', url: 'https://blog.test/', size: 'md', variant: 'primary' },
      ],
    })
    expect(input(root, '.buttons-tool__url').getAttribute('aria-invalid')).toBe('true')
    const saved = tool.save()
    expect(saved.items).toEqual([])
    expect(tool.validate(saved)).toBe(false)
  })

  it('в режиме чтения не показывает поля настройки', () => {
    const { root } = create(
      { items: [{ text: 'Купить', url: 'https://shop.test/', size: 'sm', variant: 'ghost' }] },
      true,
    )
    expect(root.querySelector('.buttons-tool__panel')).toBeNull()
    expect(root.querySelector('button')).toBeNull()
    expect(root.textContent).toBe('Купить')
  })
})
