import sharp from 'sharp'
import { describe, expect, it } from 'vitest'
import { validateFavicon } from '../../src/modules/media/favicon-validation.ts'
const png = (size: number) =>
  sharp({ create: { width: size, height: size, channels: 4, background: '#0485F7' } })
    .png()
    .toBuffer()
describe('favicon content validation', () => {
  it('validates PNG sizes and rejects an image disguised as PNG', async () => {
    expect(await validateFavicon(await png(96), 'png')).toBe('image/png')
    expect(await validateFavicon(await png(180), 'apple')).toBe('image/png')
    await expect(validateFavicon(await png(96), 'apple')).rejects.toThrow()
    await expect(validateFavicon(Buffer.from('<svg/>'), 'png')).rejects.toThrow()
  })
  it('validates ICO directory bounds', async () => {
    const image = await png(32),
      header = Buffer.alloc(22)
    header.writeUInt16LE(1, 2)
    header.writeUInt16LE(1, 4)
    header[6] = 32
    header[7] = 32
    header.writeUInt32LE(image.length, 14)
    header.writeUInt32LE(22, 18)
    expect(await validateFavicon(Buffer.concat([header, image]), 'ico')).toBe('image/x-icon')
    header.writeUInt32LE(image.length + 100, 14)
    await expect(validateFavicon(Buffer.concat([header, image]), 'ico')).rejects.toThrow()
  })
  it('accepts vector shapes and rejects active or external SVG content', async () => {
    expect(
      await validateFavicon(
        Buffer.from(
          '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path d="M0 0h32v32z" fill="#0485F7"/></svg>',
        ),
        'svg',
      ),
    ).toBe('image/svg+xml')
    for (const content of [
      '<script>alert(1)</script>',
      '<path onload="alert(1)"/>',
      '<use href="https://evil.example/icon.svg"/>',
      '<path fill="url(https://evil.example/icon)"/>',
      '<foreignObject/>',
    ]) {
      await expect(
        validateFavicon(
          Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`),
          'svg',
        ),
      ).rejects.toThrow()
    }
    await expect(
      validateFavicon(
        Buffer.from(
          '<!DOCTYPE svg [<!ENTITY x SYSTEM "file:///etc/passwd">]><svg xmlns="http://www.w3.org/2000/svg">&x;</svg>',
        ),
        'svg',
      ),
    ).rejects.toThrow()
  })
  it('accepts RealFaviconGenerator metadata and a verified embedded PNG', async () => {
    const image = (await png(32)).toString('base64')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"><metadata><rdf:RDF xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#" xmlns:dc="http://purl.org/dc/elements/1.1/"><rdf:Description><dc:creator>RealFaviconGenerator</dc:creator><dc:source>https://realfavicongenerator.net</dc:source></rdf:Description></rdf:RDF></metadata><image width="32" height="32" xlink:href="data:image/png;base64,${image}"/></svg>`
    expect(await validateFavicon(Buffer.from(svg), 'svg')).toBe('image/svg+xml')
    for (const content of [
      '<image href="https://evil.example/image.png"/>',
      '<image href="data:image/svg+xml;base64,PHN2Zy8+"/>',
      '<image href="data:image/png;base64,PHN2Zy8+"/>',
      '<metadata><script>alert(1)</script></metadata>',
      `<image onload="alert(1)" href="data:image/png;base64,${image}"/>`,
    ]) {
      await expect(
        validateFavicon(
          Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg">${content}</svg>`),
          'svg',
        ),
      ).rejects.toThrow()
    }
  })
  it('validates manifest JSON and URL schemes', async () => {
    expect(
      await validateFavicon(
        Buffer.from(
          JSON.stringify({ name: 'Blog', icons: [{ src: '/favicon-96x96.png', sizes: '96x96' }] }),
        ),
        'manifest',
      ),
    ).toBe('application/manifest+json')
    for (const value of ['not json', '[]', '{"icons":[{"src":"javascript:alert(1)"}]}'])
      await expect(validateFavicon(Buffer.from(value), 'manifest')).rejects.toThrow()
  })
})
