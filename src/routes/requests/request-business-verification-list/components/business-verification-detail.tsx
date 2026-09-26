import { useEffect, useState } from "react";

import { ExclamationCircle } from "@medusajs/icons";
import { Badge, Button, Container, Drawer, Input, Prompt, RadioGroup, Text, toast } from "@medusajs/ui";

import { formatDate } from "@lib/date";

import {
  fetchBusinessVerificationDocumentUrl,
  useBusinessVerification,
  useReviewBusinessVerification,
  type BusinessVerification,
  type VerificationMethod,
} from "@hooks/api/business-verifications";

import { statusBadge } from "../request-business-verification-list";

type Props = {
  id?: string;
  open: boolean;
  close: () => void;
};

const KIND_LABEL: Record<BusinessVerification["document_kind"], string> = {
  certificate_of_incorporation: "Certificate of incorporation",
  registration_extract: "Registration extract / BRN card",
  trade_licence: "Trade licence",
  tax_registration: "Tax / VAT registration",
};

function Field({ label, value, hint }: { label: string; value?: string | null; hint?: string | null }) {
  return (
    <div className="flex justify-between gap-4 py-1">
      <Text size="small" className="text-ui-fg-subtle">{label}</Text>
      <div className="text-right">
        <Text size="small" className="break-all">{value?.trim() ? value : "—"}</Text>
        {hint && <Text size="xsmall" className="text-ui-fg-muted">{hint}</Text>}
      </div>
    </div>
  );
}

/** "OCR read X" hint when the typed value differs from what OCR extracted. */
const ocrHint = (typed: string | null | undefined, read: string | null | undefined) => {
  if (!read) return null;
  const a = (typed || "").trim().toLowerCase();
  const b = read.trim().toLowerCase();
  return a === b ? "matches OCR" : `OCR read: ${read}`;
};

function ReviewPrompt({
  open,
  approve,
  onClose,
  onConfirm,
  busy,
}: {
  open: boolean;
  approve: boolean;
  onClose: () => void;
  onConfirm: (input: { note: string; method: VerificationMethod | null }) => void;
  busy: boolean;
}) {
  const [note, setNote] = useState("");
  const [method, setMethod] = useState<VerificationMethod | "">("");
  useEffect(() => {
    setNote("");
    setMethod("");
  }, [open, approve]);

  const disabled = busy || (approve ? !method : !note.trim());

  return (
    <Prompt open={open}>
      <Prompt.Content>
        <Prompt.Header>
          <Prompt.Title>{approve ? "Approve business verification?" : "Decline business verification?"}</Prompt.Title>
          <Prompt.Description>
            {approve
              ? "Record how you verified this business. Where a public registry exists (Mauritius: Registrar of Companies), checking it takes about ninety seconds and turns this into a real verification trail."
              : "A written reason is required — the seller sees it and can re-upload."}
          </Prompt.Description>
          {approve ? (
            <RadioGroup value={method} onValueChange={(v) => setMethod(v as VerificationMethod)} className="mt-3">
              <div className="flex items-center gap-x-2">
                <RadioGroup.Item value="registry_checked" id="bv-method-registry" data-testid="bv-method-registry" />
                <label htmlFor="bv-method-registry"><Text size="small">Document checked against a public registry</Text></label>
              </div>
              <div className="flex items-center gap-x-2">
                <RadioGroup.Item value="document_only" id="bv-method-document" data-testid="bv-method-document" />
                <label htmlFor="bv-method-document"><Text size="small">Document only</Text></label>
              </div>
            </RadioGroup>
          ) : null}
          <Input
            className="mt-3"
            placeholder={approve ? "Optional note (internal)" : "Reason the seller will see"}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            data-testid="bv-review-note"
          />
        </Prompt.Header>
        <Prompt.Footer>
          <Button variant="secondary" onClick={onClose} disabled={busy}>Cancel</Button>
          <Button
            variant={approve ? "primary" : "danger"}
            disabled={disabled}
            isLoading={busy}
            onClick={() => onConfirm({ note, method: approve ? (method as VerificationMethod) : null })}
            data-testid="bv-review-submit"
          >
            {approve ? "Approve" : "Decline"}
          </Button>
        </Prompt.Footer>
      </Prompt.Content>
    </Prompt>
  );
}

