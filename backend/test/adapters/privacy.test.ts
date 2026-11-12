import { describe, expect, it } from "vitest"

import { blackjackAdapter } from "../../src/adapters/socket/games/blackjack/adapter.js"
import { cachetaAdapter } from "../../src/adapters/socket/games/cacheta/adapter.js"
import { pokerAdapter } from "../../src/adapters/socket/games/poker/adapter.js"
import { roubaMonteAdapter } from "../../src/adapters/socket/games/rouba-monte/adapter.js"
import { tresTrincasAdapter } from "../../src/adapters/socket/games/tres-trincas/adapter.js"
import { trucoAdapter } from "../../src/adapters/socket/games/truco/adapter.js"
import type { GameAdapter } from "../../src/adapters/socket/game-adapter.js"
import { blackjackRules } from "../../src/domain/games/blackjack/rules.js"
import { cachetaRules } from "../../src/domain/games/cacheta/rules.js"
import { pokerRules } from "../../src/domain/games/poker/rules.js"
import { roubaMonteRules } from "../../src/domain/games/rouba-monte/rules.js"
import { tresTrincasRules } from "../../src/domain/games/tres-trincas/rules.js"
import { trucoRules } from "../../src/domain/games/truco/rules.js"
import type { AnyGameRules } from "../../src/domain/room/game-rules.js"
import type { RandomSource } from "../../src/domain/shared/random.js"
import type { Seat } from "../../src/domain/shared/seat.js"
import { seededRandom, unwrap } from "../support/game-builder.js"

interface HiddenCardsCase {
  readonly name: string
  readonly rules: AnyGameRules
  readonly adapter: GameAdapter
  readonly playerCount: number
  readonly hiddenOf: (game: Record<string, unknown>, viewerId: string) => readonly string[]
  readonly orderOf: (game: Record<string, unknown>) => readonly string[]
  readonly publicOf?: (game: Record<string, unknown>) => readonly string[]
}

const playersOf = (count: number, teams = false): readonly Seat[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    nickname: `P${index}`,
    team: teams ? index % 2 : null,
  }))

const startOf = (rules: AnyGameRules, count: number, random: RandomSource): Record<string, unknown> =>
  unwrap(rules.start(playersOf(count, rules.id === "truco-paulista"), "p0", random)) as Record<
    string,
    unknown
  >

const cardsOf = (value: unknown): readonly string[] =>
  Array.isArray(value) ? value.filter((card): card is string => typeof card === "string") : []

const playersHiddenOf = (game: Record<string, unknown>, viewerId: string): readonly string[] => {
  const players = Array.isArray(game.players) ? game.players : []
  return players.flatMap((player) => {
    if (!player || typeof player !== "object") return []
    const record = player as Record<string, unknown>
    if (record.id === viewerId) return []
    const hands = Array.isArray(record.hands)
      ? record.hands.flatMap((hand) =>
          hand && typeof hand === "object"
            ? cardsOf((hand as Record<string, unknown>).cards)
            : []
        )
      : []
    return [...cardsOf(record.hand ?? record.hole), ...hands]
  })
}

const cases: readonly HiddenCardsCase[] = [
  {
    name: "Rouba Monte",
    rules: roubaMonteRules,
    adapter: roubaMonteAdapter,
    playerCount: 3,
    hiddenOf: (game, viewerId) => [
      ...cardsOf(game.deck),
      ...playersHiddenOf(game, viewerId),
    ],
    orderOf: (game) => cardsOf(game.deck),
  },
  {
    name: "Truco Paulista",
    rules: trucoRules,
    adapter: trucoAdapter,
    playerCount: 4,
    hiddenOf: (game, viewerId) => playersHiddenOf(game, viewerId),
    orderOf: (game) => cardsOf((game.hand as Record<string, unknown>).table),
  },
  {
    name: "Três Trincas",
    rules: tresTrincasRules,
    adapter: tresTrincasAdapter,
    playerCount: 3,
    hiddenOf: (game, viewerId) => [
      ...cardsOf(game.stock),
      ...playersHiddenOf(game, viewerId),
    ],
    orderOf: (game) => cardsOf(game.stock),
  },
  {
    name: "Poker Texas Hold'em",
    rules: pokerRules,
    adapter: pokerAdapter,
    playerCount: 3,
    hiddenOf: (game, viewerId) => [
      ...cardsOf((game.deal as Record<string, unknown>).deck),
      ...playersHiddenOf(game, viewerId),
    ],
    orderOf: (game) => cardsOf((game.deal as Record<string, unknown>).deck),
  },
  {
    name: "Cacheta",
    rules: cachetaRules,
    adapter: cachetaAdapter,
    playerCount: 3,
    hiddenOf: (game, viewerId) => [
      ...cardsOf(game.stock),
      ...playersHiddenOf(game, viewerId),
    ],
    orderOf: (game) => cardsOf(game.stock),
    publicOf: (game) => [game.vira as string, ...cardsOf(game.discard)],
  },
  {
    name: "Blackjack",
    rules: blackjackRules,
    adapter: blackjackAdapter,
    playerCount: 3,
    hiddenOf: (game, viewerId) => [
      ...cardsOf(game.deck),
      ...cardsOf((game.dealer as Record<string, unknown>).cards).slice(1),
      ...playersHiddenOf(game, viewerId),
    ],
    orderOf: (game) => cardsOf(game.deck),
  },
]

describe("privacidade das visões dos jogos", () => {
  it.each(cases)("$name não envia cartas privadas de outro jogador", (gameCase) => {
    const game = startOf(gameCase.rules, gameCase.playerCount, seededRandom(2026))
    for (const viewerId of playersOf(gameCase.playerCount).map((player) => player.id)) {
      const view = gameCase.adapter.presenter(game)(viewerId)
      const serialized = JSON.stringify(view)
      const hidden = gameCase.hiddenOf(game, viewerId)
      const own = cardsOf(
        (game.players as readonly Record<string, unknown>[]).find(
          (player) => player.id === viewerId
        )?.hand
      )
      const publicCards = gameCase.publicOf?.(game) ?? []

      for (const card of new Set(hidden.filter((card) => !own.includes(card)))) {
        const visibleCount = serialized.split(`"${card}"`).length - 1
        const allowedCount = publicCards.filter((publicCard) => publicCard === card).length
        expect(visibleCount).toBeLessThanOrEqual(allowedCount)
      }
    }
  })

  it.each(cases)("$name não envia a ordem do baralho oculto", (gameCase) => {
    const game = startOf(gameCase.rules, gameCase.playerCount, seededRandom(2027))
    const order = gameCase.orderOf(game).slice(0, 3)

    for (const viewerId of playersOf(gameCase.playerCount).map((player) => player.id)) {
      const view = gameCase.adapter.presenter(game)(viewerId)
      expect(view).not.toHaveProperty("deck")
      expect(view).not.toHaveProperty("stock")
      if (order.length >= 2) expect(JSON.stringify(view)).not.toContain(order.join(","))
    }
  })
})
