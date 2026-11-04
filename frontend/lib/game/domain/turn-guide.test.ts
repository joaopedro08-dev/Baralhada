import { describe, expect, it } from "vitest"

import { emptySelection } from "@/lib/game/domain/selection"
import { buildGame } from "@/lib/game/domain/test-fixtures"
import { describeNextStep } from "@/lib/game/domain/turn-guide"

const base = {
  game: buildGame(),
  selection: emptySelection(3),
  isMyTurn: true,
  currentName: "Ana",
  topHint: null,
}

describe("guia do turno", () => {
  it("pede para aguardar fora da vez", () => {
    expect(describeNextStep({ ...base, isMyTurn: false })).toBe(
      "Aguarde: é a vez de Ana."
    )
  })

  it("explica a jogada única no começo do turno", () => {
    expect(describeNextStep(base)).toContain("Faça 1 jogada")
  })

  it("pede o descarte depois da compra", () => {
    const game = buildGame({ usedActions: ["draw"], canEndTurn: false })
    expect(describeNextStep({ ...base, game })).toContain("descarte")
  })

  it("avisa que a jogada fecha o turno", () => {
    const selection = { ...emptySelection(3), hand: ["5C"] as const }
    expect(describeNextStep({ ...base, selection })).toContain(
      "fecha o seu turno"
    )
  })

  it("mostra a dica quando não há seleção", () => {
    expect(describeNextStep({ ...base, topHint: "Compra 1 carta." })).toBe(
      "Dica: Compra 1 carta."
    )
  })
})
