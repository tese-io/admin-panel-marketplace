import {
  QueryKey,
  UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { sdk } from "../../lib/client";
import { queryKeysFactory } from "../../lib/query-key-factory";

/**
 * Hooks for the "Sourcing requests" ops queue — tickets users raise
 * from the CNI dashboard ("Ask tese.io to find vendors" and the
 * no-email "Ask tese.io to find the contact" fallback).
 *
 * Mercur routes (b2c-core/src/api/admin/vendor-sourcing-requests/*)
 * proxy tese-backend's cross-tenant ops API with the service key.
 */

export const vendorSourcingQueryKeys = queryKeysFactory("vendor-sourcing-request");

export type SourcingRequest = {
  id: string;
  projectId: string;
  projectName?: string;
  requesterEmail?: string;
  kind: "vendor_sourcing" | "contact_sourcing";
  vendorId?: string | null;
  vendorName?: string;
  vendorWebsite?: string;
  toolNames: string[];
  vendorCategories: string[];
  country: string;
  notes: string;
  status: "pending" | "in_progress" | "complete" | "cancelled";
  resolutionNotes: string;
  vendorsAdded: number;
  completedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

type ListParams = {
  statuses?: string;
  kind?: string;
  limit?: number;
};

export const useSourcingRequests = (
  params: ListParams = {},
  options?: Omit<
    UseQueryOptions<
      { requests: SourcingRequest[]; count: number },
      Error,
      { requests: SourcingRequest[]; count: number },
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  return useQuery({
    queryKey: [...vendorSourcingQueryKeys.list(params as any)],
    queryFn: async () =>
      sdk.client.fetch<{ requests: SourcingRequest[]; count: number }>(
        "/admin/vendor-sourcing-requests",
        { method: "GET", query: params as Record<string, any> }
      ),
    ...options,
  });
};

export const useUpdateSourcingRequest = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      status,
      resolutionNotes,
      vendorsAdded,
    }: {
      id: string;
      status?: SourcingRequest["status"];
      resolutionNotes?: string;
      vendorsAdded?: number;
    }) =>
      sdk.client.fetch<{ request: SourcingRequest }>(
        `/admin/vendor-sourcing-requests/${id}`,
        { method: "POST", body: { status, resolutionNotes, vendorsAdded } }
      ),
    onSuccess: () => {
      // Refetch every tab so the row moves to its new status bucket.
      queryClient.invalidateQueries({
        queryKey: vendorSourcingQueryKeys.lists(),
      });
    },
  });
};
