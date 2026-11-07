import { describe, expect, it } from "vitest"

import {
  describeJoker,
  describeNextStep,
  describeResult,
  describeTurn,
  explainEnd,
  knockTitle,
  meldTitle,
  roundResultOf,
  standingsOf,
} from "@/lib/game/domain/cacheta/guide"
import { arrangeHand, slotsOf } from "@/lib/game/domain/cacheta/hand"
import { buildCacheta } from "@/lib/game/domain/cacheta/test-fixtures"
import type { RoundResult } from "@/lib/game/domain/cacheta/types"

const RESULT: RoundResult = {
  round: 1,
  knockerId: "beto",
  melds: [
    { kind: "trinca", cards: ["7H", "7C", "6D"], jokers: [false, false, true] },
  ],
  discard: "KC",
  clean: false,
  losses: [{ playerId: "eu", before: 10, after: 9 }],
  eliminatedIds: [],
}

describe("CA-RF-02 vez e próximo passo", () => {
  it("diz de quem é a vez", () => {
    expect(describeTurn(buildCacheta(), "eu")).toBe("Sua vez")
    expect(describeTurn(buildCacheta({ currentPlayerId: "beto" }), "eu")).toBe(
      "Vez de Beto"
    )
  })

  it("explica o que fazer em cada momento da vez", () => {
    expect(describeNextStep(buildCacheta(), "eu")).toBe(
      "Compre uma carta do monte."
    )
    const withDiscard = { draw: true, take: true, discard: false, knock: false }
    expect(describeNextStep(buildCacheta({ moves: withDiscard }), "eu")).toBe(
      "Compre do monte ou pegue a carta do descarte."
    )
    const drawn = { draw: false, take: false, discard: true, knock: true }
    expect(describeNextStep(buildCacheta({ moves: drawn }), "eu")).toMatch(
      /^Toque numa carta para descartar/
    )
    expect(
      describeNextStep(buildCacheta({ currentPlayerId: "beto" }), "eu")
    ).toBe("Aguarde a vez de Beto.")
    expect(describeNextStep(buildCacheta({ pending: "nextRound" }), "eu")).toBe(
      "Nova rodada em instantes..."
    )
  })

  it("avisa quem foi eliminado que agora só assiste", () => {
    const game = buildCacheta({
      currentPlayerId: "beto",
      players: [
        { id: "eu", nickname: "Ana", handSize: 0, points: 0, status: "out" },
        {
          id: "beto",
          nickname: "Beto",
          handSize: 9,
          points: 4,
          status: "playing",
        },
      ],
    })
    expect(describeNextStep(game, "eu")).toBe(
      "Você foi eliminado e agora assiste à partida."
    )
  })

  it("mostra o coringa", () => {
    expect(describeJoker(buildCacheta())).toBe("Coringa: 6")
    expect(describeJoker(buildCacheta({ wildRank: "A" }))).toBe("Coringa: Ás")
  })
})

describe("CA-RF-06 e CA-RF-08 resultado da batida", () => {
  it("só mostra a batida enquanto a rodada fecha ou no fim", () => {
    expect(roundResultOf(buildCacheta({ lastRound: RESULT }))).toBeNull()
    expect(
      roundResultOf(buildCacheta({ lastRound: RESULT, pending: "nextRound" }))
    ).toBe(RESULT)
    expect(
      roundResultOf(buildCacheta({ lastRound: RESULT, endReason: "knockout" }))
    ).toBe(RESULT)
    expect(
      roundResultOf(
        buildCacheta({ lastRound: RESULT, round: 2, pending: "nextRound" })
      )
    ).toBeNull()
    expect(
      describeTurn(
        buildCacheta({ lastRound: RESULT, pending: "nextRound" }),
        "eu"
      )
    ).toBe("Resultado da rodada")
  })

  it("dá nome aos jogos e à batida", () => {
    expect(meldTitle(RESULT.melds[0]!)).toBe("Trinca de 7")
    expect(
      meldTitle({
        kind: "trinca",
        cards: ["KS", "KD", "6C"],
        jokers: [false, false, true],
      })
    ).toBe("Trinca de reis")
    expect(
      meldTitle({
        kind: "sequencia",
        cards: ["6C", "5H", "6H"],
        jokers: [true, false, false],
      })
    ).toBe("Sequência de copas")
    expect(knockTitle(RESULT)).toBe("Bateu")
    expect(knockTitle({ ...RESULT, clean: true })).toBe("Bateu limpo")
  })
})

describe("CA-RF-09 fim da partida", () => {
  const game = buildCacheta({
    winnerId: "caio",
    endReason: "knockout",
    round: 7,
    eliminations: ["beto", "eu"],
    players: [
      { id: "eu", nickname: "Ana", handSize: 9, points: 0, status: "out" },
      { id: "beto", nickname: "Beto", handSize: 0, points: 0, status: "left" },
      {
        id: "caio",
        nickname: "Caio",
        handSize: 9,
        points: 3,
        status: "playing",
      },
    ],
  })

  it("ordena pelo vencedor e depois pela eliminação mais tardia", () => {
    expect(standingsOf(game).map((player) => player.id)).toEqual([
      "caio",
      "eu",
      "beto",
    ])
  })

  it("explica o resultado", () => {
    expect(describeResult(game, "eu")).toBe("Caio venceu")
    expect(describeResult(game, "caio")).toBe("Você venceu!")
    expect(explainEnd(game)).toBe(
      "Foi o último com pontos depois de 7 rodadas."
    )
    expect(explainEnd({ ...game, endReason: "abandoned" })).toBe(
      "Os outros jogadores saíram, e a partida terminou."
    )
  })
})

describe("CA-RF-05 organizar a mão", () => {
  it("dá uma chave para cada cópia da mesma carta", () => {
    expect(slotsOf(["7H", "2C", "7H"]).map((slot) => slot.key)).toEqual([
      "7H-0",
      "2C-0",
      "7H-1",
    ])
  })

  it("ordena por naipe e deixa os coringas no fim", () => {
    const groups = arrangeHand(["7H", "2S", "6C", "4S", "AH"], "naipe", "6")
    expect(groups.map((group) => group.key)).toEqual(["S", "H", "coringas"])
    expect(
      groups.flatMap((group) => group.slots.map((slot) => slot.card))
    ).toEqual(["2S", "4S", "AH", "7H", "6C"])
  })

  it("ordena por valor", () => {
    const groups = arrangeHand(["KD", "7H", "7C", "AS"], "valor", "6")
    expect(groups.map((group) => group.key)).toEqual(["A", "7", "K"])
  })

  it("junta os jogos prontos quando há dicas", () => {
    const groups = arrangeHand(["2S", "7H", "KC", "7C", "7D"], "jogos", "6", [
      {
        kind: "trinca",
        cards: ["7H", "7C", "7D"],
        jokers: [false, false, false],
      },
    ])
    expect(groups[0]).toMatchObject({ kind: "meld", key: "jogo-0" })
    expect(groups[0]?.slots.map((slot) => slot.card)).toEqual([
      "7H",
      "7C",
      "7D",
    ])
    expect(
      groups.slice(1).flatMap((group) => group.slots.map((slot) => slot.card))
    ).toEqual(["2S", "KC"])
  })
})
