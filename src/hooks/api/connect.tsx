import { useMutation, useQuery } from '@tanstack/react-query'

import { sdk } from '../../lib/client'
import { queryClient } from '../../lib/query-client'
import { queryKeysFactory } from '../../lib/query-key-factory'

const CONNECT_QUERY_KEY = 'connect' as const
export const connectQueryKeys = queryKeysFactory(CONNECT_QUERY_KEY)

export type AdminConnectProvider = {
  id: string
  provider: string
  name: string
  description?: string | null
  enabled: boolean
}

export const useAdminConnectProviders = () => {
  return useQuery<{ providers: AdminConnectProvider[] }>({
    queryKey: connectQueryKeys.list('providers'),
    queryFn: () =>
      sdk.client.fetch('/admin/connect/providers', {
        method: 'GET'
      })
  })
}

export type AdminConnectInstallation = {
  id: string
  provider: string
  status: string
  seller_id?: string | null
  seller?: { name?: string | null } | null
  external_store_id?: string | null
  external_store_url?: string | null
}

export const useAdminConnectInstallations = () => {
  return useQuery<{ installations: AdminConnectInstallation[] }>({
    queryKey: connectQueryKeys.list('installations'),
    queryFn: () =>
      sdk.client.fetch('/admin/connect/installations', {
        method: 'GET'
      })
  })
}

export const useToggleConnectProvider = () => {
  return useMutation({
    mutationFn: ({
      provider,
      enabled
    }: {
      provider: string
      enabled: boolean
    }) =>
      sdk.client.fetch(`/admin/connect/providers/${provider}`, {
        method: 'POST',
        body: { enabled }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: connectQueryKeys.list('providers')
      })
    }
  })
}

export const useAdminConnectTemplates = () => {
  return useQuery({
    queryKey: connectQueryKeys.list('templates'),
    queryFn: () =>
      sdk.client.fetch('/admin/connect/templates', {
        method: 'GET'
      })
  })
}
