import type { Card } from "../cards/card.js"
import { findPlayer, HAND_SIZE, isFinished } from "./model.js"
import type { Game, GameEndReason, GameEvent, Meld, PlayerId, TurnActionKind } from "./model.js"

export interface PublicPlayer {
  readonly id: PlayerId
  readonly nickname: string
  readonly handSize: number
  readonly melds: readonly Meld[]
}

export interface PlayerView {
  readonly viewerId: PlayerId
  readonly hand: readonly Card[]
  readonly table: readonly Card[]
  readonly deckSize: number
  readonly players: readonly PublicPlayer[]
  readonly currentPlayerId: PlayerId
  readonly turnNumber: number
  readonly usedActions: readonly TurnActionKind[]
  readonly canEndTurn: boolean
  readonly endReason: GameEndReason | null
  readonly winnerIds: readonly PlayerId[]
  readonly events: readonly GameEvent[]
}

export const toPlayerView = (game: Game, viewerId: PlayerId): PlayerView => {
  const hand = findPlayer(game, viewerId)?.hand ?? []
  const isViewerTurn = game.turn.playerId === viewerId
  return {
    viewerId,
    hand,
    table: game.table,
    deckSize: game.deck.length,
    players: game.players.map((player) => ({
      id: player.id,
      nickname: game.nicknames[player.id] ?? "",
      handSize: player.hand.length,
      melds: player.melds,
    })),
    currentPlayerId: game.turn.playerId,
    turnNumber: game.turn.number,
    usedActions: game.turn.usedActions,
    canEndTurn:
      isViewerTurn && !isFinished(game) && (game.deck.length === 0 || hand.length <= HAND_SIZE),
    endReason: game.endReason,
    winnerIds: game.winnerIds,
    events: game.events,
  }
}
