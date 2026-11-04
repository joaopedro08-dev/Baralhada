import { describe, expect, it } from "vitest"

import {
  currentSelection,
  emptySelection,
  isActionOpen,
  planAction,
  suggestAction,
  toggleHandCard,
  toggleMeld,
  toggleTableCard,
} from "@/lib/game/domain/selection"
import { buildGame, buildPlayer } from "@/lib/game/domain/test-fixtures"

describe("seleção do turno", () => {
  it("descarta a seleção quando o turno muda", () => {
    const selection = toggleHandCard(emptySelection(2), "7H")
    expect(currentSelection(selection, buildGame({ turnNumber: 3 }))).toEqual(
      emptySelection(3)
    )
  })

  it("tira da seleção o que saiu de cena", () => {
    const selection = {
      turn: 3,
      hand: ["7H" as const, "8H" as const],
      tableCards: ["9H" as const],
      meld: { playerId: "ana", rank: "3" as const },
    }
    const current = currentSelection(selection, buildGame({ hand: ["8H"] }))
    expect(current).toEqual({
      turn: 3,
      hand: ["8H"],
      tableCards: [],
      meld: null,
    })
  })

  it("mantém a quadra incompleta do adversário", () => {
    const target = { playerId: "ana", rank: "3" as const }
    const game = buildGame({
      players: [
        buildPlayer("eu"),
        buildPlayer("ana", { melds: [{ rank: "3", cards: ["3C", "3D"] }] }),
      ],
    })
    const selection = { ...emptySelection(3), meld: target }
    expect(currentSelection(selection, game).meld).toEqual(target)
  })

  it("não aceita quadra completa como alvo", () => {
    const target = { playerId: "ana", rank: "3" as const }
    const game = buildGame({
      players: [
        buildPlayer("eu"),
        buildPlayer("ana", {
          melds: [{ rank: "3", cards: ["3C", "3D", "3H", "3S"] }],
        }),
      ],
    })
    const selection = { ...emptySelection(3), meld: target }
    expect(currentSelection(selection, game).meld).toBeNull()
  })

  it("ao tocar na mesa, separa as cartas iguais da mão", () => {
    const selection = toggleTableCard(emptySelection(3), "5H", [
      "5C",
      "5D",
      "9S",
    ])
    expect(selection.tableCards).toEqual(["5H"])
    expect(selection.hand).toEqual(["5C", "5D"])
  })

  it("junta mais de uma carta igual da mesa", () => {
    const hand = ["5C", "9S"] as const
    const first = toggleTableCard(emptySelection(3), "5H", hand)
    const both = toggleTableCard(first, "5S", hand)
    expect(both.tableCards).toEqual(["5H", "5S"])
    expect(both.hand).toEqual(["5C"])
  })

  it("solta só a carta tocada e mantém a outra da mesa", () => {
    const hand = ["5C", "9S"] as const
    const first = toggleTableCard(emptySelection(3), "5H", hand)
    const both = toggleTableCard(first, "5S", hand)
    const kept = toggleTableCard(both, "5H", hand)
    expect(kept.tableCards).toEqual(["5S"])
    expect(kept.hand).toEqual(["5C"])
  })

  it("troca a seleção ao tocar em carta de outro valor na mesa", () => {
    const hand = ["5C", "9S"] as const
    const onFive = toggleTableCard(emptySelection(3), "5H", hand)
    const onNine = toggleTableCard(onFive, "9H", hand)
    expect(onNine.tableCards).toEqual(["9H"])
    expect(onNine.hand).toEqual(["9S"])
  })

  it("ao soltar a carta da mesa, solta também as cartas iguais", () => {
    const hand = ["5C", "9S"] as const
    const picked = toggleTableCard(emptySelection(3), "5H", hand)
    const released = toggleTableCard(picked, "5H", hand)
    expect(released).toEqual(emptySelection(3))
  })

  it("ao tocar numa quadra, separa as cartas iguais e larga a mesa", () => {
    const hand = ["3C", "9S"] as const
    const onTable = toggleTableCard(emptySelection(3), "9H", hand)
    const target = { playerId: "ana", rank: "3" as const }
    const selection = toggleMeld(onTable, target, hand)
    expect(selection.tableCards).toEqual([])
    expect(selection.meld).toEqual(target)
    expect(selection.hand).toEqual(["3C"])
  })
})

