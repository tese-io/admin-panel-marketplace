import { useEffect, useState } from "react";

import { ExclamationCircle, InformationCircle } from "@medusajs/icons";
import { Badge, Container, Drawer, RadioGroup, Text, Button } from "@medusajs/ui";

import type { AdminSellerRequest } from "@custom-types/requests";

import { formatDate } from "@lib/date";

import { ResolveRequestPrompt } from "@routes/requests/common/components/resolve-request";

type Props = {
  request?: AdminSellerRequest;
  open: boolean;
  close: () => void;
};

function Field({
  id,
  label,
  value,
  omitWhenEmpty = false,
}: {
  id: string;
  label: string;
  value?: string | null;
  // For fields the signup form never collects (phone, tax ID): hide the
  // row instead of showing a dash. Collected fields keep the dash — a
  // missing website is a signal the reviewer should see.
  omitWhenEmpty?: boolean;
}) {
  if (omitWhenEmpty && !value?.trim()) {
    return null;
  }
  return (
    <div className="flex justify-between gap-4 py-1" data-testid={`request-seller-detail-${id}-field-${label.toLowerCase().replace(/\s+/g, "-")}`}>
      <Text size="small" className="text-ui-fg-subtle">
        {label}
      </Text>
      <Text size="small" className="text-right break-all">
        {value?.trim() ? value : "—"}
      </Text>
    </div>
  );
}

