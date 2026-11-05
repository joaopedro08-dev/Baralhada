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

  it("lista as jogadas e a compra no começo do turno", () => {
    expect(describeNextStep(base)).toBe(
      "Faça 1 jogada: capture, ponha no seu monte, roube, descarte ou compre 1 carta."
    )
  })

  it("pede para passar a vez depois de comprar com até 4 cartas", () => {
    const game = buildGame({ drewThisTurn: true, canPass: true })
    expect(describeNextStep({ ...base, game })).toContain("passe a vez")
  })

  it("pede uma jogada depois de comprar com 5 cartas", () => {
    const game = buildGame({ drewThisTurn: true })
    expect(describeNextStep({ ...base, game })).toContain("para fechar o turno")
  })

  it("avisa que a jogada fecha o turno", () => {
    const selection = { ...emptySelection(3), card: "5C" as const }
    expect(describeNextStep({ ...base, selection })).toContain(
      "fecha o seu turno"
    )
  })

  it("mostra a dica quando não há seleção", () => {
    expect(describeNextStep({ ...base, topHint: "Rouba o monte." })).toBe(
      "Dica: Rouba o monte."
    )
  })

  it("avisa quando o baralho de compra acabou", () => {
    const game = buildGame({ deckSize: 0 })
    expect(describeNextStep({ ...base, game })).toContain("O baralho acabou")
  })
})
