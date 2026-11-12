import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    isolate: false,
    coverage: {
      enabled: true,
      provider: "v8",
      include: ["src/domain/games/**"],
      reporter: ["text"],
    },
  },
})
