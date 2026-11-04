import { mkdirSync, writeFileSync } from "node:fs"
import { dirname, resolve } from "node:path"
import { monitorEventLoopDelay } from "node:perf_hooks"
import { setTimeout as sleep } from "node:timers/promises"
import { fileURLToPath } from "node:url"
import { io } from "socket.io-client"
import type { Socket } from "socket.io-client"
import type { Ack, HintsDto, RoomStateDto, SeatDto } from "../src/adapters/socket/contract.js"
import type { TurnAction } from "../src/domain/games/rouba-monte/turn-actions.js"
import { percentile, readServerSample } from "./server-sample.js"
import type { ServerSample } from "./server-sample.js"

const env = process.env
const TARGET = env["TARGET_URL"] ?? "http://localhost:3000"
const METRICS = env["METRICS_URL"] ?? "http://localhost:9464/metrics"
const STEPS = (env["ROOM_STEPS"] ?? "10").split(",").map(Number)
const PLAYERS_PER_ROOM = Number(env["PLAYERS_PER_ROOM"] ?? 6)
const STEP_SECONDS = Number(env["STEP_SECONDS"] ?? 60)
const THINK_MS = Number(env["THINK_MS"] ?? 1000)
const CONNECT_BATCH = Number(env["CONNECT_BATCH"] ?? 30)
const SETTLE_SECONDS = Number(env["SETTLE_SECONDS"] ?? 10)
const LABEL = env["LABEL"] ?? "run"
const SLO_BROADCAST_P95_MS = 1000
const ACK_TIMEOUT_MS = 10_000

interface Recorder {
  ackMs: number[]
  broadcastMs: number[]
  commands: number
  rejected: Record<string, number>
  gamesFinished: number
  stalledRooms: number
}

const request = <T>(socket: Socket, event: string, payload?: unknown): Promise<Ack<T>> =>
  new Promise((resolve) => {
    const client = socket.timeout(ACK_TIMEOUT_MS)
    const settle = (failure: Error | null, ack: Ack<T>) =>
      resolve(
        failure ? { ok: false, error: { code: "ACK_TIMEOUT", message: failure.message } } : ack
      )
    if (payload === undefined) client.emit(event, settle)
    else client.emit(event, payload, settle)
  })

class Bot {
  state: RoomStateDto | null = null
  playerId = ""

  constructor(readonly socket: Socket) {}

  get myTurn(): boolean {
    const game = this.state?.game
    return this.state?.status === "playing" && game?.currentPlayerId === this.playerId
  }
}

class BotRoom {
  readonly bots: Bot[] = []
  private pending: { sentAt: number; baseVersion: number; waiting: Set<Bot> } | null = null
  private stopped = false
  private lastTurn = 0

  constructor(private readonly recorder: Recorder) {}

  async join(index: number): Promise<void> {
    for (let seat = 0; seat < PLAYERS_PER_ROOM; seat++) {
      const bot = await this.connectBot()
      this.bots.push(bot)
      const nickname = `B${index}-${seat}`
      const first = this.bots[0] as Bot
      const ack =
        seat === 0
          ? await request<SeatDto>(bot.socket, "room:create", { nickname })
          : await request<SeatDto>(bot.socket, "room:join", {
              code: first.state?.code,
              nickname,
            })
      if (!ack.ok) throw new Error(ack.error.code)
      bot.playerId = ack.data.playerId
    }
  }

  async run(): Promise<void> {
    const host = this.bots[0] as Bot
    await this.command(host, "game:start")
    while (!this.stopped) {
      const active = this.bots.find((bot) => bot.myTurn)
      if (host.state?.status === "finished") {
        this.recorder.gamesFinished++
        await sleep(THINK_MS)
        await this.command(host, "game:start")
        continue
      }
      if (!active) {
        await sleep(20)
        continue
      }
      await this.playTurn(active)
    }
  }

  stop(): void {
    this.stopped = true
    for (const bot of this.bots) bot.socket.disconnect()
  }

  private async connectBot(): Promise<Bot> {
    const socket = io(TARGET, {
      transports: ["websocket"],
      forceNew: true,
      reconnection: false,
      timeout: 60_000,
    })
    const bot = new Bot(socket)
    socket.on("room:state", (state: RoomStateDto) => {
      bot.state = state
      this.markDelivered(bot, state)
    })
    await new Promise<void>((done, fail) => {
      socket.once("connect", done)
      socket.once("connect_error", fail)
    })
    return bot
  }

  private markDelivered(bot: Bot, state: RoomStateDto): void {
    const pending = this.pending
    if (!pending || state.version <= pending.baseVersion || !pending.waiting.delete(bot)) return
    this.recorder.broadcastMs.push(performance.now() - pending.sentAt)
  }

  private async playTurn(bot: Bot): Promise<void> {
    const turn = bot.state?.game?.turnNumber ?? 0
    if (turn === this.lastTurn) this.recorder.stalledRooms++
    this.lastTurn = turn
    for (let step = 0; step < 2 && !this.stopped && bot.myTurn; step++) {
      await sleep(THINK_MS)
      const action = await this.chooseAction(bot)
      if (!action) break
      await this.command(bot, "game:action", action, true)
    }
    if (this.stopped || !bot.myTurn) return
    await sleep(THINK_MS)
    await this.command(bot, "game:endTurn", undefined, true)
  }

  private async chooseAction(bot: Bot): Promise<TurnAction | null> {
    const hints = await this.command<HintsDto>(bot, "game:hints")
    const action = hints?.plays[0]?.action
    const game = bot.state?.game
    if (!action || !game || !bot.myTurn) return null
    return action
  }

