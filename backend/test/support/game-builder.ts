import { rankOf } from "../../src/domain/cards/card.js"
import type { Card } from "../../src/domain/cards/card.js"
import type { Game, GamePlayer, Meld, Turn } from "../../src/domain/games/rouba-monte/model.js"
import type { RandomSource } from "../../src/domain/shared/random.js"

export const seededRandom = (seed: number): RandomSource => {
  let state = seed >>> 0
  return {
    nextInt: (maxExclusive) => {
      state = (state + 0x6d2b79f5) >>> 0
      let mixed = Math.imul(state ^ (state >>> 15), state | 1)
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61)
      return Math.floor((((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296) * maxExclusive)
    },
  }
}

export const meldOf = (...cards: Card[]): Meld => ({ rank: rankOf(cards[0] as Card), cards })

export const quadOf = (rank: string): Meld =>
  meldOf(...(["C", "D", "H", "S"].map((suit) => `${rank}${suit}`) as Card[]))

interface PlayerSpec {
  readonly hand?: readonly Card[]
  readonly melds?: readonly Meld[]
}

interface GameSpec {
  readonly players: Readonly<Record<string, PlayerSpec>>
  readonly deck?: readonly Card[]
  readonly table?: readonly Card[]
  readonly current?: string
  readonly turn?: Partial<Turn>
}

export const buildGame = (spec: GameSpec): Game => {
  const ids = Object.keys(spec.players)
  const players: GamePlayer[] = ids.map((id) => ({
    id,
    hand: spec.players[id]?.hand ?? [],
    melds: spec.players[id]?.melds ?? [],
  }))
  return {
    nicknames: Object.fromEntries(ids.map((id) => [id, id.toUpperCase()])),
    players,
    deck: spec.deck ?? ["KC", "KD", "KH", "KS", "QC", "QD", "QH", "QS"],
    table: spec.table ?? ["9C", "9D", "9H", "9S", "8C"],
    turn: {
      number: 1,
      playerId: spec.current ?? (ids[0] as string),
      usedActions: [],
      ...spec.turn,
    },
    events: [],
    endReason: null,
    winnerIds: [],
  }
}

export const allCardsOf = (game: Game): readonly Card[] => [
  ...game.deck,
  ...game.table,
  ...game.players.flatMap((player) => [
    ...player.hand,
    ...player.melds.flatMap((meld) => meld.cards),
  ]),
]
