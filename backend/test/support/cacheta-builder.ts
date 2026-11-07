import type { Card } from "../../src/domain/cards/card.js"
import type {
  CachetaGame,
  CachetaTurn,
  PlayerStatus,
} from "../../src/domain/games/cacheta/model.js"

interface CachetaPlayerSpec {
  readonly hand?: readonly Card[]
  readonly points?: number
  readonly status?: PlayerStatus
}

interface CachetaSpec {
  readonly players: Readonly<Record<string, CachetaPlayerSpec>>
  readonly vira?: Card
  readonly stock?: readonly Card[]
  readonly discard?: readonly Card[]
  readonly turn?: Partial<CachetaTurn>
  readonly round?: number
}

export const buildCacheta = (spec: CachetaSpec): CachetaGame => {
  const ids = Object.keys(spec.players)
  const first = ids[0] as string
  return {
    nicknames: Object.fromEntries(ids.map((id) => [id, id.toUpperCase()])),
    players: ids.map((id) => ({
      id,
      hand: spec.players[id]?.hand ?? [],
      points: spec.players[id]?.points ?? 10,
      status: spec.players[id]?.status ?? "playing",
    })),
    round: spec.round ?? 1,
    starterId: first,
    vira: spec.vira ?? "5C",
    stock: spec.stock ?? ["AC", "AD", "AH", "AS", "KC", "KD"],
    discard: spec.discard ?? [],
    turn: { number: 1, playerId: first, stage: "start", drawn: null, ...spec.turn },
    pending: null,
    lastRound: null,
    eliminations: [],
    events: [],
    endReason: null,
    winnerId: null,
  }
}

export const allCachetaCards = (game: CachetaGame): readonly Card[] => [
  ...game.players.flatMap((player) => player.hand),
  ...game.stock,
  ...game.discard,
  game.vira,
]
