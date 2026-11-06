import type { Card } from "../../src/domain/cards/card.js"
import { manilhaOf } from "../../src/domain/games/truco/cards.js"
import type { Hand, Scores, TeamIndex, TrucoGame } from "../../src/domain/games/truco/model.js"

interface TrucoPlayerSpec {
  readonly team: TeamIndex
  readonly hand?: readonly Card[]
}

interface TrucoSpec {
  readonly players: Readonly<Record<string, TrucoPlayerSpec>>
  readonly vira?: Card
  readonly scores?: Scores
  readonly hand?: Partial<Hand>
}

export const buildTruco = (spec: TrucoSpec): TrucoGame => {
  const ids = Object.keys(spec.players)
  const first = ids[0] as string
  const vira = spec.vira ?? "4C"
  return {
    nicknames: Object.fromEntries(ids.map((id) => [id, id.toUpperCase()])),
    players: ids.map((id) => ({
      id,
      team: spec.players[id]?.team ?? 0,
      hand: spec.players[id]?.hand ?? [],
    })),
    scores: spec.scores ?? [0, 0],
    hand: {
      number: 1,
      mode: "normal",
      vira,
      manilha: manilhaOf(vira),
      openerId: first,
      roundOpenerId: first,
      currentPlayerId: first,
      table: [],
      rounds: [],
      stake: 1,
      lastRaiserTeam: null,
      request: null,
      elevenDeciderId: null,
      ...spec.hand,
    },
    step: 1,
    events: [],
    lastHand: null,
    lastRound: null,
    winnerTeam: null,
    endReason: null,
  }
}

export const duel = (a: readonly Card[], b: readonly Card[], hand: Partial<Hand> = {}) =>
  buildTruco({ players: { a: { team: 0, hand: a }, b: { team: 1, hand: b } }, hand })

export const foursome = (hands: readonly (readonly Card[])[], hand: Partial<Hand> = {}) =>
  buildTruco({
    players: {
      a: { team: 0, hand: hands[0] ?? [] },
      b: { team: 1, hand: hands[1] ?? [] },
      c: { team: 0, hand: hands[2] ?? [] },
      d: { team: 1, hand: hands[3] ?? [] },
    },
    hand,
  })
