import { describe, expect, it } from "vitest"
import type { Card } from "../../src/domain/cards/card.js"
import {
  arrangeAll,
  bestCover,
  findKnock,
  jokerCount,
  knockWith,
  meldOf,
  wildRankFor,
} from "../../src/domain/games/cacheta/melds.js"

const WILD = wildRankFor("5C")

describe("CA-RN-04 coringa pelo vira", () => {
  it.each<[Card, string]>([
    ["5C", "6"],
    ["10H", "J"],
    ["QS", "K"],
    ["KD", "A"],
    ["AH", "2"],
  ])("com o vira %s, o coringa é %s", (vira, wild) => {
    expect(wildRankFor(vira)).toBe(wild)
  })
})

describe("CA-RN-07 trinca", () => {
  it("aceita 3 e 4 cartas do mesmo valor com naipes diferentes", () => {
    expect(meldOf(["7H", "7C", "7D"], WILD)).toMatchObject({ kind: "trinca" })
    expect(meldOf(["7H", "7C", "7D", "7S"], WILD)).toMatchObject({ kind: "trinca" })
  })

  it("recusa naipe repetido, valores diferentes e menos de 3 cartas", () => {
    expect(meldOf(["7H", "7H", "7C"], WILD)).toBeNull()
    expect(meldOf(["7H", "8C", "7D"], WILD)).toBeNull()
    expect(meldOf(["7H", "7C"], WILD)).toBeNull()
  })

  it("forma trinca com o próprio valor do coringa, sem gastar coringa", () => {
    const meld = meldOf(["6S", "6D", "6H"], WILD)
    expect(meld?.kind).toBe("trinca")
    expect(meld && jokerCount(meld)).toBe(0)
  })
})

describe("CA-RN-08 sequência", () => {
  it.each<readonly Card[]>([
    ["4S", "5S", "6S"],
    ["AH", "2H", "3H"],
    ["QH", "KH", "AH"],
    ["10H", "JH", "QH", "KH", "AH"],
    ["9D", "10D", "JD", "QD", "KD", "8D", "7D"],
  ])("aceita %j", (...cards) => {
    expect(meldOf(cards, WILD)).toMatchObject({ kind: "sequencia" })
  })

  it.each<readonly Card[]>([
    ["KH", "AH", "2H"],
    ["4S", "5H", "7S"],
    ["4S", "4S", "5S"],
    ["4S", "5S", "8S"],
  ])("recusa %j", (...cards) => {
    expect(meldOf(cards, WILD)).toBeNull()
  })

  it("põe as cartas em ordem e o coringa no buraco", () => {
    expect(meldOf(["8S", "4S", "7D", "5S", "6S"], "7")).toEqual({
      kind: "sequencia",
      cards: ["4S", "5S", "6S", "7D", "8S"],
      jokers: [false, false, false, true, false],
    })
  })

  it("o coringa no próprio lugar da sequência conta como carta natural", () => {
    const meld = meldOf(["5S", "6S", "7S"], WILD)
    expect(meld && jokerCount(meld)).toBe(0)
  })
})

describe("CA-RN-09 coringa", () => {
  it("completa trinca e sequência com até 2 coringas", () => {
    expect(meldOf(["7H", "7C", "6S"], WILD)).toEqual({
      kind: "trinca",
      cards: ["7H", "7C", "6S"],
      jokers: [false, false, true],
    })
    expect(meldOf(["7H", "6S", "6D"], WILD)).toMatchObject({ kind: "trinca" })
    expect(meldOf(["2H", "3H", "6C", "6D"], WILD)).toMatchObject({ kind: "sequencia" })
  })

  it("recusa 3 coringas no mesmo jogo", () => {
    expect(meldOf(["7C", "6S", "6D", "6H"], WILD)).toBeNull()
    expect(meldOf(["2H", "6S", "6D", "6C"], WILD)).toBeNull()
  })
})

describe("CA-RN-11 arranjo da mão", () => {
  const hand: readonly Card[] = ["7H", "7C", "7D", "2S", "3S", "4S", "9D", "10D", "JD"]

  it("divide 9 cartas em jogos", () => {
    const arrangement = arrangeAll(hand, WILD)
    expect(arrangement?.melds).toHaveLength(3)
    expect(arrangement?.jokers).toBe(0)
  })

  it("prefere o arranjo que não gasta coringa", () => {
    const arrangement = arrangeAll(["5H", "6H", "7H", "9C", "9D", "9S", "JS", "QS", "KS"], WILD)
    expect(arrangement?.jokers).toBe(0)
  })

  it("acha a batida e o descarte certo", () => {
    expect(knockWith([...hand, "KC"], "KC", WILD)).toMatchObject({ discard: "KC", clean: true })
    expect(knockWith([...hand, "KC"], "7H", WILD)).toBeNull()
    expect(knockWith(hand, "QH", WILD)).toBeNull()
    expect(findKnock([...hand, "KC"], WILD)).toMatchObject({ discard: "KC", clean: true })
  })

  it("batida com coringa não é limpa", () => {
    const dirty: readonly Card[] = ["7H", "7C", "6D", "2S", "3S", "4S", "9D", "10D", "JD", "KC"]
    expect(findKnock(dirty, WILD)).toMatchObject({ discard: "KC", clean: false })
  })

  it("mão que não bate", () => {
    const loose: readonly Card[] = ["7H", "7C", "2S", "3S", "9D", "10D", "JD", "KC", "QH", "4D"]
    expect(findKnock(loose, WILD)).toBeNull()
  })

  it("cobre o máximo de cartas em jogos para destacar", () => {
    const cover = bestCover(["7H", "7C", "7D", "2S", "3S", "KC", "QH"], WILD)
    expect(cover.melds).toEqual([
      { kind: "trinca", cards: ["7H", "7C", "7D"], jokers: [false, false, false] },
    ])
  })
})
