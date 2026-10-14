import type { Readable } from 'node:stream'
import type { RouteEntry } from '../../shared/route-table.ts'

export type FileRequest = {
  entry: RouteEntry
  method: 'GET'
  url: string
  headers: Record<string, string>
  body: undefined
  content_length: undefined
}

export type FileResponse = {
  status: number
  headers: Record<string, string | string[] | undefined>
  body: Readable & { dump: () => Promise<void> }
}

/** Порт чтения файла из media-service; реализацию (прокси) подставляет app.ts. */
export type FileForwardPort = {
  forward: (input: FileRequest) => Promise<FileResponse>
}

/** Загруженный файл сайта и его версия для `ETag`. */
export type AssetLocation = { url: string; etag: string }

export type AssetFile = { mime: string; body: Readable }
