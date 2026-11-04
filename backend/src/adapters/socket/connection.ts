import type { ServerEvent, ServerEvents } from "./contract.js"

export type RawAck = (response: unknown) => void

export interface ClientConnection {
  readonly clientAddress: string
  on(event: string, listener: (payload: unknown, ack: RawAck) => void): void
  onDisconnect(listener: () => void): void
  emit<E extends ServerEvent>(event: E, payload: ServerEvents[E]): void
  close(): void
}

export interface CommandMetrics {
  observeCommand(command: string, outcome: "ok" | "rejected" | "failed", seconds: number): void
  observeBroadcast(recipients: number, seconds: number): void
  connectionOpened(): void
  connectionClosed(): void
}
