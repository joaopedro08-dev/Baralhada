import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from "prom-client"
import type { RoomRepository } from "../application/ports.js"
import type { CommandMetrics } from "../adapters/socket/connection.js"
import { statusOf } from "../domain/room/room.js"

const LATENCY_BUCKETS = [0.0001, 0.00025, 0.0005, 0.001, 0.0025, 0.005, 0.01, 0.025, 0.05, 0.1, 0.5]

export class PrometheusMetrics implements CommandMetrics {
  readonly registry = new Registry()
  private readonly commandDuration: Histogram<"command" | "outcome">
  private readonly commands: Counter<"command" | "outcome">
  private readonly broadcastDuration: Histogram
  private readonly stateMessages: Counter
  private readonly connections: Gauge

  constructor(rooms: RoomRepository) {
    collectDefaultMetrics({ register: this.registry })
    const registers = [this.registry]

    this.commandDuration = new Histogram({
      name: "roubamonte_command_duration_seconds",
      help: "Tempo de processamento de um comando no servidor",
      labelNames: ["command", "outcome"],
      buckets: LATENCY_BUCKETS,
      registers,
    })
    this.commands = new Counter({
      name: "roubamonte_commands_total",
      help: "Comandos recebidos por resultado",
      labelNames: ["command", "outcome"],
      registers,
    })
    this.broadcastDuration = new Histogram({
      name: "roubamonte_broadcast_duration_seconds",
      help: "Tempo para montar e enviar o estado de uma sala",
      buckets: LATENCY_BUCKETS,
      registers,
    })
    this.stateMessages = new Counter({
      name: "roubamonte_state_messages_total",
      help: "Mensagens de estado enviadas aos jogadores",
      registers,
    })
    this.connections = new Gauge({
      name: "roubamonte_connections",
      help: "Conexões abertas",
      registers,
    })
    new Gauge({
      name: "roubamonte_rooms",
      help: "Salas em memória por estado",
      labelNames: ["status"],
      registers,
      collect() {
        const totals = { lobby: 0, playing: 0, finished: 0 }
        for (const room of rooms.all()) totals[statusOf(room)]++
        for (const [status, total] of Object.entries(totals)) this.set({ status }, total)
      },
    })
  }

  observeCommand(command: string, outcome: "ok" | "rejected" | "failed", seconds: number): void {
    this.commandDuration.observe({ command, outcome }, seconds)
    this.commands.inc({ command, outcome })
  }

  observeBroadcast(recipients: number, seconds: number): void {
    this.broadcastDuration.observe(seconds)
    this.stateMessages.inc(recipients)
  }

  connectionOpened(): void {
    this.connections.inc()
  }

  connectionClosed(): void {
    this.connections.dec()
  }
}
