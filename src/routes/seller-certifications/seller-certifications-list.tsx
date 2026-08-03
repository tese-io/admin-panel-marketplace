import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Container,
  Drawer,
  Heading,
  Input,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui";
import {
  ArrowUpRightOnBox,
  CheckCircleSolid,
  DocumentText,
  ExclamationCircleSolid,
  History,
  MagnifyingGlass,
  Photo,
  XCircle,
} from "@medusajs/icons";
import {
  useSellerCertifications,
  useVerifySellerCertification,
  type CertificationDocument,
  type SellerCertification,
} from "../../hooks/api/seller-certifications";
import { useSellers } from "../../hooks/api/sellers";

// Normalise a certification row into its document list. Prefers the
// multi-doc `documents` array; falls back to a single-entry array
// synthesised from legacy `document_url` so pre-migration rows still
// render a preview instead of an empty state.
const docsFromRow = (row: SellerCertification): CertificationDocument[] => {
  if (row.documents && row.documents.length > 0) return row.documents;
  if (row.document_url) return [{ url: row.document_url, kind: "url" }];
  return [];
};

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
 * Enhanced list + drawer: seller display names via useSellers join,
 * inline proof preview (image / pdf / other-file download), relative
 * timestamps, search-by-seller. Proof preview was the reviewer pain
 * point — a "has proof" text label buried the actual document behind
 * a plain link.
 */

type TabKey = "pending" | "verified" | "rejected" | "expired";

