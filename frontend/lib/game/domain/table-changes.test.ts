import { describe, expect, it } from "vitest"

import {
  describeEvents,
  describeMoves,
  DECK_ANCHOR,
  HAND_ANCHOR,
  playerAnchor,
  TABLE_ANCHOR,
} from "@/lib/game/domain/table-changes"
import { buildGame, buildPlayer } from "@/lib/game/domain/test-fixtures"

describe("movimento das cartas", () => {
  it("compra do jogador vem do monte", () => {
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

  it("reposição da mesa vem do monte", () => {
    const previous = buildGame({ table: [] })
    const next = buildGame({ table: ["7H"] })
    expect(describeMoves(previous, next, "eu")).toEqual([
      { card: "7H", from: DECK_ANCHOR, to: TABLE_ANCHOR },
    ])
  })

  it("compra do adversário não revela a carta", () => {
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
})

describe("eventos da mesa", () => {
  it("avisa quando uma quadra fecha", () => {
    const previous = buildGame({
      players: [
        buildPlayer("eu", {
          melds: [{ rank: "7", cards: ["7C", "7D", "7H"] }],
        }),
        buildPlayer("ana"),
      ],
    })
    const next = buildGame({
      players: [
        buildPlayer("eu", {
          melds: [{ rank: "7", cards: ["7C", "7D", "7H", "7S"] }],
        }),
        buildPlayer("ana"),
      ],
    })
    expect(describeEvents(previous, next)).toEqual([
      { kind: "quadCompleted", playerId: "eu", rank: "7" },
    ])
  })

  it("avisa quem roubou de quem", () => {
    const previous = buildGame({
      currentPlayerId: "ana",
      players: [
        buildPlayer("eu", { melds: [{ rank: "3", cards: ["3C", "3D"] }] }),
        buildPlayer("ana"),
      ],
    })
    const next = buildGame({
      currentPlayerId: "ana",
      players: [
        buildPlayer("eu"),
        buildPlayer("ana", {
          melds: [{ rank: "3", cards: ["3C", "3D", "3H"] }],
        }),
      ],
    })
    expect(describeEvents(previous, next)).toEqual([
      { kind: "stolen", thiefId: "ana", victimId: "eu", rank: "3" },
    ])
  })

  it("não acusa roubo quando a quadra só some", () => {
    const previous = buildGame({
      currentPlayerId: "ana",
      players: [
        buildPlayer("eu", { melds: [{ rank: "3", cards: ["3C", "3D"] }] }),
        buildPlayer("ana"),
      ],
    })
    const next = buildGame({ currentPlayerId: "ana" })
    expect(describeEvents(previous, next)).toEqual([])
  })
})
