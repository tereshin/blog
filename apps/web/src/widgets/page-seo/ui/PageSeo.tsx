import { usePageHead } from '../model/usePageHead.ts'

export function PageSeo({ path }: { path: string }) {
  usePageHead(path)
  return null
}
