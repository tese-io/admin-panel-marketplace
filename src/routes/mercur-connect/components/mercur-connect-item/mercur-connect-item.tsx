import { Avatar, Heading, StatusBadge, Text } from '@medusajs/ui'

import { IconAvatar } from '../../../../components/common/icon-avatar'

type ItemProps = {
  name: string
  description: string
  enabled: boolean
  icon: React.ReactNode | string
  provider: string
}

export const MercurConnectItem = ({
  item,
  testId = 'mercur-connect-item'
}: {
  item: ItemProps
  testId?: string
}) => {
  const fallback = item.name.charAt(0).toUpperCase()
  const isIconString = typeof item.icon === 'string'

  return (
    <div className="flex flex-col gap-3" data-testid={testId}>
      <div>
        {isIconString ? (
          <Avatar
            size="xlarge"
            src={item.icon as string}
            fallback={fallback}
            variant="squared"
          />
        ) : (
          <IconAvatar size="xlarge">{item.icon}</IconAvatar>
        )}
      </div>
      <div>
        <Heading level="h2">{item.name}</Heading>
        <Text size="small" className="text-ui-fg-subtle">
          {item.description}
        </Text>
      </div>
      <StatusBadge color={item.enabled ? 'green' : 'orange'}>
        {item.enabled ? 'Enabled' : 'Disabled'}
      </StatusBadge>
    </div>
  )
}
