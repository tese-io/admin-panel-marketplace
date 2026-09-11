import { defineConfig } from "vitest/config";

// Standalone test config: the app's vite.config.mts pulls in
// @medusajs/admin-vite-plugin, which unit tests don't need (and which
// isn't guaranteed to be installed in every environment the tests run
// in). Vitest prefers this file over vite.config automatically.
export default defineConfig({
  // Build-time defines the app config normally injects — tests only
  // need them to exist so transitive imports of the sdk client parse.
  define: {
    __BACKEND_URL__: "undefined",
    __STOREFRONT_URL__: "undefined",
    __BASE__: JSON.stringify("/"),
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.{ts,tsx}"],
  },
});
