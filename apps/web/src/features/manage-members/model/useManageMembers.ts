import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  confirmMemberEmail,
  deleteMember,
  editMember,
  getMembers,
  restrictMember,
  setMemberPublishing,
  setMemberRole,
  unrestrictMember,
} from '../api/users.ts'
import type { MemberFilters } from '../api/users.ts'

export const memberKeys = { all: ['members'] as const }
export function useMemberSearch(q: string, role = '', cursor?: string) {
  const filters: MemberFilters = { q, role }
  return useQuery({
    queryKey: [...memberKeys.all, filters, cursor],
    queryFn: ({ signal }) => getMembers(filters, cursor, signal),
  })
}
export function useManageMembers() {
  const query_client = useQueryClient()
  const refresh = () => {
    void query_client.invalidateQueries({ queryKey: memberKeys.all })
  }
  return {
    edit: useMutation({
      mutationFn: editMember,
      onSuccess: () => {
        refresh()
        void query_client.invalidateQueries({ queryKey: ['profile'] })
        void query_client.invalidateQueries({ queryKey: ['profile-summaries'] })
      },
    }),
    remove: useMutation({
      mutationFn: deleteMember,
      onSuccess: () => {
        refresh()
        for (const key of ['users', 'search', 'profile', 'follows'])
          void query_client.invalidateQueries({ queryKey: [key] })
      },
    }),
    setRole: useMutation({
      mutationFn: (input: { id: string; role: 'member' | 'admin' }) =>
        setMemberRole(input.id, input.role),
      onSuccess: refresh,
    }),
    setPublishing: useMutation({
      mutationFn: (input: { id: string; can_publish: boolean }) =>
        setMemberPublishing(input.id, input.can_publish),
      onSuccess: refresh,
    }),
    restrict: useMutation({ mutationFn: restrictMember, onSuccess: refresh }),
    unrestrict: useMutation({ mutationFn: unrestrictMember, onSuccess: refresh }),
  }
}

export function useConfirmMemberEmail() {
  const query_client = useQueryClient()
  return useMutation({
    mutationFn: confirmMemberEmail,
    onSuccess: () => {
      void query_client.invalidateQueries({ queryKey: memberKeys.all })
    },
  })
}
