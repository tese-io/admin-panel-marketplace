import { useQuery } from "@tanstack/react-query"
import { sdk } from "../../lib/config"

const ADMIN_RFQ_KEY = "admin-rfq"

export function useAdminRfqs(query?: Record<string, unknown>) {
  return useQuery({
    queryKey: [ADMIN_RFQ_KEY, query],
    queryFn: () =>
      sdk.client.fetch<{
        rfq_requests: any[]
        count: number
        offset: number
        limit: number
      }>("/admin/rfq", {
        method: "GET",
        query: query as Record<string, string>,
      }),
  })
}

export function useAdminRfqStats() {
  return useQuery({
    queryKey: [ADMIN_RFQ_KEY, "stats"],
    queryFn: () =>
      sdk.client.fetch<{ stats: any }>("/admin/rfq/stats", {
        method: "GET",
      }),
  })
}
