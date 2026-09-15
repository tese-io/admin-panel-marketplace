import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Container,
  FocusModal,
  Heading,
  Input,
  Select,
  Table,
  Text,
  Textarea,
  toast,
} from "@medusajs/ui";

import {
  SourcingRequest,
  useSourcingRequests,
  useUpdateSourcingRequest,
} from "../../hooks/api/vendor-sourcing";

/**
 * Sourcing requests — the tese.io ops queue for tickets users raise
 * from the CNI dashboard: "Ask tese.io to find vendors" and the
 * no-email "Ask tese.io to find the contact" fallback.
 *
 * Fulfilment loop: Start working (in_progress) → do the sourcing in
 * the tenant's project (vendors land with source 'tese_curated', or
 * the vendor's email gets filled) → Mark complete with a note +
 * vendors-added count. Completing emails the requester automatically.
 */

const TABS = [
  { key: "open", label: "Open", statuses: "pending,in_progress" },
  { key: "complete", label: "Completed", statuses: "complete" },
  { key: "cancelled", label: "Cancelled", statuses: "cancelled" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export const KIND_META: Record<
  SourcingRequest["kind"],
  { label: string; color: "purple" | "blue" }
> = {
  contact_sourcing: { label: "Find contact", color: "purple" },
  vendor_sourcing: { label: "Find vendors", color: "blue" },
};

export const STATUS_META: Record<
  SourcingRequest["status"],
  { label: string; color: "orange" | "blue" | "green" | "grey" }
> = {
  pending: { label: "Pending", color: "orange" },
  in_progress: { label: "In progress", color: "blue" },
  complete: { label: "Complete", color: "green" },
  cancelled: { label: "Cancelled", color: "grey" },
};

export const ago = (iso: string): string => {
  const ms = Date.now() - new Date(iso).getTime();
  const days = Math.floor(ms / 86_400_000);
  if (days <= 0) {
    const hours = Math.floor(ms / 3_600_000);
    return hours <= 0 ? "just now" : `${hours}h ago`;
  }
  if (days === 1) return "1 day ago";
  if (days < 30) return `${days} days ago`;
  return new Date(iso).toLocaleDateString();
};

const RequestCell = ({ r }: { r: SourcingRequest }) => {
  const kind = KIND_META[r.kind] || KIND_META.vendor_sourcing;
  const summary =
    r.kind === "contact_sourcing"
      ? r.vendorName || "Unknown vendor"
      : r.toolNames.length
        ? r.toolNames.slice(0, 3).join(", ")
        : r.vendorCategories.slice(0, 3).join(", ") || "General sourcing";
  return (
    <div className="py-1">
      <div className="flex items-center gap-1.5">
        <Badge size="2xsmall" color={kind.color}>
          {kind.label}
        </Badge>
        <Text size="small" weight="plus" className="leading-snug">
          {summary}
        </Text>
      </div>
      {r.kind === "contact_sourcing" && r.vendorWebsite && (
        <a
          href={r.vendorWebsite}
          target="_blank"
          rel="noreferrer"
          className="text-xs text-ui-fg-interactive hover:underline"
        >
          {r.vendorWebsite}
        </a>
      )}
      {r.notes && (
        <Text size="xsmall" className="text-ui-fg-subtle line-clamp-2 leading-snug" title={r.notes}>
          {r.notes}
        </Text>
      )}
    </div>
  );
};

const CompleteModal = ({
  request,
  onClose,
}: {
  request: SourcingRequest;
  onClose: () => void;
}) => {
  const [notes, setNotes] = useState("");
  const [added, setAdded] = useState(
    request.kind === "contact_sourcing" ? "0" : "1"
  );
  const [foundEmail, setFoundEmail] = useState("");
  const update = useUpdateSourcingRequest();

  const isContact = request.kind === "contact_sourcing";

  const submit = async () => {
    try {
      await update.mutateAsync({
        id: request.id,
        status: "complete",
        resolutionNotes: notes.trim(),
        vendorsAdded: Math.max(0, parseInt(added, 10) || 0),
        ...(isContact && foundEmail.trim()
          ? { foundEmail: foundEmail.trim() }
          : {}),
      });
      toast.success(
        isContact && foundEmail.trim()
          ? "Marked complete — contact saved to the vendor and requester emailed"
          : "Marked complete — the requester has been emailed"
      );
      onClose();
    } catch (e: any) {
      toast.error(e?.message || "Failed to complete request");
    }
  };

  return (
    <FocusModal open onOpenChange={(open) => !open && onClose()}>
      <FocusModal.Content className="max-w-lg mx-auto my-auto h-fit rounded-lg">
        <FocusModal.Header>
          <Heading level="h3">Complete sourcing request</Heading>
        </FocusModal.Header>
        <FocusModal.Body className="flex flex-col gap-4 p-6">
          <div>
            <Text size="small" weight="plus">
              {request.kind === "contact_sourcing"
                ? `Contact hunt for "${request.vendorName}"`
                : "Vendor sourcing"}
            </Text>
            <Text size="xsmall" className="text-ui-fg-subtle">
              The requester is emailed with your note when you complete this
              ticket.
            </Text>
          </div>
          {isContact && (
            <div className="flex flex-col gap-1">
              <Text size="xsmall" weight="plus" className="text-ui-fg-subtle">
                Contact email found
              </Text>
              <Input
                type="email"
                placeholder="sales@vendor.com"
                value={foundEmail}
                onChange={(e) => setFoundEmail(e.target.value)}
              />
              <Text size="xsmall" className="text-ui-fg-subtle">
                Saved straight onto the buyer&apos;s vendor row — they never
                have to type it. Leave empty only if no contact was found.
              </Text>
            </div>
          )}
          <div className="flex flex-col gap-1">
            <Text size="xsmall" weight="plus" className="text-ui-fg-subtle">
              Resolution note (goes to the requester)
            </Text>
            <Textarea
              rows={3}
              placeholder={
                request.kind === "contact_sourcing"
                  ? "e.g. Found and saved the vendor's contact — quote requests can be sent now."
                  : "e.g. Added 3 matching suppliers to your project."
              }
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <Text size="xsmall" weight="plus" className="text-ui-fg-subtle">
              Vendors added to the project
            </Text>
            <Input
              type="number"
              min={0}
              value={added}
              onChange={(e) => setAdded(e.target.value)}
              className="w-28"
            />
          </div>
        </FocusModal.Body>
        <FocusModal.Footer className="flex justify-end gap-2">
          <Button variant="secondary" size="small" onClick={onClose}>
            Cancel
          </Button>
          <Button size="small" disabled={update.isPending} onClick={submit}>
            {update.isPending ? "Saving…" : "Mark complete"}
          </Button>
        </FocusModal.Footer>
      </FocusModal.Content>
    </FocusModal>
  );
};

export const VendorSourcingList = () => {
  const [tab, setTab] = useState<TabKey>("open");
  const [kind, setKind] = useState<string>("all");
  const [completing, setCompleting] = useState<SourcingRequest | null>(null);

  const statuses = TABS.find((t) => t.key === tab)!.statuses;
  const { data, isLoading, isError, error } = useSourcingRequests({
    statuses,
    ...(kind !== "all" ? { kind } : {}),
    limit: 100,
  });
  const update = useUpdateSourcingRequest();

  const rows = useMemo(() => data?.requests || [], [data?.requests]);

  const transition = async (r: SourcingRequest, status: SourcingRequest["status"]) => {
    try {
      await update.mutateAsync({ id: r.id, status });
      toast.success(
        status === "in_progress" ? "Marked in progress" : "Request cancelled"
      );
    } catch (e: any) {
      toast.error(e?.message || "Update failed");
    }
  };

  return (
    <Container className="p-0 divide-y divide-ui-border-base">
      <div className="flex flex-wrap items-end justify-between gap-3 px-6 py-4">
        <div>
          <Heading level="h2">Sourcing requests</Heading>
          <Text size="small" className="mt-1 text-ui-fg-subtle">
            Tickets raised from the CNI dashboard — vendor hunts and
            missing-contact requests. Completing a ticket emails the requester.
          </Text>
        </div>
        <div className="w-44">
          <Select value={kind} onValueChange={setKind}>
            <Select.Trigger>
              <Select.Value placeholder="All kinds" />
            </Select.Trigger>
            <Select.Content>
              <Select.Item value="all">All kinds</Select.Item>
              <Select.Item value="vendor_sourcing">Find vendors</Select.Item>
              <Select.Item value="contact_sourcing">Find contact</Select.Item>
            </Select.Content>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-1 px-6 py-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "rounded-full bg-ui-bg-base-pressed px-3 py-1 text-xs font-semibold text-ui-fg-base"
                : "rounded-full px-3 py-1 text-xs font-medium text-ui-fg-subtle hover:bg-ui-bg-base-hover"
            }
          >
            {t.label}
          </button>
        ))}
      </div>

      <div>
        {isLoading && (
          <div className="px-6 py-6 text-sm text-ui-fg-subtle">Loading…</div>
        )}
        {isError && (
          <div className="px-6 py-6 text-sm text-ui-fg-error">
            Couldn&apos;t load requests: {(error as any)?.message || "unknown error"}
          </div>
        )}
        {!isLoading && !isError && rows.length === 0 && (
          <div className="flex flex-col items-center gap-1 px-6 py-12 text-center">
            <Text size="small" weight="plus">
              {tab === "open" ? "Queue is clear" : "Nothing here"}
            </Text>
            <Text size="xsmall" className="text-ui-fg-subtle max-w-sm">
              {tab === "open"
                ? "New “Ask tese.io” tickets from any tenant appear here the moment a user raises them."
                : "Requests you complete or cancel move into this tab."}
            </Text>
          </div>
        )}
        {rows.length > 0 && (
          <Table>
            <Table.Header>
              <Table.Row>
                <Table.HeaderCell>Request</Table.HeaderCell>
                <Table.HeaderCell className="w-52">Project</Table.HeaderCell>
                <Table.HeaderCell className="w-44">Requested</Table.HeaderCell>
                <Table.HeaderCell className="w-40">Status</Table.HeaderCell>
                <Table.HeaderCell className="w-56" />
              </Table.Row>
            </Table.Header>
            <Table.Body>
              {rows.map((r) => {
                const status = STATUS_META[r.status] || STATUS_META.pending;
                return (
                  <Table.Row key={r.id}>
                    <Table.Cell>
                      <RequestCell r={r} />
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small" className="leading-snug">
                        {r.projectName || "—"}
                      </Text>
                      {r.country && (
                        <Text size="xsmall" className="text-ui-fg-subtle">
                          {r.country}
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <Text size="small">{ago(r.createdAt)}</Text>
                      {r.requesterEmail && (
                        <Text size="xsmall" className="text-ui-fg-subtle truncate" title={r.requesterEmail}>
                          {r.requesterEmail}
                        </Text>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      <div className="flex flex-col items-start gap-0.5">
                        <Badge size="2xsmall" color={status.color}>
                          {status.label}
                        </Badge>
                        {r.status === "complete" && r.vendorsAdded > 0 && (
                          <Text size="xsmall" className="text-ui-fg-subtle">
                            {r.vendorsAdded} vendor{r.vendorsAdded === 1 ? "" : "s"} added
                          </Text>
                        )}
                        {r.resolutionNotes && r.status !== "pending" && (
                          <Text
                            size="xsmall"
                            className="text-ui-fg-subtle line-clamp-1"
                            title={r.resolutionNotes}
                          >
                            {r.resolutionNotes}
                          </Text>
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      {(r.status === "pending" || r.status === "in_progress") && (
                        <div className="flex flex-wrap items-center gap-1.5">
                          {r.status === "pending" && (
                            <Button
                              variant="secondary"
                              size="small"
                              disabled={update.isPending}
                              onClick={() => void transition(r, "in_progress")}
                            >
                              Start
                            </Button>
                          )}
                          <Button
                            size="small"
                            disabled={update.isPending}
                            onClick={() => setCompleting(r)}
                          >
                            Complete
                          </Button>
                          <Button
                            variant="transparent"
                            size="small"
                            disabled={update.isPending}
                            onClick={() => void transition(r, "cancelled")}
                          >
                            Cancel
                          </Button>
                        </div>
                      )}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table>
        )}
      </div>

      {completing && (
        <CompleteModal request={completing} onClose={() => setCompleting(null)} />
      )}
    </Container>
  );
};

export const Component = VendorSourcingList;
