import { useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Container, Heading, Text, Badge, Button, Textarea, Select } from "@medusajs/ui"
import { ExclamationCircle } from "@medusajs/icons"
import { useAdminDisputes, useResolveDispute } from "../../hooks/api/admin-disputes"

const STATUS_MAP: Record<string, { label: string; color: "green" | "orange" | "blue" | "red" | "grey" | "purple" }> = {
  created: { label: "Created", color: "orange" },
  evidence_submitted: { label: "Evidence Submitted", color: "blue" },
  under_review: { label: "Under Review", color: "purple" },
  resolved_buyer: { label: "Resolved (Buyer)", color: "green" },
  resolved_seller: { label: "Resolved (Seller)", color: "green" },
  resolved_split: { label: "Resolved (Split)", color: "green" },
}

export const DisputesList = () => {
  const [searchParams] = useSearchParams()
  const page = parseInt(searchParams.get("page") || "1", 10)
  const limit = 20
  const offset = (page - 1) * limit

  const { data, isPending } = useAdminDisputes({ limit, offset })
  const resolveDispute = useResolveDispute()

  const [resolvingId, setResolvingId] = useState<string | null>(null)
  const [resolutionType, setResolutionType] = useState("buyer")
  const [resolutionNotes, setResolutionNotes] = useState("")

  const disputes = data?.disputes || []

  function handleResolve(id: string) {
    resolveDispute.mutate(
      { id, body: { resolution_type: resolutionType, resolution_notes: resolutionNotes } },
      {
        onSuccess: () => {
          setResolvingId(null)
          setResolutionNotes("")
        },
      }
    )
  }

  return (
    <div className="flex flex-col gap-y-3">
      <Container>
        <div className="flex items-center justify-between mb-6">
          <div>
            <Heading level="h2">Disputes</Heading>
            <Text size="small" className="text-ui-fg-muted">
              Review and resolve transaction disputes between buyers and sellers
            </Text>
          </div>
        </div>

        {isPending ? (
          <div className="py-8 text-center">
            <Text className="text-ui-fg-muted">Loading disputes...</Text>
          </div>
        ) : disputes.length === 0 ? (
          <div className="py-12 text-center">
            <ExclamationCircle className="w-12 h-12 text-ui-fg-muted mx-auto mb-3" />
            <Heading level="h3" className="mb-1">No disputes</Heading>
            <Text size="small" className="text-ui-fg-muted">
              There are currently no open disputes.
            </Text>
          </div>
        ) : (
          <div className="divide-y divide-ui-border-base">
            {disputes.map((dispute: any) => {
              const statusCfg = STATUS_MAP[dispute.status] || STATUS_MAP.created
              const isResolving = resolvingId === dispute.id

              return (
                <div key={dispute.id} className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Text weight="plus">Dispute #{dispute.id.slice(-8)}</Text>
                        <Badge color={statusCfg.color} size="small">{statusCfg.label}</Badge>
                        {dispute.reason && (
                          <Badge size="small">{dispute.reason.replace(/_/g, " ")}</Badge>
                        )}
                      </div>
                      <Text size="small" className="text-ui-fg-muted mb-1">
                        Order: {dispute.escrow_transaction_id?.slice(-8) || "N/A"}
                      </Text>
                      {dispute.description && (
                        <Text size="small" className="text-ui-fg-muted">{dispute.description}</Text>
                      )}
                      <div className="flex items-center gap-3 mt-1">
                        {dispute.amount && (
                          <Text size="xsmall" className="text-ui-fg-muted">
                            Amount: ${(dispute.amount / 100).toLocaleString()}
                          </Text>
                        )}
                        <Text size="xsmall" className="text-ui-fg-muted">
                          Created: {new Date(dispute.created_at).toLocaleDateString()}
                        </Text>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {!dispute.status.startsWith("resolved") && (
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => setResolvingId(isResolving ? null : dispute.id)}
                        >
                          {isResolving ? "Cancel" : "Resolve"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {isResolving && (
                    <div className="mt-4 p-4 bg-ui-bg-subtle rounded-lg space-y-3">
                      <div>
                        <Text size="small" weight="plus" className="mb-1">Resolution Type</Text>
                        <select
                          value={resolutionType}
                          onChange={(e) => setResolutionType(e.target.value)}
                          className="w-full px-3 py-2 border border-ui-border-base rounded-md text-sm bg-ui-bg-base"
                        >
                          <option value="buyer">Favor Buyer (Full Refund)</option>
                          <option value="seller">Favor Seller (Release Payment)</option>
                          <option value="split">Split Resolution</option>
                        </select>
                      </div>
                      <div>
                        <Text size="small" weight="plus" className="mb-1">Resolution Notes</Text>
                        <textarea
                          value={resolutionNotes}
                          onChange={(e) => setResolutionNotes(e.target.value)}
                          placeholder="Explain the resolution decision..."
                          rows={3}
                          className="w-full px-3 py-2 border border-ui-border-base rounded-md text-sm bg-ui-bg-base resize-y"
                        />
                      </div>
                      <Button
                        size="small"
                        onClick={() => handleResolve(dispute.id)}
                        isLoading={resolveDispute.isPending}
                      >
                        Confirm Resolution
                      </Button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Container>
    </div>
  )
}
