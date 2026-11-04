import { describe, expect, it } from "vitest"
import { createFullDeck } from "../../src/domain/cards/card.js"
import { chooseStartingPlayer, startGame } from "../../src/domain/game/setup.js"
import type { Seat } from "../../src/domain/game/setup.js"
import { shuffle } from "../../src/domain/shared/random.js"
import { allCardsOf, seededRandom } from "../support/game-builder.js"

const seats = (count: number): Seat[] =>
  Array.from({ length: count }, (_, index) => ({ id: `p${index}`, nickname: `P${index}` }))

describe("RN-01 quantidade de jogadores", () => {
  it.each([0, 1, 7])("recusa %i jogadores", (count) => {
    const game = startGame(seats(count), "p0", seededRandom(1))
    expect(game).toEqual({ ok: false, error: "INVALID_PLAYER_COUNT" })
  })

  it.each([2, 3, 4, 5, 6])("aceita %i jogadores", (count) => {
    expect(startGame(seats(count), "p0", seededRandom(1)).ok).toBe(true)
  })
})

describe("RN-02 distribuição", () => {
  it.each([
    [2, 34],
    [6, 18],
  ])("com %i jogadores deixa %i no monte", (count, deckSize) => {
    const game = startGame(seats(count), "p0", seededRandom(7))
    if (!game.ok) throw new Error(game.error)

    expect(game.value.deck).toHaveLength(deckSize)
    expect(game.value.table).toHaveLength(10)
    expect(game.value.players.every((player) => player.hand.length === 4)).toBe(true)
    expect(new Set(allCardsOf(game.value)).size).toBe(52)
  })
})

describe("RN-03 quem começa", () => {
  it("sorteia na primeira partida", () => {
    const starters = new Set(
      Array.from({ length: 50 }, (_, seed) =>
        chooseStartingPlayer(seats(4), null, seededRandom(seed))
      )
    )
    expect(starters.size).toBe(4)
  })

  it("passa para a direita de quem começou a anterior", () => {
    expect(chooseStartingPlayer(seats(3), "p0", seededRandom(1))).toBe("p1")
    expect(chooseStartingPlayer(seats(3), "p2", seededRandom(1))).toBe("p0")
  })

  it("sorteia de novo se quem começou saiu da sala", () => {
    const starter = chooseStartingPlayer(seats(3), "ausente", seededRandom(2))
    expect(seats(3).map((seat) => seat.id)).toContain(starter)
  })
})

describe("RNF-05 embaralhamento", () => {
  it("não mostra viés por posição no teste qui-quadrado", () => {
    const deck = createFullDeck()
    const runs = 20_000
    const random = seededRandom(2026)
    const hits = new Array<number>(deck.length).fill(0)

    for (let run = 0; run < runs; run++) {
      const position = shuffle(deck, random).indexOf("AC")
      hits[position] = (hits[position] ?? 0) + 1
    }

    const expected = runs / deck.length
    const chiSquare = hits.reduce((sum, hit) => sum + (hit - expected) ** 2 / expected, 0)
    const criticalValueFor51DegreesAtP001 = 87.97
    expect(chiSquare).toBeLessThan(criticalValueFor51DegreesAtP001)
  })

  it("mantém todas as cartas sem alterar a original", () => {
    const deck = createFullDeck()
    const shuffled = shuffle(deck, seededRandom(3))
    expect(shuffled).not.toEqual(deck)
    expect([...shuffled].sort()).toEqual([...deck].sort())
  })
})
