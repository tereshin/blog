import AxeBuilder from '@axe-core/playwright'
import { expect as base_expect, test } from '@playwright/test'
import type { Page } from '@playwright/test'

const expect = base_expect.configure({ timeout: 15_000 })

function blogs(page: Page) {
  return page.getByRole('main').getByRole('region', { name: 'Блоги', exact: true })
}
function topics(page: Page) {
  return page.getByRole('main').getByRole('region', { name: 'Темы', exact: true })
}
function field(page: Page) {
  return page.getByRole('main').getByRole('searchbox', { name: 'Поиск', exact: true })
}

test('обзор показывает по пять записей, номера и полный список тем', async ({ page }, info) => {
  if (info.project.name.endsWith('light'))
    await page.addInitScript(() => localStorage.setItem('appearance', 'light'))
  await page.goto('/discovery')
  await expect(blogs(page).getByRole('listitem')).toHaveCount(5)
  await expect(topics(page).getByRole('listitem')).toHaveCount(5)
  await expect(blogs(page).locator('.tabular-nums')).toHaveText(['1', '2', '3', '4', '5'])
  await expect(field(page)).not.toBeFocused()
  await expect(blogs(page).getByRole('button', { name: 'Подписаться' })).toHaveCount(5)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
  const audit = await new AxeBuilder({ page }).include('main').analyze()
  expect(audit.violations).toEqual([])
  await page.screenshot({ path: info.outputPath('discovery.png'), fullPage: true })
  await topics(page).getByRole('link', { name: 'Показать все' }).click()
  await expect(page).toHaveURL(/\/discovery\/topics$/)
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(6)
  await expect(page.getByRole('main').locator('li a:nth-child(2) > span:first-child')).toHaveText([
    'Технологии',
    'Дизайн',
    'Наука',
    'Культура',
    'Личный опыт',
    'Сервисы',
  ])
  await page.getByRole('banner').getByRole('link', { name: 'Назад', exact: true }).click()
  await blogs(page).getByRole('link', { name: 'Показать все' }).click()
  await expect(page).toHaveURL(/\/discovery\/blogs$/)
  await expect(page.getByRole('main').locator('.tabular-nums')).toHaveText([
    '1',
    '2',
    '3',
    '4',
    '5',
    '6',
  ])
})

