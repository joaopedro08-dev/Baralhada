import { describe, expect, it } from "vitest"
import { pokerActionSchema, pokerAdapter } from "../../src/adapters/socket/games/poker/adapter.js"
import {
  describePokerEvent,
  describePokerHints,
  describePokerHistory,
  POKER_ERRORS,
} from "../../src/adapters/socket/games/poker/messages.js"
import type { PokerEvent } from "../../src/domain/games/poker/model.js"
import { buildPoker } from "../support/poker-builder.js"

const nameOf = (id: string) => ({ ana: "Ana", beto: "Beto" })[id] ?? "Jogador"

describe("PK-RF-14 frases do histórico", () => {
  it.each<[PokerEvent, string]>([
    [
      { type: "handStarted", number: 3, buttonId: "ana", blinds: { small: 20, big: 40 } },
      "Mão 3: botão com Ana e blinds de 20 e 40",
    ],
    [
      { type: "blindPosted", playerId: "ana", amount: 10, big: false },
      "Ana pagou a small blind de 10",
    ],
    [
      { type: "blindPosted", playerId: "beto", amount: 20, big: true },
      "Beto pagou a big blind de 20",
    ],
    [{ type: "acted", playerId: "ana", move: "fold", amount: 0, allIn: false }, "Ana desistiu"],
    [{ type: "acted", playerId: "ana", move: "check", amount: 0, allIn: false }, "Ana passou"],
    [{ type: "acted", playerId: "ana", move: "call", amount: 40, allIn: false }, "Ana pagou 40"],
    [
      { type: "acted", playerId: "ana", move: "call", amount: 35, allIn: true },
      "Ana pagou 35 e foi all-in",
    ],
    [{ type: "acted", playerId: "ana", move: "bet", amount: 60, allIn: false }, "Ana apostou 60"],
    [
      { type: "acted", playerId: "beto", move: "raise", amount: 120, allIn: false },
      "Beto aumentou para 120",
    ],
    [
      { type: "acted", playerId: "beto", move: "raise", amount: 340, allIn: true },
      "Beto foi all-in com 340",
    ],
    [
      { type: "streetDealt", street: "flop", cards: ["2C", "7D", "AS"] },
      "Flop: o 2 de paus, o 7 de ouros e o ás de espadas",
    ],
    [{ type: "streetDealt", street: "river", cards: ["QH"] }, "River: a dama de copas"],
    [
      { type: "potWon", playerIds: ["ana"], amount: 240, category: "fullHouse" },
      "Ana ganhou 240 com full house",
    ],
    [
      { type: "potWon", playerIds: ["ana", "beto"], amount: 200, category: "flush" },
      "Ana e Beto dividiram 200 com flush",
    ],
    [
      { type: "potWon", playerIds: ["beto"], amount: 30, category: null },
      "Beto levou 30 sem mostrar as cartas",
    ],
    [{ type: "eliminated", playerId: "beto", place: 3 }, "Beto foi eliminado em 3º lugar"],
    [{ type: "timedOut", playerId: "ana" }, "O tempo de Ana acabou"],
    [{ type: "playerLeft", playerId: "ana" }, "Ana saiu da partida"],
    [{ type: "matchWon", playerId: "ana" }, "Ana venceu a partida com todas as fichas"],
  ])("%j", (event, sentence) => {
    expect(describePokerEvent(event, nameOf)).toBe(sentence)
  })

  it("mostra o histórico do mais recente para o mais antigo", () => {
    const game = {
      ...buildPoker({ players: { ana: {}, beto: {} } }),
      events: [
        { type: "playerLeft", playerId: "ana" },
        { type: "matchWon", playerId: "zz" },
      ] satisfies PokerEvent[],
    }
    expect(describePokerHistory(game, 10)).toEqual([
      "Jogador venceu a partida com todas as fichas",
      "ANA saiu da partida",
    ])
  })
})

describe("PK-RF-12 e PK-RF-13 frases das dicas", () => {
  it("diz o jogo atual e as cartas que melhoram", () => {
    expect(describePokerHints({ current: null, outs: null })).toEqual([])
    expect(describePokerHints({ current: { category: "twoPair", cards: [] }, outs: null })).toEqual(
      ["Você tem dois pares."]
    )
    expect(
      describePokerHints({
        current: { category: "highCard", cards: [] },
        outs: {
          total: 23,
          unseen: 47,
          byCategory: [
            { category: "flush", count: 9 },
            { category: "pair", count: 14 },
          ],
        },
      })
    ).toEqual([
      "Você tem só carta alta.",
      "23 de 47 cartas melhoram o seu jogo na próxima abertura (49%): 9 para flush e 14 para par.",
    ])
    expect(
      describePokerHints({
        current: { category: "royalFlush", cards: [] },
        outs: { total: 0, unseen: 46, byCategory: [] },
      })
    ).toEqual(["Você tem um royal flush.", "Nenhuma carta melhora o seu jogo na próxima abertura."])
  })
})

describe("PK-RF-03 contrato das ações", () => {
  it("aceita só ações conhecidas com valor inteiro positivo", () => {
    expect(pokerActionSchema.safeParse({ type: "raise", amount: 120 }).success).toBe(true)
    expect(pokerActionSchema.safeParse({ type: "check" }).success).toBe(true)
    expect(pokerActionSchema.safeParse({ type: "bet", amount: 10.5 }).success).toBe(false)
    expect(pokerActionSchema.safeParse({ type: "bet", amount: -5 }).success).toBe(false)
    expect(pokerActionSchema.safeParse({ type: "call", amount: 5 }).success).toBe(false)
    expect(pokerActionSchema.safeParse({ type: "allIn" }).success).toBe(false)
  })

  it("tem mensagem em pt-BR para cada recusa", () => {
    expect(Object.values(POKER_ERRORS).every((message) => message.endsWith("."))).toBe(true)
    expect(pokerAdapter.errorMessages).toBe(POKER_ERRORS)
  })

  it("apresenta a visão sem eventos crus e com o histórico em frases", () => {
    const game = buildPoker({
      players: { ana: { hole: ["AH", "AD"] }, beto: { hole: ["KC", "KD"] } },
    })
    const state = pokerAdapter.presenter(game)("ana")
    expect(state.kind).toBe("poker-texas-holdem")
    expect(state).not.toHaveProperty("events")
    expect(state.hole).toEqual(["AH", "AD"])
    expect(JSON.stringify(state)).not.toContain("KC")
    expect(pokerAdapter.hints(game, "ana")).toMatchObject({
      kind: "poker-texas-holdem",
      sentences: ["Você tem um par."],
    })
  })
})
