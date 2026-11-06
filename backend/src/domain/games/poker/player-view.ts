import type { Card } from "../../cards/card.js"
import { movesOf } from "./betting.js"
import type { PokerMoves } from "./betting.js"
import { contributionsOf, potTotalOf } from "./hand-flow.js"
import { blindsFor, findPlayer, handsUntilBlindsRise, HOLE_CARDS } from "./model.js"
import type {
  Blinds,
  HandSummary,
  PlayerId,
  PlayerStatus,
  PokerEndReason,
  PokerEvent,
  PokerGame,
  Pot,
  Street,
} from "./model.js"
import { buildPots } from "./pots.js"

export interface PokerPublicPlayer {
  readonly id: PlayerId
  readonly nickname: string
  readonly chips: number
  readonly bet: number
  readonly status: PlayerStatus
  readonly holeCount: number
}

export interface PokerView {
  readonly viewerId: PlayerId
  readonly hole: readonly Card[]
  readonly players: readonly PokerPublicPlayer[]
  readonly handNumber: number
  readonly street: Street
  readonly board: readonly Card[]
  readonly buttonId: PlayerId
  readonly smallBlindId: PlayerId
  readonly bigBlindId: PlayerId
  readonly blinds: Blinds
  readonly nextBlinds: Blinds
  readonly handsUntilBlindsRise: number
  readonly pots: readonly Pot[]
  readonly potTotal: number
  readonly currentBet: number
  readonly currentPlayerId: PlayerId
  readonly turnNumber: number
  readonly moves: PokerMoves
  readonly lastHand: HandSummary | null
  readonly eliminatedIds: readonly PlayerId[]
  readonly winnerId: PlayerId | null
  readonly endReason: PokerEndReason | null
  readonly events: readonly PokerEvent[]
}

export const collectedPotsOf = (game: PokerGame): readonly Pot[] =>
  buildPots(contributionsOf(game, (player) => player.committed - player.bet))

export const toPokerView = (game: PokerGame, viewerId: PlayerId): PokerView => {
  const { deal } = game
  return {
    viewerId,
    hole: findPlayer(game, viewerId)?.hole ?? [],
    players: game.players.map((player) => ({
      id: player.id,
      nickname: game.nicknames[player.id] ?? "",
      chips: player.chips,
      bet: player.bet,
      status: player.status,
      holeCount: player.hole.length > 0 ? HOLE_CARDS : 0,
    })),
    handNumber: deal.number,
    street: deal.street,
    board: deal.board,
    buttonId: deal.buttonId,
    smallBlindId: deal.smallBlindId,
    bigBlindId: deal.bigBlindId,
    blinds: deal.blinds,
    nextBlinds: blindsFor(deal.number + handsUntilBlindsRise(deal.number)),
    handsUntilBlindsRise: handsUntilBlindsRise(deal.number),
    pots: collectedPotsOf(game),
    potTotal: potTotalOf(game),
    currentBet: deal.currentBet,
    currentPlayerId: deal.actorId,
    turnNumber: game.step,
    moves: movesOf(game, viewerId),
    lastHand: game.lastHand,
    eliminatedIds: game.eliminatedIds,
    winnerId: game.winnerId,
    endReason: game.endReason,
    events: game.events,
  }
}
