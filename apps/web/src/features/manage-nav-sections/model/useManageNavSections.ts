import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CreateNavSectionItem } from '@blog/contracts'
import { useViewer } from '@/entities/session'
import {
  createNavSection,
  createNavSectionItem,
  deleteNavSection,
  deleteNavSectionItem,
  listAdminNavSections,
  navSectionKeys,
  reorderNavSectionItems,
  reorderNavSections,
  updateNavSection,
  updateNavSectionItem,
} from '@/entities/nav-section'

export function reorderIds(
  ids: readonly string[],
  active_id: string,
  over_id: string,
): string[] | null {
  const from = ids.indexOf(active_id)
  const to = ids.indexOf(over_id)
  if (from < 0 || to < 0 || from === to) return null
  const next = [...ids]
  const [moved] = next.splice(from, 1)
  if (!moved) return null
  next.splice(to, 0, moved)
  return next
}

export function useManageNavSections() {
  const client = useQueryClient()
  const { is_superadmin } = useViewer()
  const sections = useQuery({
    queryKey: navSectionKeys.admin(),
    enabled: is_superadmin,
    queryFn: ({ signal }) => listAdminNavSections(signal),
  })
  const refresh = () => {
    void client.invalidateQueries({ queryKey: navSectionKeys.all })
  }
  const create = useMutation({
    mutationFn: (title: string) => createNavSection(title),
    onSuccess: refresh,
  })
  const update = useMutation({
    mutationFn: (input: { id: string; title: string }) => updateNavSection(input.id, input.title),
    onSuccess: refresh,
  })
  const remove = useMutation({
    mutationFn: (id: string) => deleteNavSection(id),
    onSuccess: refresh,
  })
  const reorder = useMutation({
    mutationFn: (section_ids: string[]) => reorderNavSections(section_ids),
    onSuccess: refresh,
  })
  const createItem = useMutation({
    mutationFn: (input: { section_id: string; body: CreateNavSectionItem }) =>
      createNavSectionItem(input.section_id, input.body),
    onSuccess: refresh,
  })
  const updateItem = useMutation({
    mutationFn: (input: { section_id: string; item_id: string; body: CreateNavSectionItem }) =>
      updateNavSectionItem(input.section_id, input.item_id, input.body),
    onSuccess: refresh,
  })
  const removeItem = useMutation({
    mutationFn: (input: { section_id: string; item_id: string }) =>
      deleteNavSectionItem(input.section_id, input.item_id),
    onSuccess: refresh,
  })
  const reorderItems = useMutation({
    mutationFn: (input: { section_id: string; item_ids: string[] }) =>
      reorderNavSectionItems(input.section_id, input.item_ids),
    onSuccess: refresh,
  })

  const moveSections = (active_id: string, over_id: string) => {
    const ids = sections.data?.items.map((section) => section.id) ?? []
    const next = reorderIds(ids, active_id, over_id)
    if (next) reorder.mutate(next)
  }
  const moveItems = (section_id: string, active_id: string, over_id: string) => {
    const ids =
      sections.data?.items.find((section) => section.id === section_id)?.items.map((item) => item.id) ??
      []
    const next = reorderIds(ids, active_id, over_id)
    if (next) reorderItems.mutate({ section_id, item_ids: next })
  }

  return {
    sections,
    create,
    update,
    remove,
    createItem,
    updateItem,
    removeItem,
    moveSections,
    moveItems,
  }
}
