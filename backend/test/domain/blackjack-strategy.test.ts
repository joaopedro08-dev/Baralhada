import { describe, expect, it } from "vitest"
import type { Card } from "../../src/domain/cards/card.js"
import type { Hand } from "../../src/domain/games/blackjack/model.js"
import { toBlackjackView } from "../../src/domain/games/blackjack/player-view.js"
import { computeBlackjackHints } from "../../src/domain/games/blackjack/strategy.js"
import { buildBlackjack, hand } from "../support/blackjack-builder.js"

const adviceFor = (cards: readonly Card[], up: Card, chips = 900, changes: Partial<Hand> = {}) => {
  const game = buildBlackjack({
    dealer: { cards: [up, "9D"] },
    players: { ana: { chips, hands: [hand(cards, 100, changes)] } },
  })
  return computeBlackjackHints(toBlackjackView(game, "ana")).advice
}

describe("BJ-RF-13 estratégia básica", () => {
  it.each<[readonly Card[], Card, string]>([
    [["10S", "6H"], "10C", "hit"],
    [["10S", "6H"], "5C", "stand"],
    [["5S", "6H"], "6C", "double"],
    [["5S", "4H"], "2C", "hit"],
    [["8S", "8H"], "10C", "split"],
    [["AS", "AH"], "AC", "split"],
    [["10S", "10H"], "6C", "stand"],
    [["QS", "JH"], "6C", "stand"],
    [["KS", "10H"], "5C", "stand"],
    [["AS", "7H"], "9C", "hit"],
    [["AS", "7H"], "8C", "stand"],
    [["AS", "7H"], "4C", "double"],
    [["AS", "8H"], "6C", "stand"],
    [["10S", "2H"], "3C", "hit"],
    [["10S", "2H"], "4C", "stand"],
  ])("%j contra %s: %s", (cards, up, play) => {
    expect(adviceFor(cards, up)?.play).toBe(play)
  })

  it("sem fichas para dobrar, pede (ou para com 18 macio)", () => {
    expect(adviceFor(["5S", "6H"], "6C", 0)?.play).toBe("hit")
    expect(adviceFor(["AS", "7H"], "4C", 0)?.play).toBe("stand")
  })

  it("sem poder dividir, joga o par como soma", () => {
    expect(adviceFor(["8S", "8H"], "10C", 0)?.play).toBe("hit")
  })

  it("usa só a própria mão e a carta aberta da banca", () => {
    expect(adviceFor(["10S", "6H"], "10C")).toMatchObject({
      dealerUp: "10C",
      total: 16,
      soft: false,
    })
  })

  it("não dá dica fora da vez", () => {
    const game = buildBlackjack({
      players: { ana: { hands: [hand(["10S", "6H"])] }, beto: { hands: [hand(["2S", "3H"])] } },
    })
    expect(computeBlackjackHints(toBlackjackView(game, "beto")).advice).toBeNull()
  })
})
