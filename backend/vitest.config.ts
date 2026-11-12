import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    include: ["test/**/*.test.ts"],
    isolate: false,
    coverage: {
      provider: "v8",
      include: ["src/domain/**", "src/application/**", "src/adapters/**"],
      thresholds: {
        "src/domain/**": { lines: 90, branches: 80, functions: 90, statements: 90 },
      },
    },
  },
})
