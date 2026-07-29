import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui";
import { CheckCircleSolid, XCircleSolid, ExclamationCircleSolid, Clock } from "@medusajs/icons";
import {
  useSellerCertifications,
  useVerifySellerCertification,
  type SellerCertification,
} from "../../hooks/api/seller-certifications";

/**
 * Marketplace Admin → Seller Certifications.
 *
 * Verification queue for the certifications sellers self-attach via the
 * vendor panel. Rows land here as pending, admin approves/rejects, and
 * the tese-marketplace-backend re-syncs the seller's products so the
 * verified_certifications array on every product's MarketplaceCatalog
 * row picks up the new state (via the SELLER_CERTIFICATION_CHANGED
 * subscriber). Buyer-side cards refresh on next recommend query.
 *
 * Moved from the tenant admin-dashboard per Kuzi's feedback — Mercur
 * data (Postgres seller_certification) shouldn't have to round-trip
 * through tese-backend for a review. This page hits Mercur's
 * /admin/seller-certifications endpoints directly.
 */

type TabKey = "pending" | "verified" | "rejected" | "expired";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "pending", label: "Pending", icon: <Clock /> },
  { key: "verified", label: "Verified", icon: <CheckCircleSolid /> },
  { key: "rejected", label: "Rejected", icon: <XCircleSolid /> },
  { key: "expired", label: "Expired", icon: <ExclamationCircleSolid /> },
];

const statusBadge = (status: string) => {
  switch (status) {
    case "verified":
      return <Badge color="green">verified</Badge>;
    case "rejected":
      return <Badge color="red">rejected</Badge>;
    case "expired":
      return <Badge color="orange">expired</Badge>;
    default:
      return <Badge color="grey">pending</Badge>;
  }
};

export const SellerCertificationsList = () => {
  const [tab, setTab] = useState<TabKey>("pending");
  const [openRow, setOpenRow] = useState<SellerCertification | null>(null);

  const { data, isLoading, error } = useSellerCertifications({
    verification_status: tab,
    limit: 200,
  });

  const rows = useMemo(
    () => (data?.seller_certifications || []) as SellerCertification[],
    [data]
  );

  return (
    <Container className="p-0 divide-y">
      <div className="px-6 py-4">
        <Heading level="h2">Seller Certifications</Heading>
        <Text size="small" className="mt-1 text-ui-fg-subtle">
          Review certifications sellers have attached from the shared catalog.
          Approved certifications propagate to every product from that seller
          on the buyer-side marketplace card.
        </Text>
      </div>

      <div className="flex items-center gap-1 px-6 py-3 flex-wrap">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
              tab === t.key
                ? "bg-ui-bg-base-pressed border-ui-border-base text-ui-fg-base"
                : "bg-transparent border-ui-border-base text-ui-fg-subtle hover:bg-ui-bg-base-hover"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {isLoading && (
          <div className="px-6 py-6 text-sm text-ui-fg-subtle">Loading…</div>
        )}
        {error && (
          <div className="px-6 py-6 text-sm text-ui-fg-error">
            Failed to load: {(error as Error)?.message || "unknown error"}
          </div>
        )}
        {!isLoading && !error && rows.length === 0 && (
          <div className="px-6 py-8 text-sm text-ui-fg-subtle">
            No {tab} certifications.
          </div>
        )}
        {rows.map((row) => (
          <button
            key={row.id}
            type="button"
            onClick={() => setOpenRow(row)}
            className="w-full text-left px-6 py-3 border-b border-ui-border-base last:border-0 hover:bg-ui-bg-base-hover transition-colors flex items-start justify-between gap-3"
          >
            <div className="min-w-0 flex-1">
              <div className="font-mono text-xs text-ui-fg-muted truncate" title={row.certification_slug}>
                {row.certification_slug}
              </div>
              <div className="text-xs text-ui-fg-subtle mt-0.5 truncate" title={row.seller_id}>
                Seller: <span className="font-mono">{row.seller_id}</span>
              </div>
              {row.expires_at && (
                <div className="text-[11px] text-ui-fg-muted mt-0.5">
                  Expires: {new Date(row.expires_at).toLocaleDateString()}
                </div>
              )}
            </div>
            <div className="shrink-0 flex flex-col items-end gap-1">
              {statusBadge(row.verification_status)}
              {row.proof_url && (
                <span className="text-[10px] text-ui-fg-muted">has proof</span>
              )}
            </div>
          </button>
        ))}
      </div>

      {openRow && (
        <VerifyDrawer row={openRow} onClose={() => setOpenRow(null)} />
      )}
    </Container>
  );
};


