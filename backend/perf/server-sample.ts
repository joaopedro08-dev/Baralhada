export interface ServerSample {
  readonly cpuSeconds: number
  readonly rssBytes: number
  readonly heapBytes: number
  readonly eventLoopLagP99Seconds: number
  readonly connections: number
  readonly stateMessages: number
}

export const percentile = (sorted: readonly number[], p: number): number => {
  if (sorted.length === 0) return 0
  const index = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1)
  return sorted[Math.max(index, 0)] as number
}

const readMetric = (body: string, name: string): number => {
  const line = body.split("\n").find((candidate) => candidate.startsWith(`${name} `))
  return Number(line?.split(" ")[1] ?? 0)
}

export const readServerSample = async (url: string): Promise<ServerSample> => {
  const body = await (await fetch(url)).text()
  return {
    cpuSeconds: readMetric(body, "process_cpu_seconds_total"),
    rssBytes: readMetric(body, "process_resident_memory_bytes"),
    heapBytes: readMetric(body, "nodejs_heap_size_used_bytes"),
    eventLoopLagP99Seconds: readMetric(body, "nodejs_eventloop_lag_p99_seconds"),
    connections: readMetric(body, "baralhada_connections"),
    stateMessages: readMetric(body, "baralhada_state_messages_total"),
  }
}