describe("planejamento das ações", () => {
  it("pede a carta da mesa antes de pegar", () => {
    expect(planAction("takeFromTable", emptySelection(1))).toEqual({
      ready: false,
      problem: "Toque nas cartas da mesa que quer pegar.",
    })
  })

  it("monta a jogada com todas as cartas escolhidas da mesa", () => {
    const selection = {
      ...emptySelection(1),
      hand: ["5C"] as const,
      tableCards: ["5H", "5S"] as const,
    }
    expect(planAction("takeFromTable", selection)).toEqual({
      ready: true,
      action: {
        type: "takeFromTable",
        tableCards: ["5H", "5S"],
        handCards: ["5C"],
      },
    })
  })

  it("pede a quadra antes de roubar", () => {
    expect(planAction("steal", emptySelection(1)).ready).toBe(false)
  })

  it("só descarta com exatamente uma carta", () => {
    const two = { ...emptySelection(1), hand: ["5C", "5D"] as const }
    expect(planAction("discard", two).ready).toBe(false)
    const one = { ...emptySelection(1), hand: ["5C"] as const }
    expect(planAction("discard", one)).toEqual({
      ready: true,
      action: { type: "discard", card: "5C" },
    })
  })

  it("monta o roubo com o alvo e as cartas", () => {
    const selection = {
      ...emptySelection(1),
      hand: ["3C"] as const,
      meld: { playerId: "ana", rank: "3" as const },
    }
    expect(planAction("steal", selection)).toEqual({
      ready: true,
      action: {
        type: "steal",
        targetId: "ana",
        rank: "3",
        handCards: ["3C"],
      },
    })
  })

  it("deixa o servidor julgar baixar sem cartas", () => {
    expect(planAction("layDown", emptySelection(1)).ready).toBe(true)
  })
})

