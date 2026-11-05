import { describe, expect, it } from "vitest"

import {
  currentSelection,
  emptySelection,
  isActionAvailable,
  planAction,
  suggestAction,
  toggleHandCard,
  togglePile,
  toggleTableCard,
} from "@/lib/game/domain/selection"
import { buildGame, buildPlayer } from "@/lib/game/domain/test-fixtures"

const game = buildGame({
  hand: ["7C", "9D", "3S"],
  table: ["7H", "7S", "5C"],
  players: [
    buildPlayer("eu", { pileSize: 2, pileTop: "3H" }),
    buildPlayer("ana", { pileSize: 5, pileTop: "9S" }),
    buildPlayer("bia"),
  ],
})

const empty = emptySelection(game.turnNumber)

describe("seleção do turno", () => {
  it("descarta a seleção quando o turno muda", () => {
    const selection = toggleHandCard(emptySelection(2), "7C", game)
    expect(currentSelection(selection, game)).toEqual(empty)
  })

  it("tira da seleção o que saiu de cena", () => {
    const stale = {
      turn: game.turnNumber,
      card: "8H" as const,
      tableCards: ["9H" as const],
      pile: "bia",
    }
    expect(currentSelection(stale, game)).toEqual(empty)
  })

  it("mantém o que continua valendo", () => {
    const selection = { ...empty, card: "9D" as const, pile: "ana" }
    expect(currentSelection(selection, game)).toEqual(selection)
  })
})

describe("escolher cartas e montes", () => {
  it("seleciona uma carta da mão por vez", () => {
    const first = toggleHandCard(empty, "7C", game)
    const second = toggleHandCard(first, "9D", game)
    expect(second.card).toBe("9D")
    expect(toggleHandCard(second, "9D", game).card).toBeNull()
  })

  it("solta as escolhas que não combinam com a nova carta", () => {
    const capturing = toggleTableCard(empty, "7H", game)
    expect(toggleHandCard(capturing, "9D", game)).toMatchObject({
      card: "9D",
      tableCards: [],
    })
    const stealing = togglePile(empty, "ana", game)
    expect(toggleHandCard(stealing, "7C", game).pile).toBeNull()
  })

  it("junta cartas da mesa de mesmo valor e escolhe a carta da mão", () => {
    const one = toggleTableCard(empty, "7H", game)
    const both = toggleTableCard(one, "7S", game)
    expect(both).toMatchObject({ card: "7C", tableCards: ["7H", "7S"] })
    expect(toggleTableCard(both, "7H", game).tableCards).toEqual(["7S"])
  })

  it("troca de valor ao tocar numa carta diferente da mesa", () => {
    const sevens = toggleTableCard(empty, "7H", game)
    expect(toggleTableCard(sevens, "5C", game)).toMatchObject({
      card: null,
      tableCards: ["5C"],
    })
  })

  it("escolhe o monte e a carta igual ao topo", () => {
    const selection = togglePile(
      toggleTableCard(empty, "7H", game),
      "ana",
      game
    )
    expect(selection).toMatchObject({ card: "9D", tableCards: [], pile: "ana" })
    expect(togglePile(selection, "ana", game).pile).toBeNull()
  })

  it("ignora monte vazio", () => {
    expect(togglePile(empty, "bia", game).pile).toBeNull()
  })
})

describe("planejar a jogada", () => {
  it("pede a carta da mão antes de tudo", () => {
    expect(planAction("discard", empty, "eu")).toEqual({
      ready: false,
      problem: "Selecione 1 carta da sua mão.",
    })
  })

  it("monta cada jogada a partir da seleção", () => {
    const capture = toggleTableCard(empty, "7H", game)
    const steal = togglePile(empty, "ana", game)
    const own = togglePile(empty, "eu", game)

    expect(planAction("capture", capture, "eu")).toEqual({
      ready: true,
      action: { type: "capture", card: "7C", tableCards: ["7H"] },
    })
    expect(planAction("steal", steal, "eu")).toEqual({
      ready: true,
      action: { type: "steal", card: "9D", targetId: "ana" },
    })
    expect(planAction("stack", own, "eu")).toEqual({
      ready: true,
      action: { type: "stack", card: "3S" },
    })
    expect(planAction("discard", { ...empty, card: "3S" }, "eu")).toEqual({
      ready: true,
      action: { type: "discard", card: "3S" },
    })
  })

  it("monta a compra sem precisar de carta", () => {
    expect(planAction("draw", empty, "eu")).toEqual({
      ready: true,
      action: { type: "draw" },
    })
  })

  it("explica o que falta para capturar ou roubar", () => {
    const card = { ...empty, card: "7C" as const }
    expect(planAction("capture", card, "eu")).toMatchObject({ ready: false })
    expect(planAction("steal", { ...card, pile: "eu" }, "eu")).toMatchObject({
      ready: false,
    })
  })
})

describe("jogadas disponíveis e sugestão", () => {
  it("libera só o que faz sentido na mesa", () => {
    const noPiles = buildGame({ hand: ["7C"], table: [] })
    expect(isActionAvailable(noPiles, "eu", "capture")).toBe(false)
    expect(isActionAvailable(noPiles, "eu", "stack")).toBe(false)
    expect(isActionAvailable(noPiles, "eu", "steal")).toBe(false)
    expect(isActionAvailable(noPiles, "eu", "discard")).toBe(true)
    expect(isActionAvailable(game, "eu", "steal")).toBe(true)
    expect(isActionAvailable({ ...game, hand: [] }, "eu", "discard")).toBe(
      false
    )
  })

  it("libera comprar uma vez por turno e com baralho", () => {
    expect(isActionAvailable(game, "eu", "draw")).toBe(true)
    const drew = { ...game, drewThisTurn: true }
    expect(isActionAvailable(drew, "eu", "draw")).toBe(false)
    expect(isActionAvailable(drew, "eu", "discard")).toBe(true)
    expect(isActionAvailable({ ...game, deckSize: 0 }, "eu", "draw")).toBe(
      false
    )
  })

  it("sugere a jogada que combina com a seleção", () => {
    const pick = (card: "7C" | "9D" | "3S") => ({ ...empty, card })
    expect(suggestAction(game, pick("7C"), "eu")).toBe("capture")
    expect(suggestAction(game, pick("9D"), "eu")).toBe("steal")
    expect(suggestAction(game, pick("3S"), "eu")).toBe("stack")
    expect(suggestAction(game, { ...empty, pile: "eu" }, "eu")).toBe("stack")
    expect(suggestAction(game, { ...empty, tableCards: ["5C"] }, "eu")).toBe(
      "capture"
    )
    const lonely = buildGame({ hand: ["KC"], table: ["2C"] })
    expect(suggestAction(lonely, { ...empty, card: "KC" }, "eu")).toBe(
      "discard"
    )
  })

  it("usa a melhor dica quando nada foi escolhido", () => {
    expect(suggestAction(game, empty, "eu", "steal")).toBe("steal")
    expect(suggestAction(game, empty, "eu")).toBeNull()
  })
})
