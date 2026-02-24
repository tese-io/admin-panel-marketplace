import { useState } from "react"
import { Container, Heading, Text, Badge, Button } from "@medusajs/ui"
import { CheckCircleSolid, XCircle } from "@medusajs/icons"
import { useAdminServices, useApproveService, useRejectService } from "../../hooks/api/admin-services"

export const ServiceModerationList = () => {
  const { data, isPending } = useAdminServices({ limit: 50 })
  const approveService = useApproveService()
  const rejectService = useRejectService()

  const [rejectingId, setRejectingId] = useState<string | null>(null)
  const [rejectReason, setRejectReason] = useState("")

  const services = data?.services || []
  const pendingServices = services.filter((s: any) => s.status === "pending_approval")
  const allServices = services

  function handleReject(id: string) {
    rejectService.mutate(
      { id, body: { reason: rejectReason } },
      {
        onSuccess: () => {
          setRejectingId(null)
          setRejectReason("")
        },
      }
    )
  }

  return (
    <div className="flex flex-col gap-y-3">
      {/* Pending Approval Queue */}
      <Container>
        <div className="mb-4">
          <Heading level="h2">Pending Approval ({pendingServices.length})</Heading>
          <Text size="small" className="text-ui-fg-muted">
            Service listings requiring admin review before going live
          </Text>
        </div>

        {isPending ? (
          <div className="py-8 text-center">
            <Text className="text-ui-fg-muted">Loading...</Text>
          </div>
        ) : pendingServices.length === 0 ? (
          <div className="py-8 text-center">
            <CheckCircleSolid className="w-10 h-10 text-ui-fg-muted mx-auto mb-2" />
            <Text size="small" className="text-ui-fg-muted">No services pending approval</Text>
          </div>
        ) : (
          <div className="divide-y divide-ui-border-base">
            {pendingServices.map((service: any) => {
              const isRejecting = rejectingId === service.id
              return (
                <div key={service.id} className="py-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <Text weight="plus">{service.title}</Text>
                        <Badge color="orange" size="small">Pending</Badge>
                        {service.service_type && (
                          <Badge size="small">{service.service_type.replace(/_/g, " ")}</Badge>
                        )}
                      </div>
                      <Text size="small" className="text-ui-fg-muted line-clamp-2">{service.description}</Text>
                      <div className="flex items-center gap-3 mt-1">
                        <Text size="xsmall" className="text-ui-fg-muted">
                          Seller: {service.seller_id?.slice(-8)}
                        </Text>
                        <Text size="xsmall" className="text-ui-fg-muted">
                          {service.tiers?.length || 0} tiers
                        </Text>
                        <Text size="xsmall" className="text-ui-fg-muted">
                          Submitted: {new Date(service.created_at).toLocaleDateString()}
                        </Text>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 ml-4">
                      <Button
                        size="small"
                        onClick={() => approveService.mutate(service.id)}
                        isLoading={approveService.isPending}
                      >
                        <CheckCircleSolid className="mr-1" />
                        Approve
                      </Button>
                      <Button
                        variant="danger"
                        size="small"
                        onClick={() => setRejectingId(isRejecting ? null : service.id)}
                      >
                        <XCircle className="mr-1" />
                        Reject
                      </Button>
                    </div>
                  </div>

                  {isRejecting && (
                    <div className="mt-3 p-4 bg-ui-bg-subtle rounded-lg space-y-3">
                      <div>
                        <Text size="small" weight="plus" className="mb-1">Reason for Rejection</Text>
                        <textarea
                          value={rejectReason}
                          onChange={(e) => setRejectReason(e.target.value)}
                          placeholder="Explain why the service listing is being rejected..."
                          rows={2}
                          className="w-full px-3 py-2 border border-ui-border-base rounded-md text-sm bg-ui-bg-base resize-y"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="small"
                          variant="danger"
                          onClick={() => handleReject(service.id)}
                          isLoading={rejectService.isPending}
                          disabled={!rejectReason.trim()}
                        >
                          Confirm Reject
                        </Button>
                        <Button size="small" variant="secondary" onClick={() => setRejectingId(null)}>
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </Container>

      {/* All Services */}
      <Container>
        <div className="mb-4">
          <Heading level="h2">All Services ({allServices.length})</Heading>
        </div>
        <div className="divide-y divide-ui-border-base">
          {allServices.map((service: any) => (
            <div key={service.id} className="flex items-center justify-between py-3">
              <div>
                <div className="flex items-center gap-2">
                  <Text weight="plus">{service.title}</Text>
                  <Badge
                    color={
                      service.status === "active" ? "green" :
                      service.status === "suspended" ? "red" :
                      service.status === "pending_approval" ? "orange" : "grey"
                    }
                    size="small"
                  >
                    {service.status.replace(/_/g, " ")}
                  </Badge>
                </div>
                <Text size="xsmall" className="text-ui-fg-muted">
                  {service.service_type?.replace(/_/g, " ")} — Seller: {service.seller_id?.slice(-8)}
                </Text>
              </div>
            </div>
          ))}
        </div>
      </Container>
    </div>
  )
}
