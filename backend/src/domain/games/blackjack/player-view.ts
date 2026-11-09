import type { Card } from "../../cards/card.js"
import { canDouble, canSplit } from "./actions.js"
import { BET_STEP, findSeat, isFinished, MIN_BET, ROUNDS } from "./model.js"
import type {
  BlackjackEndReason,
  BlackjackEvent,
  BlackjackGame,
  Phase,
  PlayerId,
  RoundResult,
  SeatStatus,
} from "./model.js"
import { scoreOf } from "./scoring.js"

export interface BlackjackHandView {
  readonly cards: readonly Card[]
  readonly bet: number
  readonly doubled: boolean
  readonly fromSplit: boolean
  readonly done: boolean
  readonly total: number
  readonly soft: boolean
}

export interface BlackjackSeatView {
  readonly id: PlayerId
  readonly nickname: string
  readonly chips: number
  readonly bet: number | null
  readonly insurance: boolean | null
  readonly status: SeatStatus
  readonly hands: readonly BlackjackHandView[]
}

export interface DealerView {
  readonly cards: readonly Card[]
  readonly hidden: number
  readonly total: number
  readonly soft: boolean
}

export interface BetRange {
  readonly min: number
  readonly max: number
  readonly step: number
}

export interface BlackjackMoves {
  readonly bet: BetRange | null
  readonly insurance: { readonly cost: number } | null
  readonly hit: boolean
  readonly stand: boolean
  readonly double: boolean
  readonly split: boolean
}

export interface BlackjackView {
  readonly viewerId: PlayerId
  readonly players: readonly BlackjackSeatView[]
  readonly round: number
  readonly rounds: number
  readonly phase: Phase
  readonly dealer: DealerView
  readonly currentPlayerId: PlayerId | null
  readonly handIndex: number
  readonly turnNumber: number
  readonly moves: BlackjackMoves
  readonly lastRound: RoundResult | null
  readonly winnerIds: readonly PlayerId[]
  readonly endReason: BlackjackEndReason | null
  readonly events: readonly BlackjackEvent[]
}

const NO_MOVES: BlackjackMoves = {
  bet: null,
  insurance: null,
  hit: false,
  stand: false,
  double: false,
  split: false,
}

const insuranceMovesOf = (
  game: BlackjackGame,
  seat: BlackjackGame["players"][number],
  viewerId: PlayerId
): BlackjackMoves | null => {
  if (
    game.phase !== "insurance" ||
    game.turn.playerId !== viewerId ||
    seat.insurance !== null
  ) {
    return null
  }
  const cost = Math.floor((seat.bet ?? 0) / 2)
  if (seat.chips < cost) return null
  return { ...NO_MOVES, insurance: { cost } }
}

export const blackjackMovesOf = (game: BlackjackGame, viewerId: PlayerId): BlackjackMoves => {
  const seat = findSeat(game, viewerId)
  if (!seat || isFinished(game) || seat.status !== "playing") return NO_MOVES
  if (game.phase === "betting") {
    if (seat.bet !== null) return NO_MOVES
    return {
      ...NO_MOVES,
      bet: { min: Math.min(MIN_BET, seat.chips), max: seat.chips, step: BET_STEP },
    }
  }
  const insurance = insuranceMovesOf(game, seat, viewerId)
  if (insurance) return insurance
  const hand = seat.hands[game.turn.handIndex]
  if (game.phase !== "playing" || game.turn.playerId !== viewerId || !hand) return NO_MOVES
  return {
    bet: null,
    insurance: null,
    hit: true,
    stand: true,
    double: canDouble(seat, hand),
    split: canSplit(seat, hand),
  }
}

const dealerView = (game: BlackjackGame): DealerView => {
  const cards = game.dealer.revealed ? game.dealer.cards : game.dealer.cards.slice(0, 1)
  return {
    cards,
    hidden: game.dealer.cards.length - cards.length,
    ...scoreOf(cards),
  }
}

export const toBlackjackView = (game: BlackjackGame, viewerId: PlayerId): BlackjackView => ({
  viewerId,
  players: game.players.map((seat) => ({
    id: seat.id,
    nickname: game.nicknames[seat.id] ?? "",
    chips: seat.chips,
    bet: seat.bet,
    insurance: seat.insurance,
    status: seat.status,
    hands: seat.hands.map((hand) => ({ ...hand, ...scoreOf(hand.cards) })),
  })),
  round: game.round,
  rounds: ROUNDS,
  phase: game.phase,
  dealer: dealerView(game),
  currentPlayerId:
    game.phase === "playing" || game.phase === "insurance"
      ? game.turn.playerId
      : null,
  handIndex: game.turn.handIndex,
  turnNumber: game.turn.number,
  moves: blackjackMovesOf(game, viewerId),
  lastRound: game.lastRound,
  winnerIds: game.winnerIds,
  endReason: game.endReason,
  events: game.events,
})