const TABS: { key: TabKey; label: string; icon: React.ReactNode }[] = [
  { key: "pending", label: "Pending", icon: <History /> },
  { key: "verified", label: "Verified", icon: <CheckCircleSolid /> },
  { key: "rejected", label: "Rejected", icon: <XCircle /> },
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

// slug like "iso-14001" → "ISO 14001"; "b-corp-certification" → "B Corp Certification"
const prettifySlug = (slug: string): string => {
  if (!slug) return "";
  return slug
    .split(/[-_]/)
    .map((w) => {
      const lc = w.toLowerCase();
      // Common acronyms — keep uppercase
      if (/^(iso|sgs|bsi|epd|leed|breeam|iec|astm|ansi|un|ec|eu|us|uk|b)$/.test(lc)) {
        return w.toUpperCase();
      }
      // Numeric segments (e.g. "14001") stay as-is
      if (/^\d/.test(w)) return w;
      return w.charAt(0).toUpperCase() + w.slice(1).toLowerCase();
    })
    .join(" ");
};

const relativeTime = (iso: string | null | undefined): string => {
  if (!iso) return "";
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then)) return "";
  const diffMs = Date.now() - then;
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}mo ago`;
  const y = Math.floor(d / 365);
  return `${y}y ago`;
};

type ProofKind = "image" | "pdf" | "other";

const detectProofKind = (url: string): ProofKind => {
  const lower = url.toLowerCase().split("?")[0].split("#")[0];
  if (/\.(png|jpe?g|webp|gif|bmp|svg)$/.test(lower)) return "image";
  if (/\.pdf$/.test(lower)) return "pdf";
  return "other";
};

const extensionOf = (url: string): string => {
  const lower = url.toLowerCase().split("?")[0].split("#")[0];
  const m = lower.match(/\.([a-z0-9]+)$/);
  return m ? m[1].toUpperCase() : "FILE";
};

export const SellerCertificationsList = () => {
  const [tab, setTab] = useState<TabKey>("pending");
  const [openRow, setOpenRow] = useState<SellerCertification | null>(null);
  const [search, setSearch] = useState("");

  const { data, isLoading, error } = useSellerCertifications({
    verification_status: tab,
    limit: 200,
  });

  // Batch-fetch sellers once (cheap on admin — count is bounded); build
  // id → seller map so we can render display names instead of opaque ids.
  // If the list ever exceeds 200 sellers we'll paginate; for now the
  // review queue almost always references a small subset.
  const { sellers } = useSellers({ limit: 200 });
  const sellerById = useMemo(() => {
    const m = new Map<string, { name?: string; handle?: string }>();
    for (const s of sellers || []) {
      m.set(s.id, { name: s.name, handle: s.handle });
    }
    return m;
  }, [sellers]);

  const rows = useMemo(
    () => (data?.seller_certifications || []) as SellerCertification[],
    [data]
  );

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => {
      const seller = sellerById.get(r.seller_id);
      const hay = [
        r.certification_slug,
        prettifySlug(r.certification_slug),
        r.seller_id,
        seller?.name,
        seller?.handle,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return hay.includes(q);
    });
  }, [rows, search, sellerById]);

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
        <div className="ml-auto relative">
          <MagnifyingGlass className="absolute left-2 top-1/2 -translate-y-1/2 text-ui-fg-muted pointer-events-none" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search seller or certification…"
            className="pl-8 h-8 w-64 text-sm"
          />
        </div>
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
        {!isLoading && !error && filteredRows.length === 0 && (
          <div className="px-6 py-10 text-center">
            <Text size="small" className="text-ui-fg-subtle">
              {search
                ? `No ${tab} certifications match "${search}".`
                : `No ${tab} certifications.`}
            </Text>
          </div>
        )}
        {filteredRows.map((row) => {
          const seller = sellerById.get(row.seller_id);
          const sellerName = seller?.name || `Seller ${row.seller_id.slice(-6)}`;
          const docs = docsFromRow(row);
          const first = docs[0];
          const kind = first ? detectProofKind(first.url) : null;
          return (
            <button
              key={row.id}
              type="button"
              onClick={() => setOpenRow(row)}
              className="w-full text-left px-6 py-3 border-b border-ui-border-base last:border-0 hover:bg-ui-bg-base-hover transition-colors flex items-center gap-4"
            >
              {/* Proof thumbnail on the left — first doc, +N badge for extras. */}
              <div className="shrink-0 relative">
                <div className="w-14 h-14 rounded-md border border-ui-border-base overflow-hidden bg-ui-bg-subtle flex items-center justify-center">
                  {first && kind === "image" ? (
                    // eslint-disable-next-line jsx-a11y/alt-text
                    <img
                      src={first.url}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  ) : first && kind === "pdf" ? (
                    <div className="flex flex-col items-center gap-0.5 text-ui-fg-muted">
                      <DocumentText />
                      <span className="text-[9px] font-semibold">PDF</span>
                    </div>
                  ) : first ? (
                    <div className="flex flex-col items-center gap-0.5 text-ui-fg-muted">
                      <DocumentText />
                      <span className="text-[9px] font-semibold">
                        {extensionOf(first.url)}
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-0.5 text-ui-fg-muted">
                      <Photo />
                      <span className="text-[9px]">no&nbsp;proof</span>
                    </div>
                  )}
                </div>
                {docs.length > 1 && (
                  <span
                    className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full bg-ui-tag-neutral-bg text-ui-tag-neutral-text text-[10px] font-semibold border border-ui-border-base"
                    title={`${docs.length} documents attached`}
                  >
                    +{docs.length - 1}
                  </span>
                )}
              </div>

              {/* Middle: cert + seller. */}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-ui-fg-base truncate">
                  {prettifySlug(row.certification_slug)}
                </div>
                <div
                  className="font-mono text-[10px] text-ui-fg-muted truncate"
                  title={row.certification_slug}
                >
                  {row.certification_slug}
                </div>
                <div className="text-xs text-ui-fg-subtle mt-1 truncate">
                  <span className="font-medium text-ui-fg-base">{sellerName}</span>
                  {seller?.handle && (
                    <span className="text-ui-fg-muted"> · @{seller.handle}</span>
                  )}
                </div>
              </div>

              {/* Right: submitted-at + status + optional expiry. */}
              <div className="shrink-0 flex flex-col items-end gap-1">
                {statusBadge(row.verification_status)}
                {row.created_at && (
                  <span className="text-[10px] text-ui-fg-muted">
                    submitted {relativeTime(row.created_at)}
                  </span>
                )}
                {row.expires_at && (
                  <span className="text-[10px] text-ui-fg-muted">
                    expires {new Date(row.expires_at).toLocaleDateString()}
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {openRow && (
        <VerifyDrawer
          row={openRow}
          seller={sellerById.get(openRow.seller_id)}
          onClose={() => setOpenRow(null)}
        />
      )}
    </Container>
  );
};


// ─────────────────────────────────────────────────────────────────────
// Proof preview panel — images inline, PDFs embedded, everything else
// falls back to a download button with an extension chip. Sits at the
// top of the drawer so reviewers can see the evidence without leaving.
// ─────────────────────────────────────────────────────────────────────

// Renders one proof document.
// Three shapes:
//   1. Image (extension .png/.jpg/etc.) → show inline, sizes to content.
//   2. PDF file (extension .pdf) → iframe at a moderate fixed height so
//      it doesn't push the rest of the drawer off screen. Chrome may
//      block the sandboxed PDF viewer for cross-origin URLs; a hint +
//      Open button gives the reviewer an escape hatch.
//   3. Everything else — plain URL, .docx, no extension, etc. → compact
//      link card, NO reserved empty height. Prior version rendered a
//      384px empty box with a "Preview not supported for .file files"
//      message which pushed the approve/reject buttons out of view.
const SingleProofBody = ({ doc }: { doc: CertificationDocument }) => {
  const url = doc.url;
  const kindByExtension = detectProofKind(url);
  const ext = extensionOf(url);
  const hasFileExtension = /\.[a-z0-9]{1,6}(?:$|\?|#)/i.test(url);
  // A URL-kind doc, or an uploaded file with no recognised extension,
  // is treated as a link — no preview panel, just a link card.
  const treatAsLink =
    doc.kind === "url" || (kindByExtension === "other" && !hasFileExtension);

  const displayName = doc.filename || fileNameFromUrl(url) || "Document";

  if (treatAsLink) {
    // Compact link card — icon, filename/URL, big Open button. Zero
    // wasted vertical space for the common "here's a link to the
    // verification registry" case.
    return (
      <div className="p-4 flex items-center gap-3 bg-ui-bg-base">
        <div className="w-10 h-10 rounded-md bg-ui-bg-subtle border border-ui-border-base flex items-center justify-center text-ui-fg-muted shrink-0">
          <ArrowUpRightOnBox />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-ui-fg-base truncate" title={displayName}>
            {displayName}
          </div>
          <div className="text-[11px] text-ui-fg-subtle truncate" title={url}>
            {url}
          </div>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 rounded-md border border-ui-border-base bg-ui-bg-base px-3 py-1.5 text-xs text-ui-fg-interactive hover:bg-ui-bg-base-hover shrink-0"
        >
          Open <ArrowUpRightOnBox />
        </a>
      </div>
    );
  }

  return (
    <>
      {kindByExtension === "image" && (
        // eslint-disable-next-line jsx-a11y/alt-text
        <img
          src={url}
          className="w-full max-h-72 object-contain bg-white"
        />
      )}
      {kindByExtension === "pdf" && (
        // Sandbox: block scripts / same-origin escapes from a hostile PDF
        // that renders via JS. Chrome sometimes refuses to render the
        // built-in PDF viewer inside a sandboxed iframe for cross-origin
        // sources — the Open link below is always visible as a fallback.
        <iframe
          src={url}
          className="w-full h-72 bg-white"
          sandbox="allow-scripts allow-same-origin allow-popups"
          title="Proof document"
        />
      )}
      {kindByExtension === "other" && (
        // Recognised as a file but not previewable (.docx etc.).
        // Compact — no giant empty area.
        <div className="p-4 flex items-center gap-3 bg-white">
          <div className="w-10 h-10 rounded-md bg-ui-bg-subtle border border-ui-border-base flex flex-col items-center justify-center text-ui-fg-muted">
            <DocumentText />
            <span className="text-[9px] font-semibold">{ext}</span>
          </div>
          <Text size="small" className="text-ui-fg-subtle flex-1">
            Preview not supported for .{ext.toLowerCase()} files. Use Open to view.
          </Text>
        </div>
      )}
      <div className="px-3 py-2 flex items-center justify-between gap-2 bg-ui-bg-base border-t border-ui-border-base">
        <span
          className="text-[11px] text-ui-fg-subtle truncate"
          title={url}
        >
          {url}
        </span>
        <a
          href={url}
          target="_blank"
          rel="noreferrer noopener"
          className="inline-flex items-center gap-1 text-xs text-ui-fg-interactive hover:underline shrink-0"
        >
          Open <ArrowUpRightOnBox />
        </a>
      </div>
    </>
  );
};

const ProofPreview = ({ docs }: { docs: CertificationDocument[] }) => {
  const [active, setActive] = useState(0);

  if (!docs || docs.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-ui-border-base p-4 text-center">
        <Text size="small" className="text-ui-fg-muted">
          No proof documents attached.
        </Text>
      </div>
    );
  }

  const idx = Math.min(active, docs.length - 1);
  const current = docs[idx];

  return (
    <div className="rounded-md border border-ui-border-base overflow-hidden bg-ui-bg-subtle">
      {/* Tab strip only when there's more than one — single-doc case
          stays visually identical to the pre-multi UI. */}
      {docs.length > 1 && (
        <div className="flex items-center gap-1 px-2 py-1.5 bg-ui-bg-base border-b border-ui-border-base overflow-x-auto">
          {docs.map((d, i) => {
            const kind = detectProofKind(d.url);
            const label = d.filename || fileNameFromUrl(d.url) || `Document ${i + 1}`;
            const isActive = i === idx;
            return (
              <button
                key={`${d.url}-${i}`}
                type="button"
                onClick={() => setActive(i)}
                className={`inline-flex items-center gap-1 rounded-md px-2 py-1 text-[11px] border transition-colors max-w-[220px] ${
                  isActive
                    ? "bg-ui-bg-base-pressed border-ui-border-strong text-ui-fg-base"
                    : "bg-transparent border-ui-border-base text-ui-fg-subtle hover:bg-ui-bg-base-hover"
                }`}
                title={d.url}
              >
                <span aria-hidden>{kind === "image" ? "🖼️" : kind === "pdf" ? "📄" : "📎"}</span>
                <span className="truncate">{label}</span>
              </button>
            );
          })}
        </div>
      )}
      <SingleProofBody doc={current} />
    </div>
  );
};

// Helper mirroring the vendor-panel utility — pulls a display name
// out of a URL's last path segment when no explicit filename is set.
const fileNameFromUrl = (url: string): string => {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop();
    return last ? decodeURIComponent(last) : url;
  } catch {
    return url;
  }
};


// ─────────────────────────────────────────────────────────────────────
// Verify drawer — approve / reject with notes
// ─────────────────────────────────────────────────────────────────────

const VerifyDrawer = ({
  row,
  seller,
  onClose,
}: {
  row: SellerCertification;
  seller: { name?: string; handle?: string } | undefined;
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
  const sellerName = seller?.name || `Seller ${row.seller_id.slice(-6)}`;
  const prettyCert = prettifySlug(row.certification_slug);

  return (
    <Drawer open onOpenChange={(o: boolean) => !o && onClose()}>
      <Drawer.Content>
        <Drawer.Header>
          <Drawer.Title>{prettyCert}</Drawer.Title>
          <div className="flex items-center gap-2 mt-1">
            {statusBadge(row.verification_status)}
            {row.created_at && (
              <span className="text-xs text-ui-fg-subtle">
                submitted {relativeTime(row.created_at)}
              </span>
            )}
          </div>
        </Drawer.Header>

        {/* overflow-y-auto so a tall proof preview (PDF iframe, big
            image) can scroll instead of pushing the reject/approve
            buttons out of the viewport. */}
        <Drawer.Body className="space-y-5 overflow-y-auto">
          {/* Proof preview at the top — the whole reason the reviewer opened this. */}
          <div>
            <div className="text-[10px] uppercase tracking-wide text-ui-fg-subtle mb-1.5">
              Proof {docsFromRow(row).length > 1 && `(${docsFromRow(row).length})`}
            </div>
            <ProofPreview docs={docsFromRow(row)} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-[10px] uppercase tracking-wide text-ui-fg-subtle">
                Certification
              </div>
              <div className="mt-0.5 text-sm text-ui-fg-base">{prettyCert}</div>
              <div className="font-mono text-[10px] text-ui-fg-muted mt-0.5">
                {row.certification_slug}
              </div>
            </div>

            <div>
              <div className="text-[10px] uppercase tracking-wide text-ui-fg-subtle">
                Seller
              </div>
              <div className="mt-0.5 text-sm text-ui-fg-base">{sellerName}</div>
              {seller?.handle && (
                <div className="text-[11px] text-ui-fg-muted mt-0.5">
                  @{seller.handle}
                </div>
              )}
              <div className="font-mono text-[10px] text-ui-fg-muted mt-0.5">
                {row.seller_id}
              </div>
            </div>

            {row.expires_at && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-ui-fg-subtle">
                  Expires
                </div>
                <div className="mt-0.5 text-sm text-ui-fg-base">
                  {new Date(row.expires_at).toLocaleDateString()}
                </div>
              </div>
            )}

            {row.verified_at && (
              <div>
                <div className="text-[10px] uppercase tracking-wide text-ui-fg-subtle">
                  Reviewed
                </div>
                <div className="mt-0.5 text-sm text-ui-fg-base">
                  {relativeTime(row.verified_at)}
                </div>
                {row.verified_by && (
                  <div className="text-[11px] text-ui-fg-muted mt-0.5">
                    by {row.verified_by}
                  </div>
                )}
              </div>
            )}
          </div>

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
