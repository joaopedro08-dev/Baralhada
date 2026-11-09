import type { Card, Rank } from "../../cards/card.js"
import { wildRankFor } from "./melds.js"
import { findPlayer, isFinished } from "./model.js"
import type {
  CachetaEndReason,
  CachetaEvent,
  CachetaGame,
  PendingStep,
  PlayerId,
  PlayerStatus,
  RoundResult,
  TurnStage,
} from "./model.js"

export interface CachetaPublicPlayer {
  readonly id: PlayerId
  readonly nickname: string
  readonly handSize: number
  readonly points: number
  readonly status: PlayerStatus
}

export interface CachetaMoves {
  readonly draw: boolean
  readonly take: boolean
  readonly discard: boolean
  readonly knock: boolean
}

export interface CachetaView {
  readonly viewerId: PlayerId
  readonly hand: readonly Card[]
  readonly drawnCard: Card | null
  readonly players: readonly CachetaPublicPlayer[]
  readonly round: number
  readonly vira: Card
  readonly wildRank: Rank
  readonly stockSize: number
  readonly discardTop: Card | null
  readonly discardSize: number
  readonly currentPlayerId: PlayerId
  readonly turnNumber: number
  readonly stage: TurnStage
  readonly pending: PendingStep | null
  readonly moves: CachetaMoves
  readonly lastRound: RoundResult | null
  readonly eliminations: readonly PlayerId[]
  readonly winnerId: PlayerId | null
  readonly endReason: CachetaEndReason | null
  readonly events: readonly CachetaEvent[]
}

const NO_MOVES: CachetaMoves = { draw: false, take: false, discard: false, knock: false }

const isOnTurn = (game: CachetaGame, viewerId: PlayerId): boolean =>
  !isFinished(game) &&
  game.pending === null &&
  game.turn.playerId === viewerId &&
  findPlayer(game, viewerId)?.status === "playing"

export const cachetaMovesOf = (game: CachetaGame, viewerId: PlayerId): CachetaMoves => {
  if (!isOnTurn(game, viewerId)) return NO_MOVES
  const picking = game.turn.stage === "start"
  return {
    draw: picking,
    take: picking && game.discard.length > 0,
    discard: !picking,
    knock: !picking,
  }
}

export const toCachetaView = (game: CachetaGame, viewerId: PlayerId): CachetaView => ({
  viewerId,
  hand: findPlayer(game, viewerId)?.hand ?? [],
  drawnCard: game.turn.playerId === viewerId ? game.turn.drawn : null,
  players: game.players.map((player) => ({
    id: player.id,
    nickname: game.nicknames[player.id] ?? "",
    handSize: player.hand.length,
    points: player.points,
    status: player.status,
  })),
  round: game.round,
  vira: game.vira,
  wildRank: wildRankFor(game.vira),
  stockSize: game.stock.length,
  discardTop: game.discard.at(-1) ?? null,
  discardSize: game.discard.length,
  currentPlayerId: game.turn.playerId,
  turnNumber: game.turn.number,
  stage: game.turn.stage,
  pending: game.pending,
  moves: cachetaMovesOf(game, viewerId),
  lastRound: game.lastRound,
  eliminations: game.eliminations,
  winnerId: game.winnerId,
  endReason: game.endReason,
  events: game.events,
})
