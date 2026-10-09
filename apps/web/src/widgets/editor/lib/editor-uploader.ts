import { uploadMedia } from '@/features/upload-media'

type UploadedEditorFile = {
  success: 1
  file: { url: string; name: string; size: number; title: string }
}

/** Ответ media-сервиса в формат Editor.js. Ошибку пробрасываем текстом: инструмент показывает её в блоке. */
export async function uploadEditorFile(file: File, kind: 'image' | 'attachment'): Promise<UploadedEditorFile> {
  try {
    const media = await uploadMedia(file, kind)
    return { success: 1, file: { url: media.url, name: file.name, size: media.byte_size, title: file.name } }
  } catch (error) {
    const message = error instanceof Error && error.message ? error.message : 'Не удалось загрузить файл'
    throw new Error(message, { cause: error })
  }
}