  private async command<T>(
    bot: Bot,
    event: string,
    payload?: unknown,
    trackBroadcast = false
  ): Promise<T | null> {
    const sentAt = performance.now()
    if (trackBroadcast) {
      this.pending = {
        sentAt,
        baseVersion: bot.state?.version ?? 0,
        waiting: new Set(this.bots.filter((peer) => peer !== bot)),
      }
    }
    const ack = await request<T>(bot.socket, event, payload)
    this.recorder.ackMs.push(performance.now() - sentAt)
    this.recorder.commands++
    if (ack.ok) return ack.data
    this.recorder.rejected[ack.error.code] = (this.recorder.rejected[ack.error.code] ?? 0) + 1
    return null
  }
}

const summarize = (values: number[]) => {
  const sorted = values.toSorted((first, second) => first - second)
  const at = (p: number) => Number(percentile(sorted, p).toFixed(2))
  return { count: sorted.length, p50: at(50), p95: at(95), p99: at(99), max: at(100) }
}

const newRecorder = (): Recorder => ({
  ackMs: [],
  broadcastMs: [],
  commands: 0,
  rejected: {},
  gamesFinished: 0,
  stalledRooms: 0,
})

const cpuPercent = (first: ServerSample, last: ServerSample, seconds: number): number =>
  Number((((last.cpuSeconds - first.cpuSeconds) / seconds) * 100).toFixed(1))

const runStep = async (roomCount: number) => {
  const recorder = newRecorder()
  const rooms = Array.from({ length: roomCount }, () => new BotRoom(recorder))
  const connectStartedAt = performance.now()
  for (let start = 0; start < rooms.length; start += CONNECT_BATCH) {
    await Promise.all(
      rooms.slice(start, start + CONNECT_BATCH).map((room, offset) => room.join(start + offset))
    )
  }
  const connectSeconds = (performance.now() - connectStartedAt) / 1000
  const idle = await readServerSample(METRICS)

  const generatorLag = monitorEventLoopDelay({ resolution: 10 })
  generatorLag.enable()
  const running = rooms.map((room) => room.run().catch(() => undefined))

  await sleep(SETTLE_SECONDS * 1000)
  recorder.ackMs.length = 0
  recorder.broadcastMs.length = 0
  recorder.commands = 0
  const first = await readServerSample(METRICS)
  const startedAt = performance.now()

  await sleep(STEP_SECONDS * 1000)

  const last = await readServerSample(METRICS)
  const elapsed = (performance.now() - startedAt) / 1000
  const ack = summarize(recorder.ackMs)
  const broadcast = summarize(recorder.broadcastMs)
  const commands = recorder.commands
  const rejected = { ...recorder.rejected }
  const gamesFinished = recorder.gamesFinished
  generatorLag.disable()

  rooms.forEach((room) => room.stop())
  await Promise.all(running)

  return {
    rooms: roomCount,
    players: roomCount * PLAYERS_PER_ROOM,
    thinkMs: THINK_MS,
    connectSeconds: Number(connectSeconds.toFixed(1)),
    commandsPerSecond: Number((commands / elapsed).toFixed(1)),
    stateMessagesPerSecond: Number(
      ((last.stateMessages - first.stateMessages) / elapsed).toFixed(1)
    ),
    ackMs: ack,
    broadcastMs: broadcast,
    sloBroadcastP95Ok: broadcast.p95 <= SLO_BROADCAST_P95_MS,
    gamesFinished,
    rejected,
    server: {
      cpuPercent: cpuPercent(first, last, elapsed),
      rssMb: Number((last.rssBytes / 1048576).toFixed(1)),
      heapUsedMb: Number((last.heapBytes / 1048576).toFixed(1)),
      idleRssMb: Number((idle.rssBytes / 1048576).toFixed(1)),
      eventLoopLagP99Ms: Number((last.eventLoopLagP99Seconds * 1000).toFixed(2)),
      connections: last.connections,
    },
    generator: {
      eventLoopLagP99Ms: Number((generatorLag.percentile(99) / 1e6).toFixed(2)),
    },
  }
}

const results = []
for (const roomCount of STEPS) {
  console.log(`\n>> ${roomCount} salas × ${PLAYERS_PER_ROOM} jogadores, ${STEP_SECONDS}s`)
  const result = await runStep(roomCount)
  console.log(JSON.stringify(result))
  results.push(result)
  await sleep(5000)
}

const outputDir = resolve(dirname(fileURLToPath(import.meta.url)), "results")
mkdirSync(outputDir, { recursive: true })
const output = resolve(outputDir, `${LABEL}.json`)
writeFileSync(output, JSON.stringify({ label: LABEL, target: TARGET, results }, null, 2))

console.table(
  results.map((result) => ({
    salas: result.rooms,
    jogadores: result.players,
    "cmd/s": result.commandsPerSecond,
    "msg/s": result.stateMessagesPerSecond,
    "ack p95": result.ackMs.p95,
    "broadcast p95": result.broadcastMs.p95,
    "broadcast p99": result.broadcastMs.p99,
    "cpu %": result.server.cpuPercent,
    "rss MB": result.server.rssMb,
    "lag p99": result.server.eventLoopLagP99Ms,
    "lag gerador": result.generator.eventLoopLagP99Ms,
    SLO: result.sloBroadcastP95Ok ? "ok" : "FALHOU",
  }))
)
process.exit(0)
