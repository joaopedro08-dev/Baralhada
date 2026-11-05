import type { Card } from "../../src/domain/cards/card.js"
import type { Game, GamePlayer, Turn } from "../../src/domain/games/rouba-monte/model.js"
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

interface PlayerSpec {
  readonly hand?: readonly Card[]
  readonly pile?: readonly Card[]
}

interface GameSpec {
  readonly players: Readonly<Record<string, PlayerSpec>>
  readonly deck?: readonly Card[]
  readonly table?: readonly Card[]
  readonly turn?: Partial<Turn>
}

export const buildGame = (spec: GameSpec): Game => {
  const ids = Object.keys(spec.players)
  const players: GamePlayer[] = ids.map((id) => ({
    id,
    hand: spec.players[id]?.hand ?? [],
    pile: spec.players[id]?.pile ?? [],
  }))
  return {
    nicknames: Object.fromEntries(ids.map((id) => [id, id.toUpperCase()])),
    players,
    deck: spec.deck ?? ["KC", "KD", "KH", "KS", "QC", "QD", "QH", "QS"],
    table: spec.table ?? ["9C", "9D", "9H", "8C"],
    turn: { number: 1, playerId: ids[0] as string, drew: false, ...spec.turn },
    events: [],
    endReason: null,
    winnerIds: [],
  }
}

export const allCardsOf = (game: Game): readonly Card[] => [
  ...game.deck,
  ...game.table,
  ...game.players.flatMap((player) => [...player.hand, ...player.pile]),
]

export const unwrap = <T>(result: { ok: true; value: T } | { ok: false; error: string }): T => {
  if (!result.ok) throw new Error(result.error)
  return result.value
}
