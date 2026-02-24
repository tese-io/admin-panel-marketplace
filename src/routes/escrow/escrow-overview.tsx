import { useState } from "react"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { CurrencyDollar, ShieldCheck, ExclamationCircle, ArrowUturnLeft } from "@medusajs/icons"
import { useAdminEscrow, useAdminEscrowStats, useAdminForceRelease } from "../../hooks/api/admin-escrow"

const ESCROW_STATUS_MAP: Record<string, { label: string; color: "green" | "orange" | "blue" | "red" | "grey" | "purple" }> = {
  pending: { label: "Pending", color: "orange" },
  held: { label: "Held", color: "blue" },
  partially_released: { label: "Partial Release", color: "purple" },
  released: { label: "Released", color: "green" },
  refunded: { label: "Refunded", color: "red" },
  disputed: { label: "Disputed", color: "red" },
}

export const EscrowOverview = () => {
  const { data: escrowData, isPending } = useAdminEscrow({ limit: 50 })
  const { data: statsData } = useAdminEscrowStats()
  const forceRelease = useAdminForceRelease()

  const [releasingId, setReleasingId] = useState<string | null>(null)
  const [releaseReason, setReleaseReason] = useState("")

  const transactions = escrowData?.escrow_transactions || []
  const stats = statsData?.stats

  function handleForceRelease(id: string) {
    forceRelease.mutate(
      { id, body: { reason: releaseReason } },
      {
        onSuccess: () => {
          setReleasingId(null)
          setReleaseReason("")
        },
      }
    )
  }

  return (
    <div className="flex flex-col gap-y-3">
      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Container className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-bg-subtle flex items-center justify-center">
                <CurrencyDollar className="text-ui-fg-muted" />
              </div>
              <div>
                <Text size="small" className="text-ui-fg-muted">Total Held</Text>
                <Heading level="h3">${((stats.total_held || 0) / 100).toLocaleString()}</Heading>
              </div>
            </div>
          </Container>
          <Container className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-bg-subtle flex items-center justify-center">
                <ShieldCheck className="text-ui-fg-muted" />
              </div>
              <div>
                <Text size="small" className="text-ui-fg-muted">Total Released</Text>
                <Heading level="h3">${((stats.total_released || 0) / 100).toLocaleString()}</Heading>
              </div>
            </div>
          </Container>
          <Container className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-bg-subtle flex items-center justify-center">
                <ArrowUturnLeft className="text-ui-fg-muted" />
              </div>
              <div>
                <Text size="small" className="text-ui-fg-muted">Total Refunded</Text>
                <Heading level="h3">${((stats.total_refunded || 0) / 100).toLocaleString()}</Heading>
              </div>
            </div>
          </Container>
          <Container className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-bg-subtle flex items-center justify-center">
                <ExclamationCircle className="text-ui-fg-muted" />
              </div>
              <div>
                <Text size="small" className="text-ui-fg-muted">Transactions</Text>
                <Heading level="h3">{stats.total_transactions || 0}</Heading>
              </div>
            </div>
          </Container>
        </div>
      )}

      {/* Transaction Ledger */}
      <Container>
        <div className="mb-4">
          <Heading level="h2">Escrow Transaction Ledger</Heading>
          <Text size="small" className="text-ui-fg-muted">
            Platform-wide escrow transactions with force-release capability
          </Text>
        </div>

        {isPending ? (
          <div className="py-8 text-center">
            <Text className="text-ui-fg-muted">Loading...</Text>
          </div>
        ) : transactions.length === 0 ? (
          <div className="py-12 text-center">
            <ShieldCheck className="w-12 h-12 text-ui-fg-muted mx-auto mb-3" />
            <Heading level="h3">No transactions</Heading>
          </div>
        ) : (
          <div className="divide-y divide-ui-border-base">
            {transactions.map((tx: any) => {
              const statusCfg = ESCROW_STATUS_MAP[tx.status] || ESCROW_STATUS_MAP.pending
              const isReleasing = releasingId === tx.id

              return (
                <div key={tx.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-0.5">
                        <Text weight="plus">#{tx.id.slice(-8)}</Text>
                        <Badge color={statusCfg.color} size="small">{statusCfg.label}</Badge>
                        <Badge size="small">{tx.escrow_type || "product"}</Badge>
                      </div>
                      <div className="flex items-center gap-4 mt-1">
                        <Text size="xsmall" className="text-ui-fg-muted">
                          Total: ${(tx.total_amount / 100).toLocaleString()}
                        </Text>
                        <Text size="xsmall" className="text-ui-fg-muted">
                          Held: ${(tx.held_amount / 100).toLocaleString()}
                        </Text>
                        <Text size="xsmall" className="text-ui-fg-muted">
                          Released: ${((tx.released_amount || 0) / 100).toLocaleString()}
                        </Text>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      {["held", "partially_released"].includes(tx.status) && (
                        <Button
                          variant="secondary"
                          size="small"
                          onClick={() => setReleasingId(isReleasing ? null : tx.id)}
                        >
                          {isReleasing ? "Cancel" : "Force Release"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {isReleasing && (
                    <div className="mt-3 p-4 bg-ui-bg-subtle rounded-lg space-y-3">
                      <div>
                        <Text size="small" weight="plus" className="mb-1">Reason for Force Release</Text>
                        <textarea
                          value={releaseReason}
                          onChange={(e) => setReleaseReason(e.target.value)}
                          placeholder="Provide justification..."
                          rows={2}
                          className="w-full px-3 py-2 border border-ui-border-base rounded-md text-sm bg-ui-bg-base resize-y"
                        />
                      </div>
                      <Button
                        size="small"
                        variant="danger"
                        onClick={() => handleForceRelease(tx.id)}
                        isLoading={forceRelease.isPending}
                        disabled={!releaseReason.trim()}
                      >
                        Confirm Force Release
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
