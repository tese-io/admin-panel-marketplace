import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { sdk } from "../../lib/config"

const ADMIN_SERVICES_KEY = "admin-services"

export function useAdminServices(query?: Record<string, unknown>) {
  return useQuery({
    queryKey: [ADMIN_SERVICES_KEY, query],
    queryFn: () =>
      sdk.client.fetch<{
        services: any[]
        count: number
        offset: number
        limit: number
      }>("/admin/marketplace-services", {
        method: "GET",
        query: query as Record<string, string>,
      }),
  })
}

export function useApproveService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      sdk.client.fetch(`/admin/marketplace-services/${id}/approve`, {
        method: "POST",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_SERVICES_KEY] })
    },
  })
}

export function useRejectService() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { id: string; body: { reason: string } }) =>
      sdk.client.fetch(`/admin/marketplace-services/${data.id}/reject`, {
        method: "POST",
        body: data.body,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [ADMIN_SERVICES_KEY] })
    },
  })
}
