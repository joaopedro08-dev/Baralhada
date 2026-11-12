import { defineConfig } from "vitest/config"

process.env.SIMULATION_SEEDS = "100"

export default defineConfig({
  test: {
    include: ["test/domain/*simulation.test.ts"],
    isolate: false,
  },
})