test('старые ссылки сохраняют query и заменяют запись истории', async ({ page }) => {
  await page.goto('/')
  await page.evaluate(() => {
    history.pushState({ idx: 1 }, '', '/rating?ref=old')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(page).toHaveURL(/\/discovery\/blogs\?ref=old$/)
  await page.goBack()
  await expect(page).toHaveURL(/\/$/)
  await page.goto('/search?q=Анна&ref=old')
  await expect.poll(() => new URL(page.url()).pathname).toBe('/discovery')
  await expect(field(page)).toHaveValue('Анна')
  expect(new URL(page.url()).searchParams.get('ref')).toBe('old')
  await expect(blogs(page).getByText('@anna')).toBeVisible()
})

test('поиск на странице, короткий запрос, очистка и синхронизация истории', async ({ page }) => {
  await page.goto('/discovery')
  await field(page).fill('Анна')
  await expect(blogs(page).getByText('@anna')).toBeVisible()
  await expect(blogs(page).getByRole('listitem')).toHaveCount(1)
  await expect.poll(() => new URL(page.url()).searchParams.get('q')).toBe('Анна')
  await field(page).fill('Технологии')
  await expect(topics(page).getByText('@tehnologii')).toBeVisible()
  await expect(blogs(page)).toHaveCount(0)
  await field(page).fill('несуществующийзапрос')
  await expect(page.getByRole('main').getByText('Ничего не нашлось')).toBeVisible()
  await field(page).fill('а')
  await expect(page.getByRole('main').getByText('Введите хотя бы 2 символа')).toBeVisible()
  await page.getByRole('main').getByRole('button', { name: 'Очистить запрос' }).click()
  await expect(field(page)).toBeFocused()
  await expect(blogs(page).getByRole('listitem')).toHaveCount(5)
  await page.evaluate(() => {
    history.pushState({ idx: 1 }, '', '/discovery?q=Анна')
    dispatchEvent(new PopStateEvent('popstate'))
  })
  await expect(field(page)).toHaveValue('Анна')
  await page.goBack()
  await expect(field(page)).toHaveValue('')
  await page.goForward()
  await expect(field(page)).toHaveValue('Анна')
})

test('подписки запрашиваются пакетно, обновляются между списками, собственный блог без кнопки', async ({
  page,
}) => {
  await page.addInitScript(() => {
    localStorage.setItem('mock_viewer', 'member')
    const original = window.fetch.bind(window)
    const calls: string[] = []
    Object.assign(window, { discovery_follow_calls: calls })
    window.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href)
      if (url.pathname.endsWith('/v1/me/follows')) calls.push(url.search)
      return original(input, options)
    }
  })
  await page.goto('/discovery')
  const anna = blogs(page).getByRole('listitem').filter({ hasText: '@anna' })
  await expect(anna.getByRole('button', { name: 'Подписаться' })).toBeVisible()
  await expect(
    blogs(page).getByRole('listitem').filter({ hasText: '@reader' }).getByRole('button'),
  ).toHaveCount(0)
  await expect(topics(page).getByRole('button', { name: 'Подписаться' })).toHaveCount(5)
  expect(await page.evaluate(() => Reflect.get(window, 'discovery_follow_calls').length)).toBe(2)
  await anna.getByRole('button', { name: 'Подписаться' }).click()
  await expect(anna.getByRole('button', { name: 'Отписаться' })).toBeEnabled()
  await blogs(page).getByRole('link', { name: 'Показать все' }).click()
  const full_anna = page.getByRole('main').getByRole('listitem').filter({ hasText: '@anna' })
  await expect(full_anna.getByRole('button', { name: 'Отписаться' })).toBeVisible()
  await full_anna.getByRole('button', { name: 'Отписаться' }).click()
  await expect(full_anna.getByRole('button', { name: 'Подписаться' })).toBeEnabled()
})

test('гость по подписке открывает вход без запроса состояний', async ({ page }) => {
  let requests = 0
  page.on('request', (request) => {
    if (request.url().includes('/v1/me/follows')) requests++
  })
  await page.goto('/discovery')
  await blogs(page).getByRole('button', { name: 'Подписаться' }).first().click()
  await expect(page.getByRole('dialog')).toContainText('Войдите, чтобы продолжить')
  await expect(page).toHaveURL(/\/discovery$/)
  expect(requests).toBe(0)
})

test('мобильная панель открывает Discovery и вход; на desktop остаётся модальный поиск', async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/')
  const nav = page.getByRole('navigation', { name: 'Мобильная навигация' })
  await expect(nav.getByRole('link')).toHaveCount(3)
  await expect(nav.getByRole('button')).toHaveCount(2)
  await expect(nav.getByRole('button', { name: 'Войти' })).toHaveText('')
  await nav.getByRole('link', { name: 'Обзор' }).click()
  await expect(nav.getByRole('link', { name: 'Обзор' })).toHaveAttribute('aria-current', 'page')
  await expect(field(page)).not.toBeFocused()
  await nav.getByRole('button', { name: 'Войти' }).click()
  await expect(page.getByRole('dialog')).toContainText('Войдите, чтобы продолжить')
  await page.keyboard.press('Escape')
  await page.setViewportSize({ width: 1280, height: 800 })
  await expect(nav).toHaveCount(0)
  await page.getByRole('banner').getByRole('button', { name: 'Поиск', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Поиск', exact: true })).toBeVisible()
})

test('мобильный аккаунт участника открывает меню и сохраняет пять иконок', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('mock_viewer', 'member'))
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto('/discovery/topics')
  const nav = page.getByRole('navigation', { name: 'Мобильная навигация' })
  await expect(nav.getByRole('link', { name: 'Обзор' })).toHaveAttribute('aria-current', 'page')
  await nav.getByRole('button', { name: 'Меню учётной записи' }).click()
  await expect(page.getByRole('menu')).toBeVisible()
  await expect(page.getByRole('menuitem', { name: 'Мой профиль' })).toBeVisible()
})

