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
 * Admin hooks for the business verification (KYB) review queue — B-25.
 *
 * Mercur routes (packages/modules/b2c-core/src/api/admin/business-verifications/*):
 *   GET  /admin/business-verifications
 *   GET  /admin/business-verifications/:id          (+ fresh duplicate signals)
 *   POST /admin/business-verifications/:id/review   { decision, reviewer_note, verification_method }
 *   GET  /admin/business-verifications/:id/document-url  (signed, expiring)
 */

export const businessVerificationsQueryKeys = queryKeysFactory("business-verification");

export type VerificationStatus = "pending" | "verified" | "rejected" | "archived";
export type VerificationMethod = "document_only" | "registry_checked";
export type DocumentKind =
  | "certificate_of_incorporation"
  | "registration_extract"
  | "trade_licence"
  | "tax_registration";

export type SellerSummary = {
  id: string;
  name: string | null;
  handle: string | null;
  email: string | null;
  website: string | null;
  store_status?: string | null;
};

export type DuplicateSignals = {
  checked_at: string;
  status?: "unavailable";
  error?: string;
  domain?: string | null;
  domain_usable?: boolean;
  candidate?: {
    domain: string;
    name: string;
    claimed_status: string;
    linked_tenant_id: string | null;
    linked_seller_id: string | null;
  } | null;
  tenants?: Array<{ id: string; name: string; matched_on: string }>;
  sellers: Array<{ id: string; name: string; handle: string; matched_on: string }>;
};

export type OcrPrefill = {
  legal_name: string | null;
  registration_number: string | null;
  country_of_registration: string | null;
  document_kind: DocumentKind | null;
  confidence: number | null;
};

export type BusinessVerification = {
  id: string;
  seller_id: string;
  seller?: SellerSummary | null;
  // Null once the retention sweeper deleted the file (B-29); see document_purged_at.
  document_key: string | null;
  document_url: string | null;
  document_filename: string | null;
  document_purged_at?: string | null;
  document_kind: DocumentKind;
  legal_name: string;
  registration_number: string;
  country_of_registration: string;
  ocr_prefill?: OcrPrefill | null;
  status: VerificationStatus;
  verification_method: VerificationMethod | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_note: string | null;
  duplicate_signals?: DuplicateSignals | null;
  merge_record?: {
    source_seller_id: string;
    target_seller_id: string;
    moved_member_ids: string[];
    reviewer: string;
    at: string;
  } | null;
  created_at: string;
  updated_at?: string;
};

type ListParams = {
  status?: VerificationStatus;
  seller_id?: string;
  offset?: number;
  limit?: number;
};

type ListResponse = {
  business_verifications: BusinessVerification[];
  count: number;
  offset: number;
  limit: number;
};

export const useBusinessVerifications = (
  params: ListParams = {},
  options?: Omit<
    UseQueryOptions<ListResponse, Error, ListResponse, QueryKey>,
    "queryFn" | "queryKey"
  >
) =>
  useQuery({
    queryKey: [...businessVerificationsQueryKeys.list(params as any)],
    queryFn: async () =>
      sdk.client.fetch<ListResponse>("/admin/business-verifications", {
        method: "GET",
        query: params as Record<string, any>,
      }),
    ...options,
  });

export const useBusinessVerification = (
  id: string | undefined,
  options?: Omit<
    UseQueryOptions<
      { business_verification: BusinessVerification },
      Error,
      { business_verification: BusinessVerification },
      QueryKey
    >,
    "queryFn" | "queryKey"
  >
) =>
  useQuery({
    queryKey: [...businessVerificationsQueryKeys.detail(id ?? "")],
    queryFn: async () =>
      sdk.client.fetch<{ business_verification: BusinessVerification }>(
        `/admin/business-verifications/${id}`,
        { method: "GET" }
      ),
    enabled: Boolean(id),
    ...options,
  });

export const useReviewBusinessVerification = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      id,
      decision,
      reviewer_note,
      verification_method,
      attach_to_seller_id,
    }: {
      id: string;
      decision: "approve" | "reject";
      reviewer_note?: string | null;
      verification_method?: VerificationMethod | null;
      /** B-26: approve by attaching to this existing store (shell archived). */
      attach_to_seller_id?: string | null;
    }) =>
      sdk.client.fetch<{ business_verification: BusinessVerification }>(
        `/admin/business-verifications/${id}/review`,
        {
          method: "POST",
          body: {
            decision,
            reviewer_note: reviewer_note ?? null,
            verification_method: verification_method ?? null,
            ...(attach_to_seller_id ? { attach_to_seller_id } : {}),
          },
        }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: businessVerificationsQueryKeys.lists() });
      queryClient.invalidateQueries({ queryKey: businessVerificationsQueryKeys.details() });
    },
  });
};

/** One-shot signed link — expires in minutes, never cached. */
export const fetchBusinessVerificationDocumentUrl = (id: string) =>
  sdk.client.fetch<{ url: string; expires_in: number }>(
    `/admin/business-verifications/${id}/document-url`,
    { method: "GET" }
  );
