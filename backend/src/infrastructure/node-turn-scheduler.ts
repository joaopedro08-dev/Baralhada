import type { TurnScheduler } from "../application/ports.js"

export type TurnExpiredHandler = (input: { roomCode: string; turnNumber: number }) => void

export class NodeTurnScheduler implements TurnScheduler {
  private readonly timers = new Map<string, NodeJS.Timeout>()

  constructor(private readonly onExpired: TurnExpiredHandler) {}

  schedule(roomCode: string, turnNumber: number, delayMs: number): void {
    this.cancel(roomCode)
    const timer = setTimeout(() => {
      this.timers.delete(roomCode)
      this.onExpired({ roomCode, turnNumber })
    }, delayMs)
    timer.unref()
    this.timers.set(roomCode, timer)
  }

  cancel(roomCode: string): void {
    const timer = this.timers.get(roomCode)
    if (!timer) return
    clearTimeout(timer)
    this.timers.delete(roomCode)
  }

  cancelAll(): void {
    for (const code of [...this.timers.keys()]) this.cancel(code)
  }
}
