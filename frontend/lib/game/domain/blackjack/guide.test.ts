import { describe, expect, it } from "vitest"

import {
  clampBet,
  dealerLabel,
  describeNextStep,
  describeResult,
  describeTurn,
  explainEnd,
  formatNet,
  handLabel,
  isValidBet,
  resultOf,
  resultsFor,
  roundLabel,
  scoreLabel,
  standingsOf,
} from "@/lib/game/domain/blackjack/guide"
import {
  bjHand,
  buildBlackjack,
} from "@/lib/game/domain/blackjack/test-fixtures"
import type { RoundResult } from "@/lib/game/domain/blackjack/types"

const RESULT: RoundResult = {
  round: 3,
  dealerTotal: 19,
  dealerBlackjack: false,
  dealerBust: false,
  hands: [
    {
      playerId: "eu",
      handIndex: 0,
      outcome: "lose",
      bet: 100,
      net: -100,
      fromSplit: false,
    },
    {
      playerId: "beto",
      handIndex: 0,
      outcome: "push",
      bet: 50,
      net: 0,
      fromSplit: false,
    },
  ],
}

describe("BJ-RF-03 soma da mão", () => {
  it("mostra as duas contas quando há ás", () => {
    expect(scoreLabel(17, true)).toBe("7 ou 17")
    expect(scoreLabel(21, true)).toBe("21")
    expect(scoreLabel(16, false)).toBe("16")
  })

  it("mão parada mostra só o total final", () => {
    expect(
      handLabel(bjHand({ cards: ["AS", "7H"], total: 18, soft: true }))
    ).toBe("8 ou 18")
    expect(
      handLabel(
        bjHand({ cards: ["AS", "7H"], total: 18, soft: true, done: true })
      )
    ).toBe("18")
  })

  it("marca blackjack e estouro", () => {
    expect(
      handLabel(bjHand({ cards: ["AS", "KH"], total: 21, soft: true }))
    ).toBe("Blackjack")
    expect(
      handLabel(
        bjHand({ cards: ["AS", "KH"], total: 21, soft: true, fromSplit: true })
      )
    ).toBe("21")
    expect(handLabel(bjHand({ cards: ["10S", "6H", "9C"], total: 25 }))).toBe(
      "25 · estourou"
    )
  })

  it("mostra o que a banca tem à vista", () => {
    expect(dealerLabel(buildBlackjack())).toBe("Mostra 10")
    expect(
      dealerLabel(
        buildBlackjack({
          dealer: {
            cards: ["10C", "6H", "9D"],
            hidden: 0,
            total: 25,
            soft: false,
          },
        })
      )
    ).toBe("Estourou com 25")
    expect(
      dealerLabel(
        buildBlackjack({
          dealer: { cards: [], hidden: 0, total: 0, soft: false },
        })
      )
    ).toBe("Aguardando as apostas")
  })
})

describe("BJ-RF-01, BJ-RF-04 e BJ-RF-09 vez e rodada", () => {
  it("diz a fase e de quem é a vez", () => {
    expect(describeTurn(buildBlackjack(), "eu")).toBe("Sua vez")
    expect(
      describeTurn(buildBlackjack({ currentPlayerId: "beto" }), "eu")
    ).toBe("Vez de Beto")
    const betting = buildBlackjack({
      phase: "betting",
      currentPlayerId: null,
      moves: {
        bet: { min: 10, max: 900, step: 10 },
        hit: false,
        stand: false,
        double: false,
        split: false,
      },
    })
    expect(describeTurn(betting, "eu")).toBe("Faça sua aposta")
    expect(describeNextStep(betting, "eu")).toBe(
      "Escolha as fichas e aposte antes do tempo acabar."
    )
    expect(describeTurn(buildBlackjack({ phase: "dealer" }), "eu")).toBe(
      "Vez da banca"
    )
    expect(roundLabel(buildBlackjack())).toBe("Rodada 3 de 10")
  })

  it("indica a mão da vez depois de dividir", () => {
    const game = buildBlackjack({
      handIndex: 1,
      players: [
        {
          id: "eu",
          nickname: "Ana",
          chips: 800,
          bet: 100,
          status: "playing",
          hands: [
            bjHand({ fromSplit: true, done: true }),
            bjHand({ fromSplit: true }),
          ],
        },
      ],
    })
    expect(describeNextStep(game, "eu")).toBe(
      "Peça carta ou pare (mão 2 de 2)."
    )
  })

  it("só mostra o resultado na rodada que acabou de fechar", () => {
    expect(resultOf(buildBlackjack({ lastRound: RESULT }))).toBeNull()
    const settled = buildBlackjack({ lastRound: RESULT, phase: "settled" })
    expect(resultOf(settled)).toBe(RESULT)
    expect(resultsFor(settled, "beto").map((entry) => entry.outcome)).toEqual([
      "push",
    ])
  })
})

describe("BJ-RN-07 aposta", () => {
  it("aceita de 10 em 10 ou todas as fichas", () => {
    expect(isValidBet(10, 900)).toBe(true)
    expect(isValidBet(15, 900)).toBe(false)
    expect(isValidBet(25, 25)).toBe(true)
    expect(isValidBet(910, 900)).toBe(false)
    expect(clampBet(1200, 900, 10)).toBe(900)
    expect(clampBet(0, 900, 10)).toBe(10)
  })
})

describe("BJ-RF-10 fim da partida", () => {
  it("mostra o saldo de quem joga sozinho", () => {
    const solo = buildBlackjack({
      endReason: "rounds",
      players: [
        {
          id: "eu",
          nickname: "Ana",
          chips: 1250,
          bet: null,
          status: "playing",
          hands: [],
        },
      ],
      winnerIds: ["eu"],
    })
    expect(describeResult(solo, "eu")).toBe("Você venceu a banca!")
    expect(explainEnd(solo, "eu")).toBe(
      "Saldo final: +250 fichas em relação às 1.000 iniciais."
    )
    expect(formatNet(-40)).toBe("−40")
  })

  it("ordena pelas fichas e trata empate na liderança", () => {
    const game = buildBlackjack({
      endReason: "rounds",
      winnerIds: ["eu", "beto"],
    })
    expect(standingsOf(game).map((seat) => seat.id)).toEqual(["beto", "eu"])
    expect(describeResult(game, "eu")).toBe("Você empatou na liderança!")
    expect(describeResult({ ...game, winnerIds: ["beto"] }, "eu")).toBe(
      "Beto venceu"
    )
    expect(explainEnd(game, "eu")).toBe("Mais fichas depois de 10 rodadas.")
  })
})
