import { describe, expect, it } from "vitest"
import { getPlayer } from "../../src/domain/games/rouba-monte/model.js"
import type { Game } from "../../src/domain/games/rouba-monte/model.js"
import { applyTurnAction } from "../../src/domain/games/rouba-monte/turn-actions.js"
import type { TurnAction } from "../../src/domain/games/rouba-monte/turn-actions.js"
import { buildGame, unwrap } from "../support/game-builder.js"

const act = (game: Game, action: TurnAction): Game =>
  unwrap(applyTurnAction(game, game.turn.playerId, action))

const refusal = (game: Game, action: TurnAction) =>
  applyTurnAction(game, game.turn.playerId, action)

describe("RN-05 capturar", () => {
  const game = buildGame({
    players: { a: { hand: ["7C", "2D"], pile: ["4H"] }, b: {} },
    table: ["7H", "7S", "9C"],
  })

  it("leva a carta da mão e a da mesa para o topo do monte", () => {
    const next = act(game, { type: "capture", card: "7C", tableCards: ["7H"] })

    expect(getPlayer(next, "a").pile).toEqual(["4H", "7H", "7C"])
    expect(getPlayer(next, "a").hand).toEqual(["2D"])
    expect(next.table).toEqual(["7S", "9C"])
    expect(next.events.at(-1)).toEqual({
      type: "captured",
      playerId: "a",
      card: "7C",
      tableCards: ["7H"],
    })
  })

  it("deixa o jogador escolher quantas cartas iguais leva", () => {
    const next = act(game, { type: "capture", card: "7C", tableCards: ["7H", "7S"] })
    expect(getPlayer(next, "a").pile).toEqual(["4H", "7H", "7S", "7C"])
    expect(next.table).toEqual(["9C"])
  })

  it("ignora o naipe e compara só o valor", () => {
    const next = act(game, { type: "capture", card: "7C", tableCards: ["7S"] })
    expect(getPlayer(next, "a").pile.at(-1)).toBe("7C")
  })

  it.each([
    [{ card: "7C", tableCards: [] }, "NO_TABLE_CARDS_SELECTED"],
    [{ card: "7C", tableCards: ["7D"] }, "CARD_NOT_ON_TABLE"],
    [{ card: "7C", tableCards: ["7H", "7H"] }, "CARD_NOT_ON_TABLE"],
    [{ card: "7C", tableCards: ["9C"] }, "CARDS_MUST_SHARE_RANK"],
    [{ card: "7D", tableCards: ["7H"] }, "CARD_NOT_IN_HAND"],
  ] as const)("recusa %j com %s", (input, error) => {
    expect(refusal(game, { type: "capture", ...input })).toEqual({ ok: false, error })
  })
})

describe("RN-06 pôr no próprio monte", () => {
  it("empilha uma carta igual ao topo", () => {
    const game = buildGame({ players: { a: { hand: ["4C"], pile: ["9D", "4H"] }, b: {} } })
    const next = act(game, { type: "stack", card: "4C" })

    expect(getPlayer(next, "a").pile).toEqual(["9D", "4H", "4C"])
    expect(next.events.at(-1)).toEqual({ type: "stacked", playerId: "a", card: "4C" })
  })

  it("recusa com o monte vazio ou de outro valor", () => {
    const empty = buildGame({ players: { a: { hand: ["4C"] }, b: {} } })
    const other = buildGame({ players: { a: { hand: ["4C"], pile: ["5H"] }, b: {} } })

    expect(refusal(empty, { type: "stack", card: "4C" })).toEqual({
      ok: false,
      error: "PILE_EMPTY",
    })
    expect(refusal(other, { type: "stack", card: "4C" })).toEqual({
      ok: false,
      error: "TOP_MISMATCH",
    })
  })
})

describe("RN-07 e RN-08 roubar", () => {
  const game = buildGame({
    players: {
      ana: { hand: ["9C", "3D"], pile: ["2H"] },
      beto: { pile: ["5C", "9H"] },
      caio: { pile: ["9S"] },
    },
  })

  it("leva o monte inteiro com a carta por cima", () => {
    const next = act(game, { type: "steal", card: "9C", targetId: "beto" })

    expect(getPlayer(next, "ana").pile).toEqual(["2H", "5C", "9H", "9C"])
    expect(getPlayer(next, "beto").pile).toEqual([])
    expect(getPlayer(next, "caio").pile).toEqual(["9S"])
    expect(next.events.at(-1)).toEqual({
      type: "stole",
      playerId: "ana",
      targetId: "beto",
      card: "9C",
      stolenCount: 2,
    })
  })

  it("deixa escolher qual monte roubar quando há mais de um", () => {
    const next = act(game, { type: "steal", card: "9C", targetId: "caio" })
    expect(getPlayer(next, "ana").pile).toEqual(["2H", "9S", "9C"])
    expect(getPlayer(next, "beto").pile).toEqual(["5C", "9H"])
  })

  it.each([
    [{ card: "9C", targetId: "ana" }, "CANNOT_STEAL_FROM_SELF"],
    [{ card: "9C", targetId: "ninguem" }, "TARGET_NOT_FOUND"],
    [{ card: "3D", targetId: "beto" }, "TOP_MISMATCH"],
    [{ card: "9D", targetId: "beto" }, "CARD_NOT_IN_HAND"],
  ] as const)("recusa %j com %s", (input, error) => {
    expect(refusal(game, { type: "steal", ...input })).toEqual({ ok: false, error })
  })

  it("recusa roubar monte vazio", () => {
    const empty = buildGame({ players: { a: { hand: ["9C"] }, b: {} } })
    expect(refusal(empty, { type: "steal", card: "9C", targetId: "b" })).toEqual({
      ok: false,
      error: "PILE_EMPTY",
    })
  })
})

describe("RN-09 descartar", () => {
  it("põe a carta na mesa mesmo com captura possível", () => {
    const game = buildGame({ players: { a: { hand: ["9S", "2C"] }, b: {} } })
    const next = act(game, { type: "discard", card: "9S" })

    expect(next.table).toContain("9S")
    expect(getPlayer(next, "a").hand).toEqual(["2C"])
  })

  it("recusa carta fora da mão", () => {
    const game = buildGame({ players: { a: { hand: ["9S"] }, b: {} } })
    expect(refusal(game, { type: "discard", card: "2C" })).toEqual({
      ok: false,
      error: "CARD_NOT_IN_HAND",
    })
  })
})

describe("RN-04 e RF-09 validação", () => {
  const game = buildGame({ players: { a: { hand: ["9S"] }, b: { hand: ["2C"] } } })

  it("recusa jogada fora da vez", () => {
    expect(applyTurnAction(game, "b", { type: "discard", card: "2C" })).toEqual({
      ok: false,
      error: "NOT_YOUR_TURN",
    })
  })

  it("recusa jogada com a partida encerrada", () => {
    const finished: Game = { ...game, endReason: "noPlaysLeft" }
    expect(refusal(finished, { type: "discard", card: "9S" })).toEqual({
      ok: false,
      error: "GAME_FINISHED",
    })
  })

  it("não altera o estado quando recusa", () => {
    const before = structuredClone(game)
    refusal(game, { type: "capture", card: "9S", tableCards: ["8C"] })
    expect(game).toEqual(before)
  })
})
