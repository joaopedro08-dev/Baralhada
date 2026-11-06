import type { Card, Rank } from "../../cards/card.js"
import { meldLimitOf } from "./actions.js"
import { findPlayer, isFinished } from "./model.js"
import type {
  CardSet,
  PlayerId,
  TrincaEndReason,
  TrincaEvent,
  TrincaGame,
  TurnStage,
} from "./model.js"
import { jokersFor } from "./sets.js"

export interface TrincaPublicPlayer {
  readonly id: PlayerId
  readonly nickname: string
  readonly handSize: number
  readonly sets: readonly CardSet[]
}

export interface TrincaMoves {
  readonly draw: boolean
  readonly discard: boolean
  readonly meldLimit: number
}

export interface TrincaView {
  readonly viewerId: PlayerId
  readonly hand: readonly Card[]
  readonly players: readonly TrincaPublicPlayer[]
  readonly vira: Card
  readonly deadRank: Rank
  readonly wildRank: Rank
  readonly stockSize: number
  readonly discardTop: Card | null
  readonly discardSize: number
  readonly currentPlayerId: PlayerId
  readonly turnNumber: number
  readonly stage: TurnStage
  readonly moves: TrincaMoves
  readonly winnerId: PlayerId | null
  readonly endReason: TrincaEndReason | null
  readonly events: readonly TrincaEvent[]
}

const NO_MOVES: TrincaMoves = { draw: false, discard: false, meldLimit: 0 }

export const trincaMovesOf = (game: TrincaGame, viewerId: PlayerId): TrincaMoves => {
  const viewer = findPlayer(game, viewerId)
  if (!viewer || isFinished(game) || game.turn.playerId !== viewerId) return NO_MOVES
  const drawn = game.turn.stage === "drawn"
  return { draw: !drawn, discard: drawn, meldLimit: meldLimitOf(game, viewer) }
}

export const toTrincaView = (game: TrincaGame, viewerId: PlayerId): TrincaView => {
  const jokers = jokersFor(game.vira)
  return {
    viewerId,
    hand: findPlayer(game, viewerId)?.hand ?? [],
    players: game.players.map((player) => ({
      id: player.id,
      nickname: game.nicknames[player.id] ?? "",
      handSize: player.hand.length,
      sets: player.sets,
    })),
    vira: game.vira,
    deadRank: jokers.dead,
    wildRank: jokers.wild,
    stockSize: game.stock.length,
    discardTop: game.discard.at(-1) ?? null,
    discardSize: game.discard.length,
    currentPlayerId: game.turn.playerId,
    turnNumber: game.turn.number,
    stage: game.turn.stage,
    moves: trincaMovesOf(game, viewerId),
    winnerId: game.winnerId,
    endReason: game.endReason,
    events: game.events,
  }
}
