import type { Card } from "../../src/domain/cards/card.js"
import type {
  BlackjackGame,
  BlackjackTurn,
  Dealer,
  Hand,
  Phase,
  SeatStatus,
} from "../../src/domain/games/blackjack/model.js"

interface SeatSpec {
  readonly chips?: number
  readonly bet?: number | null
  readonly insurance?: boolean | null
  readonly hands?: readonly Hand[]
  readonly status?: SeatStatus
}

interface BlackjackSpec {
  readonly players: Readonly<Record<string, SeatSpec>>
  readonly phase?: Phase
  readonly round?: number
  readonly deck?: readonly Card[]
  readonly dealer?: Partial<Dealer>
  readonly turn?: Partial<BlackjackTurn>
}

export const hand = (cards: readonly Card[], bet = 100, changes: Partial<Hand> = {}): Hand => ({
  cards,
  bet,
  doubled: false,
  fromSplit: false,
  done: false,
  ...changes,
})

export const buildBlackjack = (spec: BlackjackSpec): BlackjackGame => {
  const ids = Object.keys(spec.players)
  const phase = spec.phase ?? "playing"
  return {
    nicknames: Object.fromEntries(ids.map((id) => [id, id.toUpperCase()])),
    players: ids.map((id) => ({
      id,
      chips: spec.players[id]?.chips ?? 900,
      bet: spec.players[id]?.bet ?? (phase === "betting" ? null : 100),
      insurance: spec.players[id]?.insurance ?? null,
      hands: spec.players[id]?.hands ?? [],
      status: spec.players[id]?.status ?? "playing",
    })),
    round: spec.round ?? 1,
    phase,
    deck: spec.deck ?? ["2C", "3C", "4C", "5C", "6C"],
    dealer: { cards: ["10S", "7H"], revealed: false, ...spec.dealer },
    turn: {
      number: 5,
      playerId: phase === "playing" ? (ids[0] ?? null) : null,
      handIndex: 0,
      ...spec.turn,
    },
    lastRound: null,
    events: [],
    endReason: null,
    winnerIds: [],
  }
}

export const cardsInPlay = (game: BlackjackGame): readonly Card[] => [
  ...game.players.flatMap((seat) => seat.hands.flatMap((held) => held.cards)),
  ...game.dealer.cards,
  ...game.deck,
]
