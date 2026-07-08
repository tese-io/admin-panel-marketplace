import { Container, Heading, Switch, Text, toast } from '@medusajs/ui'

import { MercurConnectItem } from './components/mercur-connect-item/mercur-connect-item'
import { adminConnectProviderMeta } from './const'
import {
  useAdminConnectInstallations,
  useAdminConnectProviders,
  useToggleConnectProvider
} from '../../hooks/api/connect'

export const MercurConnect = () => {
  const { data: providersData } = useAdminConnectProviders()
  const { data: installationsData } = useAdminConnectInstallations()
  const toggleProvider = useToggleConnectProvider()

  const providerState = new Map(
    (providersData?.providers || []).map(provider => [
      provider.provider,
      provider.enabled
    ])
  )

  const handleToggle = async (provider: string, enabled: boolean) => {
    try {
      await toggleProvider.mutateAsync({ provider, enabled })
      toast.success(`${provider} connector ${enabled ? 'enabled' : 'disabled'}`)
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update connector')
    }
  }

  return (
    <div className="flex flex-col gap-y-4">
      <Container className="p-6">
        <Heading level="h1">Mercur Connect</Heading>
        <Text className="text-ui-fg-subtle mt-1" size="small">
          Enable marketplace-wide connector types. Vendors connect their own stores from the vendor panel.
        </Text>
      </Container>

      <div className="grid gap-3 lg:grid-cols-2">
        {adminConnectProviderMeta.map(item => {
          const enabled = providerState.get(item.provider) ?? false

          return (
            <Container key={item.provider} className="flex flex-col gap-4 p-4">
              <MercurConnectItem
                item={{
                  ...item,
                  enabled,
                  provider: item.provider
                }}
              />
              <div className="flex items-center justify-between border-t border-ui-border-base pt-4">
                <Text size="small">Available to vendors</Text>
                <Switch
                  checked={enabled}
                  onCheckedChange={checked =>
                    handleToggle(item.provider, checked)
                  }
                />
              </div>
            </Container>
          )
        })}
      </div>

      <Container className="p-6">
        <Heading level="h2">Active installations</Heading>
        <div className="mt-4 flex flex-col gap-2">
          {(installationsData?.installations || []).length === 0 ? (
            <Text size="small" className="text-ui-fg-subtle">
              No vendor installations yet.
            </Text>
          ) : (
            (installationsData?.installations || []).map((installation: any) => (
              <div
                key={installation.id}
                className="flex items-center justify-between border-b border-ui-border-base py-2"
              >
                <div>
                  <Text weight="plus">{installation.provider}</Text>
                  <Text size="small" className="text-ui-fg-subtle">
                    {installation.seller?.name || installation.seller_id} ·{' '}
                    {installation.external_store_url || installation.external_store_id}
                  </Text>
                </div>
                <Text size="small">{installation.status}</Text>
              </div>
            ))
          )}
        </div>
      </Container>
    </div>
  )
}
