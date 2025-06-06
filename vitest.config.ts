import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    typecheck: {
      enabled: true,
    },
  },
  resolve: {
    alias: {
      "@": "/src",
    },
  },
})