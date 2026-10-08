import type { Meta, StoryObj } from '@storybook/react-vite'
import type { ArticleBlock } from '../model/article-types.ts'
import { BlockRenderer } from './BlockRenderer.tsx'

const blocks: Record<string, ArticleBlock> = {
  paragraph: { type: 'paragraph', data: { text: 'Абзац с <b>жирным</b> и <a href="https://example.com">ссылкой</a>.' } },
  header: { type: 'header', data: { text: 'Заголовок', level: 2 } },
  list: { type: 'list', data: { style: 'checklist', items: [{ content: 'Готово', meta: { checked: true } }, { content: 'Впереди', items: ['вложенный'] }] } },
  quote: { type: 'quote', data: { text: 'Цитата', caption: 'Кто-то' } },
  warning: { type: 'warning', data: { title: 'Внимание', message: 'Проверьте данные' } },
  delimiter: { type: 'delimiter', data: {} },
  code: { type: 'code', data: { code: 'const n = 1' } },
  image: { type: 'image', data: { file: { url: 'https://example.com/pic.png' }, caption: 'Рисунок' } },
  embed: { type: 'embed', data: { service: 'youtube', source: 'https://youtu.be/x', embed: 'https://www.youtube.com/embed/x', width: 640, height: 360 } },
  table: { type: 'table', data: { withHeadings: true, content: [['Имя', 'Роль'], ['Анна', 'Автор']] } },
  attaches: { type: 'attaches', data: { file: { url: 'https://example.com/file.pdf' }, title: 'Файл' } },
  personality: { type: 'personality', data: { name: 'Анна', description: 'Пишет о ленте', photo: 'https://example.com/anna.png' } },
}

function Frame({ kind }: { kind: keyof typeof blocks }) {
  const block = blocks[kind]
  return (
    <div className="max-w-xl p-4">
      <BlockRenderer blocks={block ? [block] : []} />
    </div>
  )
}

const meta = { title: 'entities/article/BlockRenderer', component: Frame } satisfies Meta<typeof Frame>
export default meta
type Story = StoryObj<typeof Frame>

export const Paragraph: Story = { args: { kind: 'paragraph' } }
export const Header: Story = { args: { kind: 'header' } }
export const List: Story = { args: { kind: 'list' } }
export const Quote: Story = { args: { kind: 'quote' } }
export const Warning: Story = { args: { kind: 'warning' } }
export const Delimiter: Story = { args: { kind: 'delimiter' } }
export const Code: Story = { args: { kind: 'code' } }
export const Image: Story = { args: { kind: 'image' } }
export const Embed: Story = { args: { kind: 'embed' } }
export const Table: Story = { args: { kind: 'table' } }
export const Attaches: Story = { args: { kind: 'attaches' } }
export const Personality: Story = { args: { kind: 'personality' } }
