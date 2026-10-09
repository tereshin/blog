import { describe, expect, it } from 'vitest'
import { translate } from '@/shared/i18n'

describe('i18n', () => {
  it('склоняет по правилам русского языка', () => {
    expect(translate('ru', 'article.comments', { count: 1 })).toBe('1 комментарий')
    expect(translate('ru', 'article.comments', { count: 3 })).toBe('3 комментария')
    expect(translate('ru', 'article.comments', { count: 11 })).toBe('11 комментариев')
    expect(translate('ru', 'article.comments', { count: 21 })).toBe('21 комментарий')
  })

  it('берёт строку своего каталога, а не запасной русский текст', () => {
    expect(translate('en', 'header.write')).toBe('Write')
    expect(translate('sr', 'common.retry')).toBe('Pokušaj ponovo')
    expect(translate('ru', 'header.write')).toBe('Написать')
  })

  it('подставляет параметры и оставляет неизвестные плейсхолдеры как есть', () => {
    expect(translate('ru', 'profile.followers', { count: 5 })).toBe('5 подписчиков')
  })
})

describe('i18n: значение для показа', () => {
  it('{value} по умолчанию равно count, а явное value не меняет форму слова', () => {
    expect(translate('ru', 'comment.reactions', { count: 2 })).toBe('2 реакции')
    expect(translate('ru', 'comment.reactions', { count: 1500, value: '1,5К' })).toBe('1,5К реакций')
  })
})
