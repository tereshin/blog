import preview from '#.storybook/preview'
import { ImageGallery } from './ImageGallery.tsx'

function sample(width: number, height: number, color: string) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><rect width="100%" height="100%" fill="${color}"/><circle cx="${width * .65}" cy="${height * .35}" r="${width * .2}" fill="#ffffff" opacity=".35"/><path d="M0 ${height}L${width * .4} ${height * .4}L${width} ${height}Z" fill="#ffffff" opacity=".5"/></svg>`
  return { url: `data:image/svg+xml,${encodeURIComponent(svg)}`, width, height }
}
const items = [sample(300, 400, '#2b6777'), sample(640, 400, '#c78d5c'), sample(400, 400, '#73628a'), sample(300, 400, '#65784c')]
const meta = preview.meta({ title: 'shared/ui/ImageGallery', component: ImageGallery,
  decorators: [(Story) => <div className="max-w-xl p-4"><Story /></div>],
})
export const MultipleImages = meta.story({ args: { items, caption: 'Несколько снимков разного формата' } })
export const SingleImage = meta.story({ args: { items: items.slice(0, 1), caption: 'Один снимок' } })
export const WithoutCaption = meta.story({ args: { items } })
export const Empty = meta.story({ args: { items: [] } })