export function RequestSellerDetail({ request, open, close }: Props) {
  if (!request) {
    return null;
  }
  const requestData = request.data;
  const signals = requestData?.duplicate_signals;
  const claimableSellers = signals?.sellers ?? [];
  // SSO-originated requests arrive with the claim target pre-stamped by
  // the vendor's own "request access" step.
  const presetClaim = requestData?.claim_target_seller_id;

  const [promptOpen, setPromptOpen] = useState(false);
  const [requestAccept, setRequestAccept] = useState(false);
  const [claimChoice, setClaimChoice] = useState<string>(presetClaim ?? "create");

  useEffect(() => {
    setClaimChoice(presetClaim ?? "create");
  }, [request.id, presetClaim]);

  const handlePrompt = (_: string, accept: boolean) => {
    setRequestAccept(accept);
    setPromptOpen(true);
  };

  const showClaimChoice =
    request.status === "pending" && (claimableSellers.length > 0 || presetClaim);

  return (
    <Drawer open={open} onOpenChange={close} data-testid={`request-seller-detail-${request.id}`}>
      <ResolveRequestPrompt
        close={() => {
          setPromptOpen(false);
        }}
        open={promptOpen}
        id={request.id!}
        accept={requestAccept}
        claimSellerId={claimChoice !== "create" ? claimChoice : undefined}
        requireNoteOnReject
        onSuccess={() => {
          close();
        }}
      />
      <Drawer.Content data-testid={`request-seller-detail-${request.id}-content`}>
        <Drawer.Header data-testid={`request-seller-detail-${request.id}-header`}>
          <Drawer.Title data-testid={`request-seller-detail-${request.id}-title`}>Review seller request</Drawer.Title>
        </Drawer.Header>
        <Drawer.Body className="overflow-y-auto p-4" data-testid={`request-seller-detail-${request.id}-body`}>
          <fieldset data-testid={`request-seller-detail-${request.id}-company-fieldset`}>
            <legend className="mb-2">Company</legend>
            <Container>
              <Field id={request.id!} label="Name" value={requestData?.seller?.name} />
              <Field id={request.id!} label="Website" value={requestData?.seller?.website} />
              <Field id={request.id!} label="Business type" value={requestData?.seller?.company_type} />
              <Field id={request.id!} label="Country" value={requestData?.seller?.country_code} />
              <Field id={request.id!} label="Store email" value={requestData?.seller?.email} />
              <Field id={request.id!} label="Phone" value={requestData?.seller?.phone} omitWhenEmpty />
              <Field id={request.id!} label="Tax ID" value={requestData?.seller?.tax_id} omitWhenEmpty />
            </Container>
          </fieldset>
          <fieldset className="mt-2" data-testid={`request-seller-detail-${request.id}-member-fieldset`}>
            <legend className="mb-2">Applicant</legend>
            <Container>
              <Field id={request.id!} label="Name" value={requestData?.member?.name} />
              {/* Was mislabelled: this row used to render provider_identity_id as "Email" */}
              <Field id={request.id!} label="Email" value={requestData?.member?.email} />
            </Container>
          </fieldset>

          {signals && (
            <fieldset className="mt-2" data-testid={`request-seller-detail-${request.id}-duplicates-fieldset`}>
              <legend className="mb-2">Duplicate check</legend>
              <Container>
                {signals.status === "unavailable" ? (
                  <div className="flex items-center gap-2">
                    <ExclamationCircle className="text-ui-fg-error" />
                    <Text size="small">
                      Duplicate check unavailable — review manually before accepting.
                    </Text>
                  </div>
                ) : (
                  <>
                    <Field id={request.id!} label="Domain" value={signals.domain} />
                    {signals.domain_usable === false && (
                      <Text size="small" className="text-ui-fg-subtle">
                        {signals.reason === "free_email"
                          ? "Free-email address — no company domain to match on."
                          : "Email domain unusable for matching."}
                      </Text>
                    )}
                    {signals.candidate && (
                      <div className="mt-2 flex items-center gap-2" data-testid={`request-seller-detail-${request.id}-candidate-chip`}>
                        <Badge size="small" color="orange">
                          AI-discovered candidate
                        </Badge>
                        <Text size="small">
                          {signals.candidate.name || signals.candidate.domain} · {signals.candidate.claimed_status}
                          {signals.candidate.linked_tenant_id ? " · linked to a tese org" : ""}
                        </Text>
                      </div>
                    )}
                    {(signals.tenants ?? []).map((t) => (
                      <div key={t.id} className="mt-2 flex items-center gap-2" data-testid={`request-seller-detail-${request.id}-tenant-chip-${t.id}`}>
                        <Badge size="small" color="blue">
                          tese organisation
                        </Badge>
                        <Text size="small">
                          {t.name} · matched on {t.matched_on.replace(/_/g, " ")}
                          {t.has_tese_seller ? " · already has a store" : ""}
                        </Text>
                      </div>
                    ))}
                    {claimableSellers.map((s) => (
                      <div key={s.id} className="mt-2 flex items-center gap-2" data-testid={`request-seller-detail-${request.id}-seller-chip-${s.id}`}>
                        <Badge size="small" color="red">
                          Existing seller
                        </Badge>
                        <Text size="small">
                          {s.name} ({s.handle}) · matched on {s.matched_on.replace(/_/g, " ")}
                        </Text>
                      </div>
                    ))}
                    {!signals.candidate &&
                      !(signals.tenants ?? []).length &&
                      !claimableSellers.length &&
                      signals.domain_usable !== false && (
                        <Text size="small" className="text-ui-fg-subtle">
                          No matches — looks like a new company.
                        </Text>
                      )}
                  </>
                )}
              </Container>
            </fieldset>
          )}

          {showClaimChoice && (
            <fieldset className="mt-2" data-testid={`request-seller-detail-${request.id}-claim-fieldset`}>
              <legend className="mb-2">On accept</legend>
              <Container>
                <RadioGroup value={claimChoice} onValueChange={setClaimChoice}>
                  <div className="flex items-center gap-x-2">
                    <RadioGroup.Item value="create" id={`claim-create-${request.id}`} data-testid={`request-seller-detail-${request.id}-claim-create-radio`} />
                    <label htmlFor={`claim-create-${request.id}`}>
                      <Text size="small">Create a new store</Text>
                    </label>
                  </div>
                  {claimableSellers.map((s) => (
                    <div className="flex items-center gap-x-2" key={s.id}>
                      <RadioGroup.Item value={s.id} id={`claim-${s.id}-${request.id}`} data-testid={`request-seller-detail-${request.id}-claim-${s.id}-radio`} />
                      <label htmlFor={`claim-${s.id}-${request.id}`}>
                        <Text size="small">
                          Attach applicant to <b>{s.name}</b> ({s.handle})
                        </Text>
                      </label>
                    </div>
                  ))}
                  {presetClaim && !claimableSellers.some((s) => s.id === presetClaim) && (
                    <div className="flex items-center gap-x-2">
                      <RadioGroup.Item value={presetClaim} id={`claim-${presetClaim}-${request.id}`} data-testid={`request-seller-detail-${request.id}-claim-preset-radio`} />
                      <label htmlFor={`claim-${presetClaim}-${request.id}`}>
                        <Text size="small">
                          Attach to the store the vendor requested ({presetClaim})
                        </Text>
                      </label>
                    </div>
                  )}
                </RadioGroup>
                {presetClaim && (
                  <Text size="small" className="text-ui-fg-subtle mt-2">
                    The vendor requested access to an existing store via tese.io sign-in.
                  </Text>
                )}
              </Container>
            </fieldset>
          )}

          <Container className="mt-4" data-testid={`request-seller-detail-${request.id}-request-information`}>
            <div className="flex items-center gap-2" data-testid={`request-seller-detail-${request.id}-request-information-header`}>
              <InformationCircle />
              <Text className="font-semibold" data-testid={`request-seller-detail-${request.id}-request-information-title`}>Request information</Text>
            </div>
            <Text data-testid={`request-seller-detail-${request.id}-submitted-on`}>{`Submitted on ${formatDate(request.created_at)}`}</Text>
            {request.reviewer_id && (
              <Text data-testid={`request-seller-detail-${request.id}-reviewed-on`}>{`Reviewed on ${formatDate(request.updated_at)}`}</Text>
            )}
            {request.reviewer_note && (
              <Text data-testid={`request-seller-detail-${request.id}-reviewer-note`}>{`Reviewer note: ${request.reviewer_note}`}</Text>
            )}
          </Container>
        </Drawer.Body>
        <Drawer.Footer data-testid={`request-seller-detail-${request.id}-footer`}>
          {request.status === "pending" && (
            <>
              <Button
                onClick={() => {
                  handlePrompt(request.id!, true);
                }}
                data-testid={`request-seller-detail-${request.id}-accept-button`}
              >
                {claimChoice !== "create" ? "Accept as claim" : "Accept"}
              </Button>
              <Button
                onClick={() => {
                  handlePrompt(request.id!, false);
                }}
                variant="danger"
                data-testid={`request-seller-detail-${request.id}-reject-button`}
              >
                Reject
              </Button>
              <Button variant="secondary" onClick={close} data-testid={`request-seller-detail-${request.id}-cancel-button`}>
                Cancel
              </Button>
            </>
          )}
        </Drawer.Footer>
      </Drawer.Content>
    </Drawer>
  );
}
