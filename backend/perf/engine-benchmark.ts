import { createRoomStatePresenter } from "../src/adapters/socket/presenter.js"
import { computeHints } from "../src/domain/game/hints.js"
import { getPlayer, isFinished } from "../src/domain/game/model.js"
import type { Game } from "../src/domain/game/model.js"
import { toPlayerView } from "../src/domain/game/player-view.js"
import { startGame } from "../src/domain/game/setup.js"
import { applyTurnAction } from "../src/domain/game/turn-actions.js"
import { endTurn, playTurn as playAction } from "../src/domain/game/turn-flow.js"
import { createRoom } from "../src/domain/room/room.js"
import type { Room } from "../src/domain/room/room.js"
import { cryptoRandomSource } from "../src/infrastructure/crypto-identity.js"

const DURATION_MS = 1500
const WARMUP_MS = 500

const seats = Array.from({ length: 6 }, (_, index) => ({
  id: `p${index}`,
  nickname: `Jogador${index}`,
}))

const freshGame = (): Game => {
  const game = startGame(seats, "p0", cryptoRandomSource)
  if (!game.ok) throw new Error(game.error)
  return game.value
}

const chooseAction = (game: Game, playerId: string) => {
  const best = computeHints(toPlayerView(game, playerId)).plays[0]
  const canKeepHand = game.deck.length > 0 && getPlayer(game, playerId).hand.length <= 4
  return best?.kind === "discard" && canKeepHand ? null : (best?.action ?? null)
}

const playTurn = (initial: Game): Game => {
  let game = initial
  const playerId = game.turn.playerId
  for (let step = 0; step < 2 && !isFinished(game) && game.turn.playerId === playerId; step++) {
    const action = chooseAction(game, playerId)
    if (!action) break
    const applied = playAction(game, playerId, action, cryptoRandomSource)
    if (!applied.ok) throw new Error(applied.error)
    game = applied.value
  }
  if (isFinished(game) || game.turn.playerId !== playerId) return game
  const ended = endTurn(game, playerId, cryptoRandomSource)
  if (!ended.ok) throw new Error(ended.error)
  return ended.value
}

const playWholeGame = (): void => {
  let game = freshGame()
  while (!isFinished(game)) game = playTurn(game)
}

const midGame = freshGame()
const room: Room = {
  ...createRoom("ABC234", {
    id: "p0",
    nickname: "Jogador0",
    reconnectToken: "token",
    connected: true,
    disconnectedAt: null,
  }),
  game: midGame,
  players: seats.map((seat) => ({
    ...seat,
    reconnectToken: "token",
    connected: true,
    disconnectedAt: null,
  })),
}

const measure = (name: string, task: () => void) => {
  const warmupEnd = performance.now() + WARMUP_MS
  while (performance.now() < warmupEnd) task()
  const startedAt = performance.now()
  let iterations = 0
  while (performance.now() - startedAt < DURATION_MS) {
    task()
    iterations++
  }
  const elapsedMs = performance.now() - startedAt
  return {
    name,
    opsPerSecond: Math.round((iterations / elapsedMs) * 1000),
    microsecondsPerOp: Number(((elapsedMs / iterations) * 1000).toFixed(2)),
  }
}

const payloadBytes = Buffer.byteLength(JSON.stringify(createRoomStatePresenter(room)("p0")))

console.table([
  measure("embaralhar e distribuir (6 jogadores)", () => void freshGame()),
  measure("aplicar uma ação", () => void applyTurnAction(midGame, "p0", { type: "draw" })),
  measure("visão de um jogador", () => void toPlayerView(midGame, "p1")),
  measure("calcular dicas", () => void computeHints(toPlayerView(midGame, "p0"))),
  measure("montar e serializar estado para 6 jogadores", () => {
    const present = createRoomStatePresenter(room)
    for (const seat of seats) JSON.stringify(present(seat.id))
  }),
  measure("partida inteira", playWholeGame),
])
console.log(`Tamanho do estado por jogador no início da partida: ${payloadBytes} bytes`)
