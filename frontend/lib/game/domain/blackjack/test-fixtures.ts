import type {
  BlackjackHand,
  BlackjackState,
} from "@/lib/game/domain/blackjack/types"

export const bjHand = (
  changes: Partial<BlackjackHand> = {}
): BlackjackHand => ({
  cards: ["10S", "6H"],
  bet: 100,
  doubled: false,
  fromSplit: false,
  done: false,
  total: 16,
  soft: false,
  ...changes,
})

export const buildBlackjack = (
  changes: Partial<BlackjackState> = {}
): BlackjackState => ({
  kind: "blackjack",
  players: [
    {
      id: "eu",
      nickname: "Ana",
      chips: 900,
      bet: 100,
      status: "playing",
      hands: [bjHand()],
    },
    {
      id: "beto",
      nickname: "Beto",
      chips: 950,
      bet: 50,
      status: "playing",
      hands: [bjHand({ cards: ["9S", "9H"], total: 18, bet: 50 })],
    },
  ],
  round: 3,
  rounds: 10,
  phase: "playing",
  dealer: { cards: ["10C"], hidden: 1, total: 10, soft: false },
  currentPlayerId: "eu",
  handIndex: 0,
  turnNumber: 7,
  moves: {
    bet: null,
    insurance: null,
    hit: true,
    stand: true,
    double: true,
    split: false,
  },
  lastRound: null,
  winnerIds: [],
  endReason: null,
  history: [],
  ...changes,
})
