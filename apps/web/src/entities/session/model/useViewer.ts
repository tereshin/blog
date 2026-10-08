import { deriveViewerHelpers, toViewer } from './viewer.ts'
import type { ViewerHelpers } from './viewer.ts'
import { useSession } from './useSession.ts'

export function useViewer(): ViewerHelpers {
  const { data, isError } = useSession()
  return deriveViewerHelpers(toViewer({ session: data, is_error: isError }))
}
