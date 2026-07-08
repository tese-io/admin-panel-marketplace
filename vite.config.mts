import path from 'path';

import inject from '@medusajs/admin-vite-plugin';
import react from '@vitejs/plugin-react';
import { defineConfig, loadEnv } from 'vite';
import inspect from 'vite-plugin-inspect';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd());

  const BASE = env.VITE_MEDUSA_BASE || '/';
  const MEDUSA_SERVER_URL = env.VITE_MEDUSA_SERVER_URL || 'http://localhost:9000';
  const USE_DEV_PROXY = env.VITE_MEDUSA_DEV_PROXY !== 'false';
  const BACKEND_URL =
    mode === 'development' && USE_DEV_PROXY
      ? ''
      : env.VITE_MEDUSA_BACKEND_URL || 'http://localhost:9000';
  const STOREFRONT_URL = env.VITE_MEDUSA_STOREFRONT_URL || 'http://localhost:8000';
  const B2B_PANEL = env.VITE_MEDUSA_B2B_PANEL || 'false';

  /**
   * Add this to your .env file to specify the project to load admin extensions from.
   */
  const MEDUSA_PROJECT = env.VITE_MEDUSA_PROJECT || null;
  const sources = MEDUSA_PROJECT ? [MEDUSA_PROJECT] : [];

  return {
    plugins: [
      inspect(),
      react(),
      inject({
        sources
      })
    ],
    resolve: {
      alias: {
        '@custom-types': path.resolve(__dirname, './src/types'),
        '@hooks': path.resolve(__dirname, './src/hooks'),
        '@components': path.resolve(__dirname, './src/components'),
        '@routes': path.resolve(__dirname, './src/routes'),
        '@utils': path.resolve(__dirname, './src/utils'),
        '@assets': path.resolve(__dirname, './src/assets'),
        '@styles': path.resolve(__dirname, './src/styles'),
        '@lib': path.resolve(__dirname, './src/lib'),
        '@providers': path.resolve(__dirname, './src/providers'),
        '@': path.resolve(__dirname, './src')
      }
    },
    define: {
      __BASE__: JSON.stringify(BASE),
      __BACKEND_URL__: JSON.stringify(BACKEND_URL),
      __STOREFRONT_URL__: JSON.stringify(STOREFRONT_URL),
      __B2B_PANEL__: JSON.stringify(B2B_PANEL),
    },
    server: {
      host: true,
      open: true,
      proxy:
        mode === 'development' && USE_DEV_PROXY
          ? {
              '/auth': {
                target: MEDUSA_SERVER_URL,
                changeOrigin: true,
                secure: false
              },
              '/admin': {
                target: MEDUSA_SERVER_URL,
                changeOrigin: true,
                secure: false
              }
            }
          : undefined
    }
  };
});
