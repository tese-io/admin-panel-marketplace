import type { MemberDTO, SellerDTO } from "@custom-types/seller";

export type RequestDTO = {
  id: string;
  type: string;
  data: Record<string, unknown>;
  submitter_id: string;
  reviewer_id: string;
  reviewer_note: string;
  status: "pending" | "accepted" | "rejected";
  created_at: Date;
  updated_at: Date;
};
export interface AdminRequest {
  id?: string;
  created_at?: string;
  updated_at?: string;
  type?: string;
  data?: object;
  submitter_id?: string;
  reviewer_id?: string | null;
  reviewer_note?: string | null;
  status?: string;
  seller?: {
    id?: string;
    name?: string;
  };
}

export interface ReviewRemoveRequest {
  type: "review_remove";
  data: {
    review_id?: string;
    reason?: string;
  };
}

export interface OrderReturnRequestLineItem {
  id: string;
  line_item_id: string;
  quantity: number;
}

export interface AdminOrderReturnRequest {
  id: string;
  customer_id?: string;
  customer_note?: string;
  vendor_reviewer_id?: string;
  vendor_reviewer_note?: string;
  vendor_reviewer_date?: string;
  admin_reviewer_id?: string;
  admin_reviewer_note?: string;
  admin_reviewer_date?: string;
  status?: "pending" | "refunded" | "withdrawn" | "escalated" | "canceled";
  order?: {
    id?: string;
    customer?: {
      first_name?: string;
      last_name?: string;
    };
  };
  seller?: {
    id?: string;
    name?: string;
  };
  line_items?: OrderReturnRequestLineItem[];
  created_at?: string;
  updated_at?: string;
}

export interface AdminReviewRequest {
  reviewer_note?: string;
  status?: "accepted" | "rejected";
  /** Seller requests only: accept by attaching the applicant to this
   *  existing seller instead of creating a new store (claim flow). */
  claim_seller_id?: string;
}

/** Duplicate signals stamped onto a pending seller request by the
 *  marketplace backend (tese-backend candidate + tenant matches plus
 *  the local seller scan). */
export interface SellerDuplicateSignals {
  checked_at?: string;
  status?: "unavailable";
  error?: string;
  domain?: string | null;
  domain_usable?: boolean;
  reason?: string | null;
  candidate?: {
    domain: string;
    name: string;
    country: string | null;
    website_url: string | null;
    logo_url: string | null;
    claimed_status: string;
    linked_tenant_id: string | null;
    linked_seller_id: string | null;
  } | null;
  tenants?: Array<{
    id: string;
    name: string;
    matched_on: string;
    has_tese_seller?: boolean;
  }>;
  sellers?: Array<{
    id: string;
    name: string;
    handle: string;
    matched_on: string;
  }>;
}

export interface AdminUpdateOrderReturnRequest {
  status: string;
  admin_reviewer_note: string;
}

export interface AdminSellerRequest extends RequestDTO {
  data: {
    member: MemberDTO;
    seller: SellerDTO & {
      website?: string | null;
      company_type?: string | null;
    };
    provider_identity_id?: string;
    duplicate_signals?: SellerDuplicateSignals;
    /** Present on SSO-originated claim requests. */
    claim_target_seller_id?: string;
    tese_tenant_id?: string;
    origin?: string;
  };
}