export function BusinessVerificationDetail({ id, open, close }: Props) {
  const { data, isLoading } = useBusinessVerification(id);
  const row = data?.business_verification;
  const review = useReviewBusinessVerification();
  const [prompt, setPrompt] = useState<{ open: boolean; approve: boolean }>({ open: false, approve: true });
  const [opening, setOpening] = useState(false);
  // B-26: "" = approve this store as-is; a seller id = attach to that store
  // and archive this one. Reset whenever a different row is opened.
  const [attachTo, setAttachTo] = useState<string>("");
  useEffect(() => {
    setAttachTo("");
  }, [id]);

  const openDocument = async () => {
    if (!row) return;
    setOpening(true);
    try {
      const { url } = await fetchBusinessVerificationDocumentUrl(row.id);
      window.open(url, "_blank", "noopener");
    } catch (e) {
      toast.error(`Could not open document: ${(e as Error).message}`);
    } finally {
      setOpening(false);
    }
  };

  const confirm = async ({ note, method }: { note: string; method: VerificationMethod | null }) => {
    if (!row) return;
    try {
      await review.mutateAsync({
        id: row.id,
        decision: prompt.approve ? "approve" : "reject",
        reviewer_note: note,
        verification_method: method,
        attach_to_seller_id: prompt.approve && attachTo ? attachTo : null,
      });
      toast.success(
        prompt.approve
          ? attachTo
            ? "Business verified and attached to the existing store"
            : "Business verified"
          : "Verification declined"
      );
      setPrompt({ open: false, approve: true });
      close();
    } catch (e) {
      toast.error(`Error: ${(e as Error).message}`);
    }
  };

  const signals = row?.duplicate_signals;
  const ocr = row?.ocr_prefill ?? null;

  return (
    <Drawer open={open} onOpenChange={close}>
      <ReviewPrompt
        open={prompt.open}
        approve={prompt.approve}
        onClose={() => setPrompt((p) => ({ ...p, open: false }))}
        onConfirm={confirm}
        busy={review.isPending}
      />
      <Drawer.Content data-testid="business-verification-detail">
        <Drawer.Header>
          <Drawer.Title>Review business verification</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto p-4">
          {isLoading && <Text>Loading...</Text>}
          {row && (
            <>
              <fieldset>
                <legend className="mb-2 flex items-center gap-2">Business {statusBadge(row.status)}</legend>
                <Container>
                  <Field label="Legal name" value={row.legal_name} hint={ocrHint(row.legal_name, ocr?.legal_name)} />
                  <Field label="Registration number" value={row.registration_number} hint={ocrHint(row.registration_number, ocr?.registration_number)} />
                  <Field label="Country of registration" value={row.country_of_registration.toUpperCase()} hint={ocrHint(row.country_of_registration, ocr?.country_of_registration)} />
                  <Field label="Document type" value={KIND_LABEL[row.document_kind]} />
                  <Field
                    label="File"
                    value={
                      row.document_purged_at
                        ? `Deleted under the retention policy on ${formatDate(row.document_purged_at)}`
                        : row.document_filename || row.document_key
                    }
                  />
                  <Field label="Submitted" value={formatDate(row.created_at)} />
                  {!row.document_purged_at && (
                    <div className="mt-2">
                      <Button variant="secondary" size="small" onClick={openDocument} isLoading={opening} data-testid="bv-open-document">
                        Open document (signed link, 5 min)
                      </Button>
                    </div>
                  )}
                </Container>
              </fieldset>

              <fieldset className="mt-2">
                <legend className="mb-2">Seller</legend>
                <Container>
                  <Field label="Store" value={row.seller?.name ?? row.seller_id} />
                  <Field label="Handle" value={row.seller?.handle} />
                  <Field label="Email" value={row.seller?.email} />
                  <Field label="Website" value={row.seller?.website} />
                </Container>
              </fieldset>

              <fieldset className="mt-2">
                <legend className="mb-2">Duplicate check</legend>
                <Container>
                  {!signals && <Text size="small" className="text-ui-fg-subtle">Not computed.</Text>}
                  {signals?.status === "unavailable" && (
                    <div className="flex items-center gap-2">
                      <ExclamationCircle className="text-ui-fg-error" />
                      <Text size="small">Platform lookup unavailable — {signals.error}. Seller-name matches below are still live.</Text>
                    </div>
                  )}
                  {signals && signals.status !== "unavailable" && (
                    <Field label="Domain" value={signals.domain ?? "—"} />
                  )}
                  {signals?.candidate && (
                    <div className="mt-2 flex items-center gap-2">
                      <Badge size="small" color="orange">AI-discovered candidate</Badge>
                      <Text size="small">{signals.candidate.name || signals.candidate.domain} · {signals.candidate.claimed_status}</Text>
                    </div>
                  )}
                  {(signals?.tenants ?? []).map((t) => (
                    <div key={t.id} className="mt-2 flex items-center gap-2">
                      <Badge size="small" color="blue">tese organisation</Badge>
                      <Text size="small">{t.name} · matched on {t.matched_on.replace(/_/g, " ")}</Text>
                    </div>
                  ))}
                  {(signals?.sellers ?? []).map((s) => (
                    <div key={s.id} className="mt-2 flex items-center gap-2" data-testid={`bv-seller-hit-${s.id}`}>
                      <Badge size="small" color="red">Existing seller</Badge>
                      <Text size="small">{s.name} ({s.handle}) · matched on {s.matched_on.replace(/_/g, " ")}</Text>
                    </div>
                  ))}
                  {signals && signals.status !== "unavailable" && !signals.candidate && !(signals.tenants ?? []).length && !(signals.sellers ?? []).length && (
                    <Text size="small" className="text-ui-fg-subtle">No matches — looks like a new company.</Text>
                  )}
                </Container>
              </fieldset>

              {row.status === "pending" && (signals?.sellers ?? []).length > 0 && (
                <fieldset className="mt-2" data-testid="bv-attach-fieldset">
                  <legend className="mb-2">On approve</legend>
                  <Container>
                    <RadioGroup value={attachTo} onValueChange={setAttachTo}>
                      <div className="flex items-center gap-x-2">
                        <RadioGroup.Item value="" id={`bv-attach-none-${row.id}`} data-testid="bv-attach-none" />
                        <label htmlFor={`bv-attach-none-${row.id}`}>
                          <Text size="small">Verify this store as it is</Text>
                        </label>
                      </div>
                      {(signals?.sellers ?? []).map((s) => (
                        <div className="flex items-center gap-x-2" key={s.id}>
                          <RadioGroup.Item value={s.id} id={`bv-attach-${s.id}`} data-testid={`bv-attach-${s.id}`} />
                          <label htmlFor={`bv-attach-${s.id}`}>
                            <Text size="small">
                              Attach the applicant to <b>{s.name}</b> ({s.handle}) — this store is archived
                            </Text>
                          </label>
                        </div>
                      ))}
                    </RadioGroup>
                    <Text size="xsmall" className="mt-2 text-ui-fg-subtle">
                      Attaching moves the applicant&apos;s team into the existing store as members and archives this one (soft-deleted, with a merge record — reversible). One company, one store.
                    </Text>
                  </Container>
                </fieldset>
              )}

              {row.status !== "pending" && (
                <Container className="mt-4">
                  <Text className="font-semibold">Decision</Text>
                  <Field label="Reviewed" value={formatDate(row.reviewed_at ?? undefined)} />
                  <Field label="Reviewer" value={row.reviewed_by} />
                  {row.verification_method && (
                    <Field label="Method" value={row.verification_method === "registry_checked" ? "Checked against public registry" : "Document only"} />
                  )}
                  {row.reviewer_note && <Field label="Note" value={row.reviewer_note} />}
                  {row.merge_record && (
                    <Field
                      label="Merged"
                      value={`${row.merge_record.source_seller_id} → ${row.merge_record.target_seller_id} (${row.merge_record.moved_member_ids.length} member(s) moved, ${formatDate(row.merge_record.at)})`}
                    />
                  )}
                </Container>
              )}
            </>
          )}
        </Drawer.Body>
        <Drawer.Footer>
          {row?.status === "pending" && (
            <>
              <Button onClick={() => setPrompt({ open: true, approve: true })} data-testid="bv-approve">
                {attachTo ? "Approve as claim" : "Approve"}
              </Button>
              <Button variant="danger" onClick={() => setPrompt({ open: true, approve: false })} data-testid="bv-decline">Decline</Button>
            </>
          )}
          <Button variant="secondary" onClick={close}>Close</Button>
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}
