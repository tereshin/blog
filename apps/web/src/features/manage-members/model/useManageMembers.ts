import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { restrictMember, searchMembers, setMemberPublishing, setMemberRole, unrestrictMember } from '../api/users.ts'
import type { AdminUser } from '../api/users.ts'

export const memberKeys = {
  all: ['members'] as const,
  search: (q: string) => [...memberKeys.all, q] as const,
}

export function useMemberSearch(q: string) {
  return useQuery({
    queryKey: memberKeys.search(q),
    queryFn: ({ signal }) => searchMembers(q, signal),
    enabled: q.trim().length > 0,
  })
}

export function useManageMembers() {
  const queryClient = useQueryClient()
  const refresh = (user: AdminUser) => {
    queryClient.setQueriesData<AdminUser[]>({ queryKey: memberKeys.all }, (current) =>
      current?.map((item) => (item.id === user.id ? user : item)),
    )
  }
  return {
    setRole: useMutation({ mutationFn: (input: { id: string; role: 'member' | 'admin' }) => setMemberRole(input.id, input.role), onSuccess: refresh }),
    setPublishing: useMutation({
      mutationFn: (input: { id: string; can_publish: boolean }) => setMemberPublishing(input.id, input.can_publish),
      onSuccess: refresh,
    }),
    restrict: useMutation({ mutationFn: restrictMember, onSuccess: refresh }),
    unrestrict: useMutation({ mutationFn: unrestrictMember, onSuccess: refresh }),
  }
}
