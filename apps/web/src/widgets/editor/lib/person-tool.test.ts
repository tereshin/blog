import type { API, BlockAPI } from '@editorjs/editorjs'
import { describe, expect, it, vi } from 'vitest'
import { PersonTool } from './person-tool.ts'
import type { PersonData } from './person-tool.ts'

function create(data: PersonData) {
  const show = vi.fn()
  const dispatchChange = vi.fn()
  // Тесту нужны только уведомление и сигнал изменения блока, не весь API Editor.js.
  const api = { notifier: { show } } as unknown as API
  const block = { dispatchChange } as unknown as BlockAPI
  const tool = new PersonTool({
    data,
    readOnly: false,
    api,
    block,
    config: {
      name_placeholder: 'Имя',
      position_placeholder: 'Должность',
      photo_label: 'Фото',
      upload_by_file: vi.fn(),
    },
  })
  return { tool, show, dispatchChange }
}

describe('PersonTool', () => {
  it('сохраняет имя, должность и http-адрес фото без разметки', () => {
    const { tool } = create({ name: 'Анна', position: 'Редактор', photo: 'https://media.test/a.png' })
    const root = tool.render()
    const name = root.querySelector('.person-tool__name')
    if (!(name instanceof HTMLElement)) throw new Error('нет поля имени')
    name.innerHTML = '<b>Анна</b><script>bad()</script>'
    expect(tool.save()).toEqual({
      name: 'Аннаbad()',
      position: 'Редактор',
      photo: 'https://media.test/a.png',
    })
    expect(root.querySelector('img')?.getAttribute('src')).toBe('https://media.test/a.png')
  })

  it('не подставляет фото с чужой схемой и не считает пустую карточку заполненной', () => {
    const { tool } = create({ name: 'Анна', photo: 'javascript:alert(1)' })
    const root = tool.render()
    expect(root.querySelector('img')).toBeNull()
    expect(tool.save()).toEqual({ name: 'Анна' })
    expect(tool.validate({ name: '  ' })).toBe(false)
    expect(tool.validate({ name: '', photo: 'javascript:alert(1)' })).toBe(false)
    expect(tool.validate({ name: '', position: 'Директор' })).toBe(true)
  })
})
