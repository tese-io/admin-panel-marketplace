import { ArrowUpTray, Brackets, ShoppingBag } from '@medusajs/icons'

export const adminConnectProviderMeta = [
  {
    provider: 'csv',
    name: 'Product Importer',
    description:
      'Allow vendors to bulk import products via CSV through the existing product import flow.',
    icon: <ArrowUpTray />
  },
  {
    provider: 'shopify',
    name: 'Shopify Connector',
    description:
      'Allow vendors to connect Shopify stores and sync products, inventory, and pricing.',
    icon: 'https://www.citypng.com/public/uploads/preview/shopify-bag-icon-symbol-logo-701751695132537nenecmhs0u.png'
  },
  {
    provider: 'magento',
    name: 'Magento Connector',
    description:
      'Allow vendors to connect Adobe Commerce / Magento stores via integration tokens.',
    icon: <ShoppingBag />
  },
  {
    provider: 'custom_api',
    name: 'Custom API Connector',
    description:
      'Allow vendors to connect REST catalog APIs with configurable field mapping.',
    icon: <Brackets />,
  }
] as const
