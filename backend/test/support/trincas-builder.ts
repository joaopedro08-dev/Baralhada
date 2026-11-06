import type { Card } from "../../src/domain/cards/card.js"
import type { CardSet, TrincaGame, TrincaTurn } from "../../src/domain/games/tres-trincas/model.js"

interface TrincaPlayerSpec {
  readonly hand?: readonly Card[]
  readonly sets?: readonly CardSet[]
}

interface TrincaSpec {
  readonly players: Readonly<Record<string, TrincaPlayerSpec>>
  readonly vira?: Card
  readonly stock?: readonly Card[]
  readonly discard?: readonly Card[]
  readonly turn?: Partial<TrincaTurn>
}

export const buildTrincas = (spec: TrincaSpec): TrincaGame => {
  const ids = Object.keys(spec.players)
  return {
    nicknames: Object.fromEntries(ids.map((id) => [id, id.toUpperCase()])),
    players: ids.map((id) => ({
      id,
      hand: spec.players[id]?.hand ?? [],
      sets: spec.players[id]?.sets ?? [],
    })),
    vira: spec.vira ?? "5C",
    stock: spec.stock ?? ["AC", "AD", "AH", "AS", "KC", "KD"],
    discard: spec.discard ?? [],
    turn: { number: 1, playerId: ids[0] as string, stage: "start", ...spec.turn },
    events: [],
    endReason: null,
    winnerId: null,
  }
}

export const allTrincaCards = (game: TrincaGame): readonly Card[] => [
  ...game.players.flatMap((player) => [...player.hand, ...player.sets.flat()]),
  ...game.stock,
  ...game.discard,
  game.vira,
]
