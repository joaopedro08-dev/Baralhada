import { describe, expect, it } from "vitest"
import type { Card } from "../../src/domain/cards/card.js"
import {
  bestHand,
  compareHands,
  HAND_CATEGORIES,
  rankCards,
} from "../../src/domain/games/poker/hand-ranking.js"
import type { RankedHand } from "../../src/domain/games/poker/hand-ranking.js"

const best = (...cards: Card[]) => bestHand(cards)

const winnerOf = (first: readonly Card[], second: readonly Card[]) => {
  const difference = compareHands(bestHand(first), bestHand(second))
  return difference > 0 ? "primeira" : difference < 0 ? "segunda" : "empate"
}

describe("hierarquia das mãos (seção 1)", () => {
  const examples: readonly [string, readonly Card[]][] = [
    ["highCard", ["2C", "5D", "9H", "JS", "KC", "3D", "7S"]],
    ["pair", ["8C", "8D", "2H", "5S", "JC", "KD", "3S"]],
    ["twoPair", ["8C", "8D", "KH", "KS", "2C", "5D", "9S"]],
    ["threeOfAKind", ["7C", "7D", "7H", "2S", "9C", "JD", "KS"]],
    ["straight", ["5C", "6D", "7H", "8S", "9C", "2D", "KS"]],
    ["flush", ["2H", "5H", "9H", "JH", "KH", "3C", "4D"]],
    ["fullHouse", ["7C", "7D", "7H", "8S", "8C", "2D", "KS"]],
    ["fourOfAKind", ["9C", "9D", "9H", "9S", "2C", "5D", "KS"]],
    ["straightFlush", ["5H", "6H", "7H", "8H", "9H", "2C", "KS"]],
    ["royalFlush", ["10S", "JS", "QS", "KS", "AS", "2C", "3D"]],
  ]

  it.each(examples)("reconhece %s entre 7 cartas", (category, cards) => {
    expect(bestHand(cards).category).toBe(category)
  })

  it("ordena os 10 jogos da carta alta ao royal flush", () => {
    const hands = examples.map(([, cards]) => bestHand(cards))
    hands.slice(1).forEach((hand, index) => {
      expect(compareHands(hand, hands[index] as RankedHand)).toBeGreaterThan(0)
    })
    expect(hands.map((hand) => hand.category)).toEqual(HAND_CATEGORIES)
  })

  it("escolhe as 5 cartas que formam o melhor jogo", () => {
    const hand = best("AH", "KH", "2H", "7H", "9H", "AC", "AD")
    expect(hand.category).toBe("flush")
    expect([...hand.cards].sort()).toEqual(["2H", "7H", "9H", "AH", "KH"])
  })

  it("usa a mesa inteira quando ela é o melhor jogo", () => {
    expect(best("2C", "3D", "10H", "JH", "QH", "KH", "AH").category).toBe("royalFlush")
  })
})

describe("A como carta mais alta e mais baixa", () => {
  it("fecha a sequência mais baixa (A, 2, 3, 4, 5)", () => {
    const wheel = best("AC", "2D", "3H", "4S", "5C", "9D", "KS")
    expect(wheel.category).toBe("straight")
    expect(wheel.cards.at(-1)).toBe("AC")
  })

  it("a sequência até o 6 vence a sequência com A baixo", () => {
    expect(winnerOf(["2C", "3D", "4H", "5S", "6C"], ["AC", "2D", "3H", "4S", "5C"])).toBe(
      "primeira"
    )
  })

  it("a sequência até o A vence a até o K", () => {
    expect(winnerOf(["10C", "JD", "QH", "KS", "AC"], ["9C", "10D", "JH", "QS", "KC"])).toBe(
      "primeira"
    )
  })

  it("não dá a volta: Q, K, A, 2, 3 não é sequência", () => {
    expect(rankCards(["QC", "KD", "AH", "2S", "3C"]).category).toBe("highCard")
  })

  it("straight flush com A baixo não é royal", () => {
    expect(rankCards(["AH", "2H", "3H", "4H", "5H"]).category).toBe("straightFlush")
  })
})

describe("PK-RN-14 kicker e empate", () => {
  it("par igual: decide o kicker mais alto", () => {
    expect(
      winnerOf(
        ["8C", "8D", "AH", "5S", "3C", "2D", "9S"],
        ["8H", "8S", "KH", "5D", "3D", "2C", "9C"]
      )
    ).toBe("primeira")
  })

  it("dois pares iguais: decide a quinta carta", () => {
    expect(winnerOf(["KC", "KD", "8H", "8S", "QC"], ["KH", "KS", "8C", "8D", "JC"])).toBe(
      "primeira"
    )
  })

  it("dois pares: o par mais alto vale antes do segundo", () => {
    expect(winnerOf(["AC", "AD", "2H", "2S", "3C"], ["KH", "KS", "QC", "QD", "JC"])).toBe(
      "primeira"
    )
  })

  it("full house: a trinca decide antes do par", () => {
    expect(winnerOf(["9C", "9D", "9H", "2S", "2C"], ["8C", "8D", "8H", "AS", "AC"])).toBe(
      "primeira"
    )
  })

  it("flush: compara carta por carta", () => {
    expect(winnerOf(["AH", "JH", "9H", "5H", "3H"], ["AS", "JS", "9S", "5S", "2S"])).toBe(
      "primeira"
    )
  })

  it("quadra: decide o kicker", () => {
    expect(winnerOf(["9C", "9D", "9H", "9S", "KC"], ["9C", "9D", "9H", "9S", "QC"])).toBe(
      "primeira"
    )
  })

  it("o naipe não desempata: jogos iguais empatam", () => {
    expect(winnerOf(["AC", "KD", "9H", "5S", "3C"], ["AD", "KH", "9S", "5C", "3D"])).toBe("empate")
  })

  it("mesa que vale mais que as cartas fechadas empata", () => {
    const board: Card[] = ["10S", "JS", "QS", "KS", "AS"]
    expect(winnerOf([...board, "2C", "3D"], [...board, "4H", "5C"])).toBe("empate")
  })
})

describe("jogo com menos de 5 cartas", () => {
  it("antes do flop só há par ou carta alta", () => {
    expect(best("AC", "AD").category).toBe("pair")
    expect(best("AC", "KD").category).toBe("highCard")
  })

  it("não forma sequência nem flush com 4 cartas", () => {
    expect(rankCards(["2H", "3H", "4H", "5H"]).category).toBe("highCard")
  })

  it("reconhece dois pares e trinca com poucas cartas", () => {
    expect(rankCards(["2H", "2C", "5H", "5D"]).category).toBe("twoPair")
    expect(rankCards(["2H", "2C", "2D"]).category).toBe("threeOfAKind")
    expect(rankCards(["2H", "2C", "2D", "2S"]).category).toBe("fourOfAKind")
  })
})
