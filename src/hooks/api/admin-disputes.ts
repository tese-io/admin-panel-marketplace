import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../lib/config"

const ADMIN_DISPUTES_KEY = "admin-disputes"

export function useAdminDisputes(query?: Record<string, unknown>) {
  return useQuery({
    queryKey: [ADMIN_DISPUTES_KEY, query],
    queryFn: () =>
      sdk.client.fetch<{
        disputes: any[]
        count: number
        offset: number
        limit: number
      }>("/admin/disputes", {
        method: "GET",
        query: query as Record<string, string>,
      }),
  })
}

export function useResolveDispute() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { id: string; body: { resolution_type: string; resolution_notes?: string; refund_amount?: number } }) =>
      sdk.client.fetch(`/admin/disputes/${data.id}/resolve`, {
        method: "POST",
        body: data.body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_DISPUTES_KEY] })
    },
  })
}
