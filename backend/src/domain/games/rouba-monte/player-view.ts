import { rankOf } from "../../cards/card.js"
import type { Card, Rank } from "../../cards/card.js"
import { findPlayer, topOf } from "./model.js"
import type { Game, GameEndReason, GameEvent, PlayerId } from "./model.js"

export interface PublicPlayer {
  readonly id: PlayerId
  readonly nickname: string
  readonly handSize: number
  readonly pileSize: number
  readonly pileTop: Card | null
}

export interface PlayerView {
  readonly viewerId: PlayerId
  readonly hand: readonly Card[]
  readonly table: readonly Card[]
  readonly deckSize: number
  readonly players: readonly PublicPlayer[]
  readonly currentPlayerId: PlayerId
  readonly turnNumber: number
  readonly drewThisTurn: boolean
  readonly endReason: GameEndReason | null
  readonly winnerIds: readonly PlayerId[]
  readonly events: readonly GameEvent[]
}

export const toPlayerView = (game: Game, viewerId: PlayerId): PlayerView => ({
  viewerId,
  hand: findPlayer(game, viewerId)?.hand ?? [],
  table: game.table,
  deckSize: game.deck.length,
  players: game.players.map((player) => ({
    id: player.id,
    nickname: game.nicknames[player.id] ?? "",
    handSize: player.hand.length,
    pileSize: player.pile.length,
    pileTop: topOf(player.pile),
  })),
  currentPlayerId: game.turn.playerId,
  turnNumber: game.turn.number,
  drewThisTurn: game.turn.drew,
  endReason: game.endReason,
  winnerIds: game.winnerIds,
  events: game.events,
})

export const countRanksInPiles = (game: Game): ReadonlyMap<Rank, number> => {
  const counts = new Map<Rank, number>()
  for (const card of game.players.flatMap((player) => player.pile)) {
    const rank = rankOf(card)
    counts.set(rank, (counts.get(rank) ?? 0) + 1)
  }
  return counts
}
