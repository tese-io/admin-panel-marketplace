import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../lib/config"

const ADMIN_ESCROW_KEY = "admin-escrow"

export function useAdminEscrow(query?: Record<string, unknown>) {
  return useQuery({
    queryKey: [ADMIN_ESCROW_KEY, query],
    queryFn: () =>
      sdk.client.fetch<{
        escrow_transactions: any[]
        count: number
        offset: number
        limit: number
      }>("/admin/escrow", {
        method: "GET",
        query: query as Record<string, string>,
      }),
  })
}

export function useAdminEscrowStats() {
  return useQuery({
    queryKey: [ADMIN_ESCROW_KEY, "stats"],
    queryFn: () =>
      sdk.client.fetch<{ stats: any }>("/admin/escrow/stats", {
        method: "GET",
      }),
  })
}

export function useAdminForceRelease() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { id: string; body: { reason: string; amount?: number } }) =>
      sdk.client.fetch(`/admin/escrow/${data.id}/force-release`, {
        method: "POST",
        body: data.body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_ESCROW_KEY] })
    },
  })
}
