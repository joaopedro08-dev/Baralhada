import { createRoomStatePresenter } from "../src/adapters/socket/presenter.js"
import { computeHints } from "../src/domain/games/rouba-monte/hints.js"
import { getPlayer, isFinished } from "../src/domain/games/rouba-monte/model.js"
import type { Game } from "../src/domain/games/rouba-monte/model.js"
import { countRanksInPiles, toPlayerView } from "../src/domain/games/rouba-monte/player-view.js"
import { startGame } from "../src/domain/games/rouba-monte/setup.js"
import { applyTurnAction } from "../src/domain/games/rouba-monte/turn-actions.js"
import type { TurnAction } from "../src/domain/games/rouba-monte/turn-actions.js"
import { playTurn as playAction } from "../src/domain/games/rouba-monte/turn-flow.js"
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

const hintsFor = (game: Game, playerId: string) =>
  computeHints(toPlayerView(game, playerId), countRanksInPiles(game))

const playTurn = (game: Game): Game => {
  const playerId = game.turn.playerId
  const best = hintsFor(game, playerId).plays[0]
  if (!best) throw new Error(`Sem jogada para ${playerId}`)
  const applied = playAction(game, playerId, best.action)
  if (!applied.ok) throw new Error(applied.error)
  return applied.value
}

const playWholeGame = (): void => {
  let game = freshGame()
  while (!isFinished(game)) game = playTurn(game)
}

const midGame = freshGame()
const openingDiscard = { type: "discard", card: getPlayer(midGame, "p0").hand[0] } as TurnAction
const room: Room<Game> = {
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

const payloadBytes = Buffer.byteLength(
  JSON.stringify(createRoomStatePresenter(room, Date.now())("p0"))
)

console.table([
  measure("embaralhar e distribuir (6 jogadores)", () => void freshGame()),
  measure("aplicar uma ação", () => void applyTurnAction(midGame, "p0", openingDiscard)),
  measure("visão de um jogador", () => void toPlayerView(midGame, "p1")),
  measure("calcular dicas", () => void hintsFor(midGame, "p0")),
  measure("montar e serializar estado para 6 jogadores", () => {
    const present = createRoomStatePresenter(room, Date.now())
    for (const seat of seats) JSON.stringify(present(seat.id))
  }),
  measure("partida inteira", playWholeGame),
])
console.log(`Tamanho do estado por jogador no início da partida: ${payloadBytes} bytes`)
