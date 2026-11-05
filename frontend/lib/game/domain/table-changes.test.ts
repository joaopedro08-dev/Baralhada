import { describe, expect, it } from "vitest"

import {
  describeMoves,
  describeSteal,
  DECK_ANCHOR,
  HAND_ANCHOR,
  playerAnchor,
  TABLE_ANCHOR,
} from "@/lib/game/domain/table-changes"
import { buildGame, buildPlayer } from "@/lib/game/domain/test-fixtures"

describe("movimento das cartas", () => {
  it("reposição da mão vem do baralho", () => {
    const previous = buildGame({ hand: ["7H"] })
    const next = buildGame({ hand: ["7H", "8H"] })
    expect(describeMoves(previous, next, "eu")).toEqual([
      { card: "8H", from: DECK_ANCHOR, to: HAND_ANCHOR },
    ])
  })

  it("descarte vai da mão para a mesa", () => {
    const previous = buildGame({ hand: ["7H"] })
    const next = buildGame({ hand: [], table: ["7H"] })
    expect(describeMoves(previous, next, "eu")).toEqual([
      { card: "7H", from: HAND_ANCHOR, to: TABLE_ANCHOR },
    ])
  })

  it("descarte do adversário sai da área dele", () => {
    const previous = buildGame({
      currentPlayerId: "ana",
      players: [buildPlayer("eu"), buildPlayer("ana", { handSize: 5 })],
    })
    const next = buildGame({
      currentPlayerId: "ana",
      table: ["7H"],
      players: [buildPlayer("eu"), buildPlayer("ana", { handSize: 4 })],
    })
    expect(describeMoves(previous, next, "eu")).toEqual([
      { card: "7H", from: playerAnchor("ana"), to: TABLE_ANCHOR },
    ])
  })

  it("reposição da mesa vem do baralho", () => {
    const previous = buildGame({ table: [] })
    const next = buildGame({ table: ["7H"] })
    expect(describeMoves(previous, next, "eu")).toEqual([
      { card: "7H", from: DECK_ANCHOR, to: TABLE_ANCHOR },
    ])
  })

  it("reposição do adversário não revela a carta", () => {
    const previous = buildGame()
    const next = buildGame({
      players: [buildPlayer("eu"), buildPlayer("ana", { handSize: 5 })],
    })
    expect(describeMoves(previous, next, "eu")).toEqual([
      { card: null, from: DECK_ANCHOR, to: playerAnchor("ana") },
    ])
  })

  it("não anima o que ficou no lugar", () => {
    const game = buildGame({ hand: ["7H"], table: ["8H"] })
    expect(describeMoves(game, { ...game }, "eu")).toEqual([])
  })

  it("limita a quantidade de cartas no ar", () => {
    const previous = buildGame()
    const next = buildGame({
      table: ["2C", "2D", "2H", "2S", "3C", "3D", "3H", "3S"],
      hand: ["4C", "4D", "4H", "4S", "5C", "5D", "5H", "5S"],
    })
    expect(describeMoves(previous, next, "eu")).toHaveLength(14)
  })

  it("captura leva as cartas da mesa e da mão para o monte", () => {
    const previous = buildGame({ hand: ["7C", "2D"], table: ["7H", "9S"] })
    const next = buildGame({
      hand: ["2D"],
      table: ["9S"],
      players: [
        buildPlayer("eu", { pileSize: 2, pileTop: "7C" }),
        buildPlayer("ana"),
      ],
    })
    expect(describeMoves(previous, next, "eu")).toEqual([
      { card: "7H", from: TABLE_ANCHOR, to: playerAnchor("eu") },
      { card: "7C", from: HAND_ANCHOR, to: playerAnchor("eu") },
    ])
  })

  it("roubo leva o topo do adversário para quem roubou", () => {
    const previous = buildGame({
      currentPlayerId: "ana",
      players: [
        buildPlayer("eu", { pileSize: 3, pileTop: "9C" }),
        buildPlayer("ana", { pileSize: 1, pileTop: "4D" }),
      ],
    })
    const next = buildGame({
      currentPlayerId: "eu",
      players: [
        buildPlayer("eu"),
        buildPlayer("ana", { handSize: 3, pileSize: 5, pileTop: "9H" }),
      ],
    })
    expect(describeMoves(previous, next, "eu")).toEqual([
      { card: "9C", from: playerAnchor("eu"), to: playerAnchor("ana") },
    ])
  })
})

describe("roubo de monte", () => {
  const previous = buildGame({
    players: [
      buildPlayer("eu", { pileSize: 1, pileTop: "4D" }),
      buildPlayer("ana", { pileSize: 6, pileTop: "9C" }),
    ],
  })

  it("identifica ladrão, vítima e tamanho do monte", () => {
    const next = buildGame({
      players: [
        buildPlayer("eu", { handSize: 3, pileSize: 8, pileTop: "9H" }),
        buildPlayer("ana"),
      ],
    })
    expect(describeSteal(previous, next)).toEqual({
      thiefId: "eu",
      victimId: "ana",
      count: 6,
    })
  })

  it("não confunde com quem saiu da partida", () => {
    const next = buildGame({
      players: [buildPlayer("eu", { pileSize: 1, pileTop: "4D" })],
    })
    expect(describeSteal(previous, next)).toBeNull()
  })

  it("não acusa roubo numa captura", () => {
    const next = buildGame({
      players: [
        buildPlayer("eu", { pileSize: 3, pileTop: "7C" }),
        buildPlayer("ana", { pileSize: 6, pileTop: "9C" }),
      ],
    })
    expect(describeSteal(previous, next)).toBeNull()
  })
})
