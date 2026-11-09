import type { GameId, Suit } from "@/lib/game/domain/types"

export interface GameIdentity {
  readonly suit: Suit
  readonly short: string
  readonly accent: string
  readonly glow: string
  readonly ring: string
}

export const GAME_IDENTITY: Readonly<Record<GameId, GameIdentity>> = {
  "rouba-monte": {
    suit: "C",
    short: "Rouba Monte",
    accent: "text-gold",
    glow: "from-gold/30",
    ring: "ring-gold/60",
  },
  "truco-paulista": {
    suit: "H",
    short: "Truco",
    accent: "text-rose-300",
    glow: "from-rose-500/30",
    ring: "ring-rose-300/60",
  },
  "tres-trincas": {
    suit: "D",
    short: "Três Trincas",
    accent: "text-sky-300",
    glow: "from-sky-500/30",
    ring: "ring-sky-300/60",
  },
  "poker-texas-holdem": {
    suit: "S",
    short: "Poker",
    accent: "text-violet-300",
    glow: "from-violet-500/30",
    ring: "ring-violet-300/60",
  },
  cacheta: {
    suit: "C",
    short: "Cacheta",
    accent: "text-emerald-300",
    glow: "from-emerald-500/30",
    ring: "ring-emerald-300/60",
  },
  blackjack: {
    suit: "S",
    short: "Blackjack",
    accent: "text-amber-300",
    glow: "from-amber-500/30",
    ring: "ring-amber-300/60",
  },
}

export const identityOf = (gameId: GameId): GameIdentity =>
  GAME_IDENTITY[gameId]
