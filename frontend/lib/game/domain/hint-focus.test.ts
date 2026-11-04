import { describe, expect, it } from "vitest"

import {
  focusOfHints,
  handCardHint,
  meldHint,
  NO_FOCUS,
  tableCardHint,
} from "@/lib/game/domain/hint-focus"
import type { Hints, TurnAction } from "@/lib/game/domain/types"

const hintsWith = (action: TurnAction): Hints => ({
  plays: [
    { action, sentence: "melhor" },
    { action: { type: "layDown", cards: ["2C", "2D"] }, sentence: "pior" },
  ],
  highlights: {
    handCards: ["2C", "2D", "5C", "3C"],
    tableCards: ["5H", "9H"],
    stealableMelds: [
      { playerId: "ana", rank: "3" },
      { playerId: "bia", rank: "4" },
    ],
  },
  risks: [],
  cardCounts: [],
})

describe("foco da dica", () => {
  it("não destaca nada sem dicas", () => {
    expect(focusOfHints(null)).toEqual(NO_FOCUS)
    expect(handCardHint(NO_FOCUS, "2C")).toBeNull()
  })

  it("marca o monte quando a melhor jogada é comprar", () => {
    expect(focusOfHints(hintsWith({ type: "draw" })).best.draw).toBe(true)
  })

  it("separa a melhor jogada das outras possíveis", () => {
    const focus = focusOfHints(
      hintsWith({
        type: "takeFromTable",
        tableCards: ["5H"],
        handCards: ["5C"],
      })
    )
    expect(handCardHint(focus, "5C")).toBe("best")
    expect(handCardHint(focus, "2C")).toBe("possible")
    expect(handCardHint(focus, "KC")).toBeNull()
    expect(tableCardHint(focus, "5H")).toBe("best")
    expect(tableCardHint(focus, "9H")).toBe("possible")
  })

  it("destaca a quadra da melhor jogada e as outras roubáveis", () => {
    const focus = focusOfHints(
      hintsWith({
        type: "steal",
        targetId: "ana",
        rank: "3",
        handCards: ["3C"],
      })
    )
    expect(meldHint(focus, "ana", "3")).toBe("best")
    expect(meldHint(focus, "bia", "4")).toBe("possible")
    expect(meldHint(focus, "bia", "3")).toBeNull()
  })

  it("destaca a carta sugerida para o descarte", () => {
    const focus = focusOfHints(hintsWith({ type: "discard", card: "9S" }))
    expect(handCardHint(focus, "9S")).toBe("best")
  })
})