// ─────────────────────────────────────────────────────────────────────
// Verify drawer — approve / reject with notes
// ─────────────────────────────────────────────────────────────────────

const VerifyDrawer = ({
  row,
  onClose,
}: {
  row: SellerCertification;
  onClose: () => void;
}) => {
  const [notes, setNotes] = useState(row.verification_notes || "");
  const { mutateAsync, isPending } = useVerifySellerCertification();

  const act = async (decision: "approve" | "reject") => {
    try {
      await mutateAsync({
        id: row.id,
        decision,
        notes: notes.trim() || undefined,
        // The Mercur route requires verified_by; use the admin's medusa
        // auth identity — the client sends it as a string. For now we
        // just use "admin" — the underlying route can be tightened to
        // read req.auth_context.actor_id later without touching this UI.
        verified_by: "admin",
      });
      toast.success(
        `Certification ${decision === "approve" ? "approved" : "rejected"}`
      );
      onClose();
    } catch (e) {
      toast.error((e as Error)?.message || "Failed to save");
    }
  };

  const isTerminal = row.verification_status !== "pending";

  return (
    <Drawer open onOpenChange={(o: boolean) => !o && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>Certification review</Drawer.Title>
        </Drawer.Header>

        <Drawer.Body className="space-y-4">
          <div>
            <div className="text-[10px] uppercase tracking-wide text-ui-fg-subtle">Certification slug</div>
            <div className="mt-0.5 font-mono text-sm text-ui-fg-base">{row.certification_slug}</div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wide text-ui-fg-subtle">Seller</div>
            <div className="mt-0.5 font-mono text-xs text-ui-fg-base">{row.seller_id}</div>
          </div>

          <div>
            <div className="text-[10px] uppercase tracking-wide text-ui-fg-subtle">Current status</div>
            <div className="mt-1">{statusBadge(row.verification_status)}</div>
          </div>

          {row.expires_at && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-ui-fg-subtle">Expires</div>
              <div className="mt-0.5 text-sm text-ui-fg-base">
                {new Date(row.expires_at).toLocaleDateString()}
              </div>
            </div>
          )}

          {row.proof_url && (
            <div>
              <div className="text-[10px] uppercase tracking-wide text-ui-fg-subtle">Proof</div>
              <a
                href={row.proof_url}
                target="_blank"
                rel="noreferrer noopener"
                className="mt-0.5 text-sm text-ui-fg-interactive hover:underline break-all"
              >
                Open proof document
              </a>
            </div>
          )}

          <div>
            <div className="text-[10px] uppercase tracking-wide text-ui-fg-subtle mb-1">
              Review notes {isTerminal ? "(read-only)" : "(optional)"}
            </div>
            <Textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Why approved / rejected"
              rows={3}
              disabled={isTerminal}
            />
          </div>
        </Drawer.Body>

        <Drawer.Footer>
          <div className="flex gap-2 w-full">
            <Button variant="secondary" onClick={onClose} disabled={isPending}>
              Cancel
            </Button>
            {!isTerminal && (
              <>
                <Button
                  variant="danger"
                  className="flex-1"
                  onClick={() => act("reject")}
                  disabled={isPending}
                >
                  {isPending ? "Saving…" : "Reject"}
                </Button>
                <Button
                  className="flex-1"
                  onClick={() => act("approve")}
                  disabled={isPending}
                >
                  {isPending ? "Saving…" : "Approve"}
                </Button>
              </>
            )}
          </div>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
};

export const Component = SellerCertificationsList;