test('длинный список тем виртуализируется и последний пункт доступен', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.fetch.bind(window)
    window.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href)
      if (url.pathname === '/v1/topics')
        return Response.json(
          Array.from({ length: 150 }, (_, index) => ({
            id: `5f0f6a52-0d8b-4f6e-a8b1-${String(index + 1).padStart(12, '0')}`,
            title: `Тема ${index + 1}`,
            slug: `topic-${index + 1}`,
            status: 'active',
            position: index,
          })),
        )
      return original(input, options)
    }
  })
  await page.goto('/discovery/topics')
  await expect(page.getByRole('main').getByText('Тема 1', { exact: true })).toBeVisible()
  expect(await page.getByRole('main').getByRole('listitem').count()).toBeLessThan(50)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect(page.getByRole('main').getByText('Тема 150', { exact: true })).toBeVisible()
})

test('ошибка одного обзора не скрывает второй, пустые списки не подставляют записи', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.fetch.bind(window)
    let fail = true
    window.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href)
      if (url.pathname === '/v1/rating') {
        if (fail) {
          fail = false
          return Response.json({ code: 'validation_failed', title: 'Unavailable' }, { status: 422 })
        }
        return Response.json({ items: [], next_cursor: null })
      }
      return original(input, options)
    }
  })
  await page.goto('/discovery')
  await expect(blogs(page).getByRole('alert')).toBeVisible()
  await expect(topics(page).getByRole('listitem')).toHaveCount(5)
  await blogs(page).getByRole('button', { name: 'Повторить' }).click()
  await expect(blogs(page).getByText('Пока ничего нет')).toBeVisible()
  await expect(blogs(page).getByRole('listitem')).toHaveCount(0)
})

test('ошибка поиска повторяется, запоздалый ответ не возвращает предыдущую выдачу', async ({
  page,
}) => {
  await page.addInitScript(() => {
    const original = window.fetch.bind(window)
    let fail = true
    window.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href)
      if (url.pathname === '/v1/search' && fail) {
        fail = false
        return Response.json({ code: 'validation_failed', title: 'Unavailable' }, { status: 422 })
      }
      const response = await original(input, options)
      if (url.pathname === '/v1/search' && url.searchParams.get('q') === 'Анна')
        await new Promise((resolve) => setTimeout(resolve, 700))
      return response
    }
  })
  await page.goto('/discovery?q=Анна')
  await expect(page.getByRole('main').getByRole('alert')).toBeVisible()
  await page.getByRole('main').getByRole('button', { name: 'Повторить' }).click()
  await expect(page.getByRole('main').getByRole('status', { name: 'Загрузка…' })).toBeVisible()
  await field(page).fill('Технологии')
  await expect(topics(page).getByText('@tehnologii')).toBeVisible()
  await expect(blogs(page)).toHaveCount(0)
})

test('полный рейтинг продолжает нумерацию при загрузке следующей страницы', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.fetch.bind(window)
    window.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href)
      if (url.pathname === '/v1/rating') {
        const start = Number(url.searchParams.get('cursor') ?? 0)
        const limit = Number(url.searchParams.get('limit') ?? 20)
        const entries = Array.from({ length: 26 }, (_, index) => ({
          user_id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
          display_name: `Блог ${index + 1}`,
          avatar_url: null,
          slug: String(index + 1),
          reputation: Math.floor((26 - index) / 2),
        }))
        return Response.json({
          items: entries.slice(start, start + limit),
          next_cursor: start + limit < entries.length ? String(start + limit) : null,
        })
      }
      return original(input, options)
    }
  })
  await page.goto('/discovery/blogs')
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(20)
  await page.getByRole('main').getByRole('button', { name: 'Ещё', exact: true }).click()
  await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(26)
  await expect(page.getByRole('main').locator('.tabular-nums')).toHaveText(
    Array.from({ length: 26 }, (_, index) => String(index + 1)),
  )
})

