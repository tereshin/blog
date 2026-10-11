import { mkdir, writeFile } from 'node:fs/promises'
import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { DEFAULT_SOCIAL_COVER_SETTINGS, SOCIAL_COVER_SIZES } from '@blog/contracts'
import type { SocialCoverInput } from '@blog/contracts'
import { ownedObjectKey, renderSocialCover, createCoverRenderer } from '../../src/modules/social-cover/index.ts'
const input: SocialCoverInput = { title: 'Как меняется город: технологии, люди и новые возможности', author_name: 'Ђорђе Јовановић · Анна Авторова', site_name: 'Площадка', image_url: null, settings: DEFAULT_SOCIAL_COVER_SETTINGS }
describe('рендеринг социальных карточек', () => {
  it.each(['og', 'twitter', 'vk'] as const)('рендерит %s с кириллицей, сербским, фотографией и прозрачным логотипом', async (variant) => {
    const background = await sharp({ create: { width: 1400, height: 900, channels: 3, background: '#f5e2b8' } }).png().toBuffer()
    const logo = await sharp(Buffer.from('<svg width="140" height="90"><circle cx="70" cy="45" r="35" fill="#fca311"/></svg>')).png().toBuffer()
    const result = await renderSocialCover({ input, variant, background, logo })
    expect(await sharp(result.bytes).metadata()).toMatchObject({ format: 'jpeg', ...SOCIAL_COVER_SIZES[variant] })
    expect(result.warnings).toEqual([])
    await mkdir('/tmp/blog-seo-preview', { recursive: true })
    await writeFile(`/tmp/blog-seo-preview/${variant}.jpg`, result.bytes)
  }, 15_000)
  it('длинный заголовок и повреждённое изображение используют заливку и название сайта', async () => {
    const result = await renderSocialCover({ input: { ...input, title: 'Очень длинный заголовок '.repeat(8) }, variant: 'vk', background: Buffer.from('invalid'), logo: Buffer.from('invalid') })
    expect(result.warnings).toEqual(['background_decode_failed', 'logo_decode_failed'])
    expect(await sharp(result.bytes).metadata()).toMatchObject(SOCIAL_COVER_SIZES.vk)
    await mkdir('/tmp/blog-seo-preview', { recursive: true })
    await writeFile('/tmp/blog-seo-preview/long-vk.jpg', result.bytes)
  })
  it('пул исполняет реальный worker и корректно закрывается', async () => {
    const renderer = createCoverRenderer(1)
    try { expect(await sharp((await renderer.render({ input, variant: 'og' })).bytes).metadata()).toMatchObject(SOCIAL_COVER_SIZES.og) } finally { await renderer.close() }
  }, 15_000)
  it.each(['https://evil.example/media/uploads/a.jpg', 'http://localhost:9000/other/uploads/a.jpg', 'http://localhost:9000/media/social-covers/a.jpg', 'http://localhost:9000/media/uploads/%2e%2e%2fsecret', 'http://localhost:9000/media/uploads/a.jpg?token=1'])('отвергает ресурс %s', (url) => expect(ownedObjectKey(url, 'http://localhost:9000/media')).toBeNull())
  it('читает только ключ своей загруженной картинки', () => expect(ownedObjectKey('http://localhost:9000/media/uploads/a.jpg', 'http://localhost:9000/media')).toBe('uploads/a.jpg'))
})
