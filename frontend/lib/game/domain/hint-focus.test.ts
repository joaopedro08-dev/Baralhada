import { describe, expect, it } from "vitest"

import {
  focusOfHints,
  handCardHint,
  NO_FOCUS,
  pileHint,
  tableCardHint,
} from "@/lib/game/domain/hint-focus"
import type { Hints, TurnAction } from "@/lib/game/domain/types"

const hintsWith = (action: TurnAction): Hints => ({
  plays: [
    { action, sentence: "melhor" },
    { action: { type: "discard", card: "KC" }, sentence: "pior" },
  ],
  highlights: {
    handCards: ["2C", "5C", "3C"],
    tableCards: ["5H", "9H"],
    piles: ["eu", "ana", "bia"],
  },
  risk: null,
  cardCounts: [],
})

describe("foco da dica", () => {
  it("não destaca nada sem dicas", () => {
    expect(focusOfHints(null, "eu")).toEqual(NO_FOCUS)
    expect(handCardHint(NO_FOCUS, "2C")).toBeNull()
  })

  it("separa a melhor captura das outras jogadas possíveis", () => {
    const focus = focusOfHints(
      hintsWith({ type: "capture", card: "5C", tableCards: ["5H"] }),
      "eu"
    )
    expect(handCardHint(focus, "5C")).toBe("best")
    expect(handCardHint(focus, "2C")).toBe("possible")
    expect(handCardHint(focus, "KC")).toBeNull()
    expect(tableCardHint(focus, "5H")).toBe("best")
    expect(tableCardHint(focus, "9H")).toBe("possible")
  })

  it("destaca o monte do roubo sugerido e os outros que podem ser roubados", () => {
    const focus = focusOfHints(
      hintsWith({ type: "steal", card: "3C", targetId: "ana" }),
      "eu"
    )
    expect(pileHint(focus, "ana")).toBe("best")
    expect(pileHint(focus, "bia")).toBe("possible")
    expect(pileHint(focus, "caio")).toBeNull()
  })

  it("destaca o próprio monte quando a melhor jogada é empilhar", () => {
    const focus = focusOfHints(hintsWith({ type: "stack", card: "2C" }), "eu")
    expect(pileHint(focus, "eu")).toBe("best")
    expect(handCardHint(focus, "2C")).toBe("best")
  })

  it("destaca a carta sugerida para o descarte", () => {
    const focus = focusOfHints(hintsWith({ type: "discard", card: "9S" }), "eu")
    expect(handCardHint(focus, "9S")).toBe("best")
    expect(pileHint(focus, "eu")).toBe("possible")
  })
})