test('статьи поиска загружают следующий курсор, сохраняя первую страницу', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.fetch.bind(window)
    let template: Record<string, unknown> | undefined
    window.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href)
      const response = await original(input, options)
      if (url.pathname !== '/v1/search') return response
      // Derive an article from the real fixture contract, then provide two pages.
      const data = (await response.json()) as { articles: Record<string, unknown>[] }
      template ??= data.articles[0]
      if (!template) return Response.json(data)
      const entries = Array.from({ length: 21 }, (_, index) => ({
        ...template,
        id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        slug: `found-${index + 1}`,
        title: `Найденная статья ${index + 1}`,
      }))
      const start = Number(url.searchParams.get('cursor') ?? 0)
      return Response.json({
        articles: entries.slice(start, start + 20),
        people: [],
        topics: [],
        next_cursor: start ? null : '20',
      })
    }
  })
  await page.goto('/discovery?q=компромиссов')
  await expect(page.getByRole('main').getByRole('article')).toHaveCount(20)
  await page.getByRole('main').getByRole('button', { name: 'Ещё', exact: true }).click()
  await expect(page.getByRole('main').getByRole('article')).toHaveCount(21)
  await expect(
    page.getByRole('main').getByRole('heading', { name: 'Найденная статья 1', exact: true }),
  ).toBeVisible()
})

test('рейтинг после ста записей виртуализируется, сохраняет места и длинные имена', async ({ page }) => {
  await page.addInitScript(() => {
    const original = window.fetch.bind(window)
    window.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href)
      if (url.pathname === '/v1/rating') {
        const start = Number(url.searchParams.get('cursor') ?? 0)
        const limit = Number(url.searchParams.get('limit') ?? 20)
        const entries = Array.from({ length: 106 }, (_, index) => ({
          user_id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
          display_name: `Очень длинное название блога номер ${index + 1} с дополнительными словами`,
          avatar_url: null, slug: String(index + 1), reputation: 106 - index,
        }))
        return Response.json({ items: entries.slice(start, start + limit), next_cursor: start + limit < entries.length ? String(start + limit) : null })
      }
      return original(input, options)
    }
  })
  await page.goto('/discovery/blogs')
  const more = page.getByRole('main').getByRole('button', { name: 'Ещё', exact: true })
  for (let page_number = 1; page_number <= 5; page_number++) {
    await expect(page.getByRole('main').getByRole('listitem')).toHaveCount(page_number * 20)
    await more.click()
  }
  await expect(more).toHaveCount(0)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect(page.getByRole('main').getByText('@106', { exact: true })).toBeVisible()
  expect(await page.getByRole('main').getByRole('listitem').count()).toBeLessThan(50)
  await expect(page.getByRole('main').locator('.tabular-nums').last()).toHaveText('106')
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true)
})

test('длинная поисковая выдача виртуализируется после ста статей', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.addInitScript(() => {
    const original = window.fetch.bind(window)
    let template: Record<string, unknown> | undefined
    window.fetch = async (input, options) => {
      const url = new URL(input instanceof Request ? input.url : String(input), location.href)
      const response = await original(input, options)
      if (url.pathname !== '/v1/search') return response
      const data = await response.json() as { articles: Record<string, unknown>[] }
      template ??= data.articles[0]
      if (!template) return Response.json(data)
      const entries = Array.from({ length: 106 }, (_, index) => ({
        ...template, id: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
        slug: `found-${index + 1}`, title: `Найденная статья ${index + 1}`,
      }))
      const start = Number(url.searchParams.get('cursor') ?? 0)
      return Response.json({ articles: entries.slice(start, start + 20), people: [], topics: [], next_cursor: start + 20 < entries.length ? String(start + 20) : null })
    }
  })
  await page.goto('/discovery?q=компромиссов')
  const more = page.getByRole('main').getByRole('button', { name: 'Ещё', exact: true })
  for (let page_number = 1; page_number <= 5; page_number++) {
    await expect(page.getByRole('main').getByRole('article')).toHaveCount(page_number * 20)
    await more.click()
  }
  await expect(more).toHaveCount(0)
  await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
  await expect(page.getByRole('main').getByRole('heading', { name: 'Найденная статья 106', exact: true })).toBeVisible()
  expect(await page.getByRole('main').getByRole('article').count()).toBeLessThan(30)
  expect(errors).toEqual([])
})
