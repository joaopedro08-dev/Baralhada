import { describe, expect, it } from "vitest"
import {
  blackjackActionSchema,
  blackjackAdapter,
} from "../../src/adapters/socket/games/blackjack/adapter.js"
import {
  BLACKJACK_ERRORS,
  describeBlackjackAdvice,
  describeBlackjackEvent,
} from "../../src/adapters/socket/games/blackjack/messages.js"
import type { BlackjackEvent } from "../../src/domain/games/blackjack/model.js"
import type { BlackjackAdvice } from "../../src/domain/games/blackjack/strategy.js"
import { buildBlackjack, hand } from "../support/blackjack-builder.js"

const nameOf = (id: string) => ({ ana: "Ana", beto: "Beto" })[id] ?? "Jogador"

const result = (changes: object) => ({
  playerId: "ana",
  handIndex: 0,
  outcome: "win" as const,
  bet: 200,
  net: 200,
  fromSplit: false,
  ...changes,
})

describe("BJ-RF-14 frases do histórico", () => {
  it.each<[BlackjackEvent, string]>([
    [{ type: "roundStarted", round: 3 }, "Rodada 3 de 10: façam suas apostas"],
    [{ type: "bet", playerId: "ana", amount: 1500 }, "Ana apostou 1.500"],
    [{ type: "dealt", round: 1 }, "As cartas foram distribuídas"],
    [{ type: "hit", playerId: "ana", card: "7H", total: 18 }, "Ana pediu o 7 de copas e foi a 18"],
    [
      { type: "hit", playerId: "ana", card: "KS", total: 26 },
      "Ana pediu o rei de espadas e estourou com 26",
    ],
    [{ type: "stood", playerId: "beto", total: 17 }, "Beto parou com 17"],
    [
      { type: "doubled", playerId: "ana", from: 11, card: "9D", total: 20 },
      "Ana dobrou com 11 e recebeu o 9 de ouros",
    ],
    [{ type: "split", playerId: "ana", cards: ["8C", "8D"] }, "Ana dividiu o par de 8"],
    [{ type: "split", playerId: "ana", cards: ["AC", "AH"] }, "Ana dividiu o par de ases"],
    [{ type: "split", playerId: "ana", cards: ["QC", "JH"] }, "Ana dividiu a dama e o valete"],
    [{ type: "busted", playerId: "beto", total: 24 }, "Beto estourou com 24"],
    [{ type: "dealerRevealed", card: "QD", total: 19 }, "A banca revelou a dama de ouros e tem 19"],
    [
      { type: "dealerDrew", card: "5C", total: 23 },
      "A banca comprou o 5 de paus e estourou com 23",
    ],
    [{ type: "settled", result: result({}) }, "Ana ganhou 200"],
    [
      { type: "settled", result: result({ outcome: "blackjack", net: 30 }) },
      "Ana fez blackjack e ganhou 30",
    ],
    [
      { type: "settled", result: result({ outcome: "push", net: 0 }) },
      "Ana empatou com a banca e recebeu a aposta de volta",
    ],
    [
      {
        type: "settled",
        result: result({ outcome: "lose", net: -200, handIndex: 1, fromSplit: true }),
      },
      "Ana perdeu 200 na 2ª mão",
    ],
    [
      { type: "settled", result: result({ outcome: "bust", net: -200 }) },
      "Ana estourou e perdeu 200",
    ],
    [{ type: "restocked" }, "O baralho acabou e um novo foi embaralhado sem as cartas da mesa"],
    [{ type: "timedOut", playerId: "beto" }, "O tempo de Beto acabou"],
    [{ type: "broke", playerId: "beto" }, "Beto ficou sem fichas e passa a assistir"],
    [
      { type: "playerLeft", playerId: "beto", bet: 50 },
      "Beto saiu da partida e perdeu a aposta de 50",
    ],
    [{ type: "playerLeft", playerId: "beto", bet: 0 }, "Beto saiu da partida"],
    [{ type: "finished", winnerIds: ["ana", "beto"] }, "Ana e Beto venceram com mais fichas"],
    [{ type: "finished", winnerIds: [] }, "A partida terminou sem fichas na mesa"],
  ])("%j vira frase", (event, sentence) => {
    expect(describeBlackjackEvent(event, nameOf)).toBe(sentence)
  })
})

describe("BJ-RF-13 frases da dica", () => {
  const advice = (changes: Partial<BlackjackAdvice>): BlackjackAdvice => ({
    action: { type: "hit" },
    play: "hit",
    total: 16,
    soft: false,
    pair: null,
    dealerUp: "10C",
    ...changes,
  })

  it.each<[BlackjackAdvice, string]>([
    [advice({}), "Peça carta: 16 perde para a banca, que mostra o 10."],
    [advice({ total: 9 }), "Peça carta: com 9 não dá para estourar."],
    [
      advice({ play: "stand", total: 13, dealerUp: "5H" }),
      "Pare com 13: a banca mostra o 5 e tende a estourar.",
    ],
    [advice({ play: "stand", total: 19 }), "Pare com 19: pedir arrisca mais do que ajuda."],
    [
      advice({ play: "double", total: 18, soft: true, dealerUp: "4S" }),
      "Dobre com 18 macio: a banca mostra o 4 e a chance de ganhar é alta.",
    ],
    [advice({ play: "split", pair: "8" }), "Divida o par de 8: duas mãos rendem mais que 16."],
  ])("%j", (given, sentence) => {
    expect(describeBlackjackAdvice(given)).toBe(sentence)
  })
})

describe("adaptador do Blackjack", () => {
  it("valida as jogadas", () => {
    expect(blackjackActionSchema.safeParse({ type: "bet", amount: 100 }).success).toBe(true)
    expect(blackjackActionSchema.safeParse({ type: "bet", amount: 10.5 }).success).toBe(false)
    expect(blackjackActionSchema.safeParse({ type: "bet", amount: -10 }).success).toBe(false)
    expect(blackjackActionSchema.safeParse({ type: "bet" }).success).toBe(false)
    expect(blackjackActionSchema.safeParse({ type: "split", hand: 1 }).success).toBe(false)
    for (const type of ["hit", "stand", "double", "split"]) {
      expect(blackjackActionSchema.safeParse({ type }).success).toBe(true)
    }
  })

  it("nunca manda a carta escondida nem o baralho", () => {
    const game = buildBlackjack({
      deck: ["2C", "3C"],
      dealer: { cards: ["9S", "QD"] },
      players: { ana: { hands: [hand(["5S", "6H"])] } },
    })
    const frame = JSON.stringify(blackjackAdapter.presenter(game)("ana"))
    for (const hidden of ["QD", "2C", "3C"]) expect(frame).not.toContain(`"${hidden}"`)
  })

  it("tem mensagem para todo erro", () => {
    expect(blackjackAdapter.errorMessages).toBe(BLACKJACK_ERRORS)
  })
})
