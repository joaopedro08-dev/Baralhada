import { RoomPresenter } from "../src/adapters/socket/presenter.js"
import { computeHints } from "../src/domain/games/rouba-monte/hints.js"
import { getPlayer, isFinished } from "../src/domain/games/rouba-monte/model.js"
import type { Game } from "../src/domain/games/rouba-monte/model.js"
import { countRanksInPiles, toPlayerView } from "../src/domain/games/rouba-monte/player-view.js"
import { ROUBA_MONTE_ID } from "../src/domain/games/rouba-monte/rules.js"
import { startGame } from "../src/domain/games/rouba-monte/setup.js"
import { applyTurnAction } from "../src/domain/games/rouba-monte/turn-actions.js"
import type { TurnAction } from "../src/domain/games/rouba-monte/turn-actions.js"
import { playTurn as playAction } from "../src/domain/games/rouba-monte/turn-flow.js"
import { playTruco } from "../src/domain/games/truco/actions.js"
import { computeTrucoHints } from "../src/domain/games/truco/hints.js"
import { actorOf, isFinished as trucoFinished } from "../src/domain/games/truco/model.js"
import type { TrucoGame } from "../src/domain/games/truco/model.js"
import { toTrucoView } from "../src/domain/games/truco/player-view.js"
import { startGame as startTruco } from "../src/domain/games/truco/setup.js"
import { createRoom } from "../src/domain/room/room.js"
import type { Room } from "../src/domain/room/room.js"
import { cryptoRandomSource } from "../src/infrastructure/crypto-identity.js"
import { gameAdapters, gameCatalog } from "../src/main/container.js"

const DURATION_MS = 1500
const WARMUP_MS = 500

const seats = Array.from({ length: 6 }, (_, index) => ({
  id: `p${index}`,
  nickname: `Jogador${index}`,
  team: index % 2,
}))

const freshGame = (): Game => {
  const game = startGame(seats, "p0", cryptoRandomSource)
  if (!game.ok) throw new Error(game.error)
  return game.value
}

const freshTruco = (): TrucoGame => {
  const game = startTruco(seats, "p0", cryptoRandomSource)
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

const playTrucoStep = (game: TrucoGame): TrucoGame => {
  const playerId = actorOf(game.hand)
  const [best] = computeTrucoHints(toTrucoView(game, playerId)).suggestions
  if (!best) throw new Error(`Sem jogada para ${playerId}`)
  const applied = playTruco(game, playerId, best.action, cryptoRandomSource)
  if (!applied.ok) throw new Error(applied.error)
  return applied.value
}

const playWholeTruco = (): void => {
  let game = freshTruco()
  while (!trucoFinished(game)) game = playTrucoStep(game)
}

const midGame = freshGame()
const openingDiscard = { type: "discard", card: getPlayer(midGame, "p0").hand[0] } as TurnAction
const roomPlayers = seats.map(({ id, nickname }) => ({
  id,
  nickname,
  reconnectToken: "token",
  connected: true,
  disconnectedAt: null,
}))
const roomOf = (gameId: string, game: unknown): Room => ({
  ...createRoom("ABC234", gameId, roomPlayers[0] as (typeof roomPlayers)[number]),
  game,
  players: roomPlayers,
})
const roubaMonteRoom = roomOf(ROUBA_MONTE_ID, midGame)
const trucoRoom = roomOf("truco-paulista", freshTruco())
const presenter = new RoomPresenter(gameCatalog, gameAdapters, null)

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

const broadcast = (room: Room) => () => {
  const present = presenter.present(room, Date.now())
  for (const seat of seats) JSON.stringify(present(seat.id))
}

const payloadBytes = (room: Room) =>
  Buffer.byteLength(JSON.stringify(presenter.present(room, Date.now())("p0")))

console.table([
  measure("embaralhar e distribuir (6 jogadores)", () => void freshGame()),
  measure("aplicar uma ação", () => void applyTurnAction(midGame, "p0", openingDiscard)),
  measure("visão de um jogador", () => void toPlayerView(midGame, "p1")),
  measure("calcular dicas", () => void hintsFor(midGame, "p0")),
  measure("montar e serializar estado para 6 jogadores", broadcast(roubaMonteRoom)),
  measure("partida inteira", playWholeGame),
  measure("truco: distribuir (6 jogadores)", () => void freshTruco()),
  measure("truco: montar e serializar estado para 6 jogadores", broadcast(trucoRoom)),
  measure("truco: partida inteira até 12 pontos", playWholeTruco),
])
console.log(`Estado por jogador no início, Rouba Monte: ${payloadBytes(roubaMonteRoom)} bytes`)
console.log(`Estado por jogador no início, Truco: ${payloadBytes(trucoRoom)} bytes`)
