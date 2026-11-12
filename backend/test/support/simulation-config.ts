const configuredRuns = Number(process.env.SIMULATION_SEEDS ?? "10")

export const SIMULATION_RUNS =
  Number.isInteger(configuredRuns) && configuredRuns > 0 ? configuredRuns : 10