describe("ação sugerida", () => {
  const withHand = (...hand: readonly ["5C"] | readonly ["5C", "5D"]) => ({
    ...emptySelection(3),
    hand: hand as readonly ("5C" | "5D")[],
  })

  it("sugere comprar no começo do turno", () => {
    expect(suggestAction(buildGame(), emptySelection(3), "eu")).toBe("draw")
  })

  it("sugere descartar depois de comprar", () => {
    const game = buildGame({ canEndTurn: false, usedActions: ["draw"] })
    expect(suggestAction(game, emptySelection(3), "eu")).toBe("discard")
  })

  it("depois de comprar, sugere baixar a carta que avança uma quadra sua", () => {
    const game = buildGame({
      canEndTurn: false,
      usedActions: ["draw"],
      players: [
        buildPlayer("eu", { melds: [{ rank: "5", cards: ["5H", "5S"] }] }),
        buildPlayer("ana"),
      ],
    })
    const selection = { ...emptySelection(3), hand: ["5C"] as const }
    expect(suggestAction(game, selection, "eu")).toBe("layDown")
  })

  it("depois de comprar, sugere roubar a quadra escolhida", () => {
    const game = buildGame({ canEndTurn: false, usedActions: ["draw"] })
    const selection = {
      ...emptySelection(3),
      hand: ["3C"] as const,
      meld: { playerId: "ana", rank: "3" as const },
    }
    expect(suggestAction(game, selection, "eu")).toBe("steal")
  })

  it("sugere pegar da mesa quando a carta comprada combina", () => {
    const game = buildGame({ canEndTurn: false, usedActions: ["draw"] })
    const selection = {
      ...emptySelection(3),
      hand: ["5C"] as const,
      tableCards: ["5H"] as const,
    }
    expect(suggestAction(game, selection, "eu")).toBe("takeFromTable")
    expect(suggestAction(game, emptySelection(3), "eu", "takeFromTable")).toBe(
      "takeFromTable"
    )
  })

  it("sugere roubar quando há alvo e cartas", () => {
    const selection = {
      ...emptySelection(3),
      hand: ["3C"] as const,
      meld: { playerId: "ana", rank: "3" as const },
    }
    expect(suggestAction(buildGame(), selection, "eu")).toBe("steal")
  })

  it("sugere roubar sem carta na mão quando cada um tem um par igual", () => {
    const game = buildGame({
      players: [
        buildPlayer("eu", { melds: [{ rank: "7", cards: ["7C", "7D"] }] }),
        buildPlayer("ana", { melds: [{ rank: "7", cards: ["7H", "7S"] }] }),
      ],
    })
    const selection = {
      ...emptySelection(3),
      meld: { playerId: "ana", rank: "7" as const },
    }
    expect(suggestAction(game, selection, "eu")).toBe("steal")
  })

  it("não sugere roubar sem carta igual e sem par próprio", () => {
    const selection = {
      ...emptySelection(3),
      meld: { playerId: "ana", rank: "3" as const },
    }
    expect(suggestAction(buildGame(), selection, "eu")).toBeNull()
  })

  it("sugere pegar quando há carta da mesa e da mão", () => {
    const selection = {
      ...emptySelection(3),
      hand: ["5C"] as const,
      tableCards: ["5H"] as const,
    }
    expect(suggestAction(buildGame(), selection, "eu")).toBe("takeFromTable")
  })

  it("sugere baixar com duas cartas selecionadas", () => {
    const selection = withHand(...(["5C", "5D"] as const))
    expect(suggestAction(buildGame(), selection, "eu")).toBe("layDown")
  })

  it("sugere descartar com uma carta solta", () => {
    const selection = withHand(...(["5C"] as const))
    expect(suggestAction(buildGame(), selection, "eu")).toBe("discard")
  })

  it("sugere baixar a carta que avança uma quadra sua", () => {
    const game = buildGame({
      players: [
        buildPlayer("eu", { melds: [{ rank: "5", cards: ["5H", "5S"] }] }),
        buildPlayer("ana"),
      ],
    })
    const selection = withHand(...(["5C"] as const))
    expect(suggestAction(game, selection, "eu")).toBe("layDown")
  })

  it("segue a melhor jogada das dicas quando não há seleção", () => {
    expect(suggestAction(buildGame(), emptySelection(3), "eu", "steal")).toBe(
      "steal"
    )
  })

  it("dá preferência à seleção sobre a dica", () => {
    const selection = withHand(...(["5C", "5D"] as const))
    expect(suggestAction(buildGame(), selection, "eu", "steal")).toBe("layDown")
  })

  it("não sugere nada com o monte vazio e sem seleção", () => {
    const game = buildGame({ deckSize: 0 })
    expect(suggestAction(game, emptySelection(3), "eu")).toBeNull()
  })
})

describe("jogada do turno", () => {
  it("abre todas as ações no começo do turno", () => {
    expect(isActionOpen(buildGame(), "steal")).toBe(true)
    expect(isActionOpen(buildGame(), "draw")).toBe(true)
  })

  it("depois de comprar, só comprar de novo fica fechado", () => {
    const game = buildGame({ usedActions: ["draw"] })
    expect(isActionOpen(game, "discard")).toBe(true)
    expect(isActionOpen(game, "takeFromTable")).toBe(true)
    expect(isActionOpen(game, "layDown")).toBe(true)
    expect(isActionOpen(game, "steal")).toBe(true)
    expect(isActionOpen(game, "draw")).toBe(false)
  })
})
