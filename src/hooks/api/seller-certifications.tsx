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
 * Hooks for the Mercur admin seller-certifications endpoints.
 *
 * Existing Mercur routes (packages/modules/b2c-core/src/api/admin/seller-certifications/*):
 *   GET  /admin/seller-certifications
 *   POST /admin/seller-certifications/:id/verify   body: { decision, notes, verified_by }
 *
 * The verification queue moved into admin-panel-marketplace per Kuzi's
 * feedback — Mercur data (Postgres) shouldn't have to round-trip through
 * tese-backend just to be reviewed. The tenant admin-dashboard page keeps
 * a redirect banner pointing here.
 */

export const sellerCertificationsQueryKeys = queryKeysFactory("seller-certification");

export type CertificationDocument = {
  url: string;
  filename?: string | null;
  kind?: "file" | "url";
};

export type SellerCertification = {
  id: string;
  seller_id: string;
  certification_slug: string;
  verification_status: "pending" | "verified" | "rejected" | "expired";
  verified_by?: string | null;
  verified_at?: string | null;
  verification_notes?: string | null;
  // Preferred: multi-doc array. Older rows only have document_url;
  // the list + drawer normalise so either field renders correctly.
  documents?: CertificationDocument[];
  document_url?: string | null;
  expires_at?: string | null;
  created_at?: string;
  updated_at?: string;
};

type ListParams = {
  verification_status?: "pending" | "verified" | "rejected" | "expired";
  seller_id?: string;
  certification_slug?: string;
  offset?: number;
  limit?: number;
};

export const useSellerCertifications = (
  params: ListParams = {},
  options?: Omit<
    UseQueryOptions<
      { seller_certifications: SellerCertification[]; count: number; offset: number; limit: number },
      Error,
      { seller_certifications: SellerCertification[]; count: number; offset: number; limit: number },
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) => {
  return useQuery({
    queryKey: [...sellerCertificationsQueryKeys.list(params as any)],
    queryFn: async () =>
      sdk.client.fetch<{
        seller_certifications: SellerCertification[];
        count: number;
        offset: number;
        limit: number;
      }>("/admin/seller-certifications", {
        method: "GET",
        query: params as Record<string, any>,
      }),
    ...options,
  });
};

export const useVerifySellerCertification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      decision,
      notes,
      verified_by,
    }: {
      id: string;
      decision: "approve" | "reject";
      notes?: string;
      verified_by: string;
    }) =>
      sdk.client.fetch<{ seller_certification: SellerCertification }>(
        `/admin/seller-certifications/${id}/verify`,
        {
          method: "POST",
          body: { decision, notes: notes ?? null, verified_by },
        }
      ),
    onSuccess: () => {
      // Any list query at any tab: refetch so the row moves out of its
      // current tab and into the new one on the next render.
      queryClient.invalidateQueries({
        queryKey: sellerCertificationsQueryKeys.lists(),
      });
    },
  });
};
