import { Container, Heading, Text } from "@medusajs/ui"
import { DocumentText, ArrowPath, Clock, CheckCircleSolid } from "@medusajs/icons"
import { useAdminRfqStats, useAdminRfqs } from "../../hooks/api/admin-rfq"

export const RfqAnalytics = () => {
  const { data: statsData } = useAdminRfqStats()
  const { data: rfqData, isPending } = useAdminRfqs({ limit: 10 })

  const stats = statsData?.stats
  const rfqs = rfqData?.rfq_requests || []

  return (
    <div className="flex flex-col gap-y-3">
      {stats && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Container className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-bg-subtle flex items-center justify-center">
                <DocumentText className="text-ui-fg-muted" />
              </div>
              <div>
                <Text size="small" className="text-ui-fg-muted">Total RFQs</Text>
                <Heading level="h3">{stats.total || 0}</Heading>
              </div>
            </div>
          </Container>
          <Container className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-bg-subtle flex items-center justify-center">
                <Clock className="text-ui-fg-muted" />
              </div>
              <div>
                <Text size="small" className="text-ui-fg-muted">Active</Text>
                <Heading level="h3">{(stats.by_status?.submitted || 0) + (stats.by_status?.quoting || 0) + (stats.by_status?.in_negotiation || 0)}</Heading>
              </div>
            </div>
          </Container>
          <Container className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-bg-subtle flex items-center justify-center">
                <CheckCircleSolid className="text-ui-fg-muted" />
              </div>
              <div>
                <Text size="small" className="text-ui-fg-muted">Converted</Text>
                <Heading level="h3">{stats.by_status?.converted || 0}</Heading>
              </div>
            </div>
          </Container>
          <Container className="p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-ui-bg-subtle flex items-center justify-center">
                <ArrowPath className="text-ui-fg-muted" />
              </div>
              <div>
                <Text size="small" className="text-ui-fg-muted">By Type</Text>
                <div className="flex gap-2 mt-1">
                  <Text size="xsmall" className="text-ui-fg-muted">P: {stats.by_type?.product || 0}</Text>
                  <Text size="xsmall" className="text-ui-fg-muted">S: {stats.by_type?.service || 0}</Text>
                  <Text size="xsmall" className="text-ui-fg-muted">M: {stats.by_type?.mixed || 0}</Text>
                </div>
              </div>
            </div>
          </Container>
        </div>
      )}

      <Container>
        <div className="mb-4">
          <Heading level="h2">Recent RFQ Requests</Heading>
          <Text size="small" className="text-ui-fg-muted">Platform-wide RFQ activity</Text>
        </div>
        {isPending ? (
          <div className="py-8 text-center">
            <Text className="text-ui-fg-muted">Loading...</Text>
          </div>
        ) : (
          <div className="divide-y divide-ui-border-base">
            {rfqs.map((rfq: any) => (
              <div key={rfq.id} className="flex items-center justify-between py-3">
                <div>
                  <Text weight="plus">{rfq.title}</Text>
                  <div className="flex items-center gap-3 mt-0.5">
                    <Text size="xsmall" className="text-ui-fg-muted">
                      Status: {rfq.status}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-muted">
                      Type: {rfq.rfq_type}
                    </Text>
                    <Text size="xsmall" className="text-ui-fg-muted">
                      {new Date(rfq.created_at).toLocaleDateString()}
                    </Text>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Container>
    </div>
  )
}
