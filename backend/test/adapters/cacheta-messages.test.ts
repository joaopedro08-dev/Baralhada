import { describe, expect, it } from "vitest"
import {
  cachetaActionSchema,
  cachetaAdapter,
} from "../../src/adapters/socket/games/cacheta/adapter.js"
import {
  CACHETA_ERRORS,
  describeCachetaEvent,
  describeCachetaSuggestion,
} from "../../src/adapters/socket/games/cacheta/messages.js"
import type { CachetaSuggestion } from "../../src/domain/games/cacheta/hints.js"
import type { CachetaEvent } from "../../src/domain/games/cacheta/model.js"
import { buildCacheta } from "../support/cacheta-builder.js"

const nameOf = (id: string) => ({ ana: "Ana", beto: "Beto" })[id] ?? "Jogador"

describe("CA-RF-13 frases do histórico", () => {
  it.each<[CachetaEvent, string]>([
    [{ type: "dealt", round: 2, vira: "5C" }, "Rodada 2: a vira é o 5 de paus e o 6 é o coringa"],
    [
      { type: "dealt", round: 1, vira: "KH" },
      "Rodada 1: a vira é o rei de copas e o ás é o coringa",
    ],
    [{ type: "drew", playerId: "ana" }, "Ana comprou do monte"],
    [{ type: "tookDiscard", playerId: "ana", card: "7H" }, "Ana pegou o 7 de copas do descarte"],
    [{ type: "discarded", playerId: "beto", card: "QS" }, "Beto descartou a dama de espadas"],
    [{ type: "knocked", playerId: "ana", clean: false }, "Ana bateu: os outros perdem 1 ponto"],
    [
      { type: "knocked", playerId: "ana", clean: true },
      "Ana bateu limpo: os outros perdem 2 pontos",
    ],
    [{ type: "eliminated", playerId: "beto" }, "Beto ficou sem pontos e foi eliminado"],
    [
      { type: "restocked", count: 40 },
      "O descarte foi embaralhado e virou o monte de compra (40 cartas)",
    ],
    [{ type: "timedOut", playerId: "beto" }, "O tempo de Beto acabou"],
    [
      { type: "playerLeft", playerId: "beto", returnedCount: 9 },
      "Beto saiu da partida e 9 cartas voltaram ao monte",
    ],
    [{ type: "won", playerId: "ana" }, "Ana venceu a partida"],
  ])("%j vira frase", (event, sentence) => {
    expect(describeCachetaEvent(event, nameOf)).toBe(sentence)
  })
})

describe("frases das dicas", () => {
  it.each<[CachetaSuggestion, string]>([
    [
      { action: { type: "knock", card: "KC" }, advice: "knockClean", card: "KC" },
      "Bata limpo descartando o rei de paus: os outros perdem 2 pontos.",
    ],
    [
      { action: { type: "knock", card: "2D" }, advice: "knock", card: "2D" },
      "Bata descartando o 2 de ouros: os outros perdem 1 ponto.",
    ],
    [
      { action: { type: "take" }, advice: "takeJoker", card: "6H" },
      "Pegue o 6 de copas do descarte: é coringa.",
    ],
    [
      { action: { type: "take" }, advice: "takeForMeld", card: "4H" },
      "Pegue o 4 de copas do descarte: ela fecha um jogo.",
    ],
    [
      { action: { type: "draw" }, advice: "draw", card: null },
      "Compre do monte: a carta do descarte não ajuda seus jogos.",
    ],
    [
      { action: { type: "discard", card: "AS" }, advice: "discard", card: "AS" },
      "Descarte o ás de espadas: é a carta que menos ajuda seus jogos.",
    ],
  ])("%j", (suggestion, sentence) => {
    expect(describeCachetaSuggestion(suggestion)).toBe(sentence)
  })
})

describe("adaptador da Cacheta", () => {
  it("valida as jogadas", () => {
    expect(cachetaActionSchema.safeParse({ type: "draw" }).success).toBe(true)
    expect(cachetaActionSchema.safeParse({ type: "take" }).success).toBe(true)
    expect(cachetaActionSchema.safeParse({ type: "knock", card: "KC" }).success).toBe(true)
    expect(cachetaActionSchema.safeParse({ type: "discard", card: "1X" }).success).toBe(false)
    expect(cachetaActionSchema.safeParse({ type: "knock" }).success).toBe(false)
    expect(cachetaActionSchema.safeParse({ type: "draw", from: "stock" }).success).toBe(false)
  })

  it("mostra a mão só para o dono e nunca manda o monte", () => {
    const game = buildCacheta({
      players: { ana: { hand: ["7H", "7C"] }, beto: { hand: ["QS", "QD"] } },
      stock: ["AH", "KD"],
      discard: ["2C"],
    })
    const state = cachetaAdapter.presenter(game)("beto")
    expect(state.kind).toBe("cacheta")
    expect(state.hand).toEqual(["QS", "QD"])
    expect(state.stockSize).toBe(2)
    expect(state.discardTop).toBe("2C")
    const serialized = JSON.stringify(state)
    for (const hidden of ["7H", "7C", "AH", "KD"]) expect(serialized).not.toContain(`"${hidden}"`)
  })

  it("tem mensagem para todo erro", () => {
    expect(cachetaAdapter.errorMessages).toBe(CACHETA_ERRORS)
    expect(Object.values(CACHETA_ERRORS).every((message) => message.length > 0)).toBe(true)
  })
})
