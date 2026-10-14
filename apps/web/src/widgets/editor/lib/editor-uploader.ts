import { uploadMedia } from '@/features/upload-media'

type UploadedEditorFile = {
  success: 1
  file: { url: string; name: string; size: number; title: string; extension?: string }
}

/** Типы вложений, которые принимает media-сервис; фильтр окна выбора файла. */
export const ATTACHMENT_ACCEPT = [
  '.txt',
  '.docx',
  '.xlsx',
  '.pdf',
  '.rtf',
  '.csv',
  '.md',
  '.jpg',
  '.jpeg',
  '.png',
  '.gif',
  'text/plain',
  'text/csv',
  'text/markdown',
  'application/pdf',
  'application/rtf',
  'text/rtf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/jpeg',
  'image/png',
  'image/gif',
].join(',')

function extensionOf(name: string): string | undefined {
  const dot = name.lastIndexOf('.')
  if (dot <= 0 || dot === name.length - 1) return undefined
  const extension = name.slice(dot + 1).toLowerCase()
  return /^[a-z0-9]{1,8}$/.test(extension) ? extension : undefined
}

/** Ответ media-сервиса в формат Editor.js. Ошибку пробрасываем текстом: инструмент показывает её в блоке. */
export async function uploadEditorFile(
  file: File,
  kind: 'image' | 'attachment',
): Promise<UploadedEditorFile> {
  uploads++
  notifyUploads()
  try {
    const media = await uploadMedia(file, kind)
    const extension = extensionOf(file.name)
    return {
      success: 1,
      file: {
        url: media.url,
        name: file.name,
        size: media.byte_size,
        title: file.name,
        ...(extension ? { extension } : {}),
      },
    }
  } catch (error) {
    const message =
      error instanceof Error && error.message ? error.message : 'Не удалось загрузить файл'
    throw new Error(message, { cause: error })
  } finally {
    uploads--
    notifyUploads()
  }
}

let uploads = 0
const listeners = new Set<() => void>()
export function editorUploadCount(): number {
  return uploads
}
export function subscribeEditorUploads(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}
function notifyUploads() {
  for (const listener of listeners) listener()
}
