import { describe, expect, it } from "vitest"
import type { Card } from "../../src/domain/cards/card.js"
import type { Game } from "../../src/domain/game/model.js"
import { getPlayer } from "../../src/domain/game/model.js"
import { applyTurnAction } from "../../src/domain/game/turn-actions.js"
import type { TurnAction } from "../../src/domain/game/turn-actions.js"
import { buildGame, meldOf, quadOf } from "../support/game-builder.js"

const act = (game: Game, action: TurnAction, playerId = game.turn.playerId): Game => {
  const result = applyTurnAction(game, playerId, action)
  if (!result.ok) throw new Error(result.error)
  return result.value
}

const rejection = (game: Game, action: TurnAction, playerId = game.turn.playerId) => {
  const result = applyTurnAction(game, playerId, action)
  return result.ok ? null : result.error
}

const hand: Card[] = ["5C", "5D", "7C", "2H"]

describe("RF-08 só o jogador da vez age", () => {
  it("recusa ação de quem não está na vez", () => {
    const game = buildGame({ players: { a: { hand }, b: { hand: ["3C"] } } })
    expect(rejection(game, { type: "draw" }, "b")).toBe("NOT_YOUR_TURN")
  })

  it("recusa ação com a partida encerrada", () => {
    const game = { ...buildGame({ players: { a: {}, b: {} } }), endReason: "abandoned" as const }
    expect(rejection(game, { type: "draw" })).toBe("GAME_FINISHED")
  })
})

describe("RN-04 cada ação no máximo 1 vez, em qualquer ordem", () => {
  const actions: readonly [
    string,
    TurnAction,
    TurnAction,
    Partial<Parameters<typeof buildGame>[0]>,
  ][] = [
    ["comprar", { type: "draw" }, { type: "draw" }, {}],
    [
      "baixar",
      { type: "layDown", cards: ["5C", "5D"] },
      { type: "layDown", cards: ["7C", "7D"] },
      { players: { a: { hand: ["5C", "5D", "7C", "7D"] }, b: {} } },
    ],
    [
      "pegar da mesa",
      { type: "takeFromTable", tableCards: ["9C"], handCards: ["9H"] },
      { type: "takeFromTable", tableCards: ["8C"], handCards: ["8H"] },
      {
        players: { a: { hand: ["9H", "8H"] }, b: {} },
        table: ["9C", "8C", "2C", "3C"],
      },
    ],
    [
      "roubar",
      { type: "steal", targetId: "b", rank: "3", handCards: ["3C"] },
      { type: "steal", targetId: "b", rank: "4", handCards: ["4C"] },
      {
        players: {
          a: { hand: ["3C", "4C"] },
          b: { melds: [meldOf("3D", "3H"), meldOf("4D", "4H")] },
        },
      },
    ],
    ["descartar", { type: "discard", card: "5C" }, { type: "discard", card: "5D" }, {}],
  ]

  const playsThatCloseTheTurn = actions.filter(([name]) => name !== "comprar")

  it.each(playsThatCloseTheTurn)(
    "recusa nova jogada depois de %s",
    (_name, first, second, spec) => {
      const game = buildGame({ players: { a: { hand }, b: {} }, ...spec })
      expect(rejection(act(game, first), second)).toBe("ACTION_ALREADY_USED")
    }
  )

  it("depois de comprar, recusa o que não fecha a compra", () => {
    const game = buildGame({ players: { a: { hand }, b: {} } })
    const drew = act(game, { type: "draw" })
    expect(rejection(drew, { type: "layDown", cards: ["5C", "5D"] })).toBe("MUST_DISCARD")
    expect(rejection(drew, { type: "draw" })).toBe("MUST_DISCARD")
    expect(act(drew, { type: "discard", card: "2H" }).turn.usedActions).toEqual(["draw", "discard"])
  })

  it("recusa outra jogada depois de comprar e descartar", () => {
    const game = buildGame({ players: { a: { hand }, b: {} } })
    const closed = act(act(game, { type: "draw" }), { type: "discard", card: "2H" })
    expect(rejection(closed, { type: "layDown", cards: ["5C", "5D"] })).toBe("ACTION_ALREADY_USED")
  })
})

describe("RF-09 ação inválida não muda nada", () => {
  it("devolve o motivo e mantém o estado original", () => {
    const game = buildGame({ players: { a: { hand }, b: {} } })
    const snapshot = structuredClone(game)
    expect(rejection(game, { type: "layDown", cards: ["AC", "AD"] })).toBe("CARD_NOT_IN_HAND")
    expect(game).toEqual(snapshot)
  })

  it("recusa comprar com o monte vazio", () => {
    const game = buildGame({ players: { a: { hand }, b: {} }, deck: [] })
    expect(rejection(game, { type: "draw" })).toBe("DECK_EMPTY")
  })

  it("recusa carta repetida na seleção", () => {
    const game = buildGame({ players: { a: { hand }, b: {} } })
    expect(rejection(game, { type: "layDown", cards: ["5C", "5C"] })).toBe("CARD_NOT_IN_HAND")
  })

  it("recusa descartar carta que não está na mão", () => {
    const game = buildGame({ players: { a: { hand }, b: {} } })
    expect(rejection(game, { type: "discard", card: "AC" })).toBe("CARD_NOT_IN_HAND")
  })
})

describe("RN-06 pegar da mesa", () => {
  it("baixa o par da mão com a carta da mesa", () => {
    const game = buildGame({ players: { a: { hand }, b: {} }, table: ["5H", "2C", "3C", "4C"] })
    const next = act(game, { type: "takeFromTable", tableCards: ["5H"], handCards: ["5C", "5D"] })

    expect(getPlayer(next, "a").melds).toEqual([{ rank: "5", cards: ["5C", "5D", "5H"] }])
    expect(getPlayer(next, "a").hand).toEqual(["7C", "2H"])
    expect(next.table).not.toContain("5H")
  })

  it("pega mais de uma carta da mesa na mesma jogada", () => {
    const game = buildGame({
      players: { a: { hand }, b: {} },
      table: ["5H", "5S", "2C", "3C", "4C"],
    })
    const next = act(game, { type: "takeFromTable", tableCards: ["5H", "5S"], handCards: ["5C"] })

    expect(getPlayer(next, "a").melds).toEqual([{ rank: "5", cards: ["5C", "5H", "5S"] }])
    expect(next.table).toEqual(["2C", "3C", "4C"])
    expect(next.events.at(-1)).toMatchObject({ type: "tookFromTable", tableCount: 2, count: 3 })
  })

  it("deixa o jogador escolher só parte das cartas iguais da mesa", () => {
    const game = buildGame({
      players: { a: { hand }, b: {} },
      table: ["5H", "5S", "2C", "3C"],
    })
    const next = act(game, { type: "takeFromTable", tableCards: ["5S"], handCards: ["5C"] })

    expect(getPlayer(next, "a").melds).toEqual([{ rank: "5", cards: ["5C", "5S"] }])
    expect(next.table).toContain("5H")
  })

  it("fecha a quadra com 1 carta da mão e 3 da mesa", () => {
    const game = buildGame({
      players: { a: { hand }, b: {} },
      table: ["7D", "7H", "7S", "2C"],
    })
    const next = act(game, {
      type: "takeFromTable",
      tableCards: ["7D", "7H", "7S"],
      handCards: ["7C"],
    })
    expect(next.events).toContainEqual(
      expect.objectContaining({ type: "tookFromTable", completed: true, tableCount: 3 })
    )
  })

  it("recusa cartas da mesa de valores diferentes", () => {
    const game = buildGame({ players: { a: { hand }, b: {} }, table: ["5H", "7H", "2C"] })
    expect(
      rejection(game, { type: "takeFromTable", tableCards: ["5H", "7H"], handCards: ["5C"] })
    ).toBe("CARDS_MUST_SHARE_RANK")
  })

  it("recusa carta repetida da mesa e lista vazia", () => {
    const game = buildGame({ players: { a: { hand }, b: {} }, table: ["5H", "2C", "3C"] })
    expect(
      rejection(game, { type: "takeFromTable", tableCards: ["5H", "5H"], handCards: ["5C"] })
    ).toBe("CARD_NOT_ON_TABLE")
    expect(rejection(game, { type: "takeFromTable", tableCards: [], handCards: ["5C"] })).toBe(
      "CARD_NOT_ON_TABLE"
    )
  })

  it("proíbe pegar da mesa só para guardar na mão", () => {
    const game = buildGame({ players: { a: { hand }, b: {} }, table: ["5H", "2C", "3C"] })
    expect(rejection(game, { type: "takeFromTable", tableCards: ["5H"], handCards: [] })).toBe(
      "NO_CARDS_SELECTED"
    )
  })

  it("exige carta da mão do mesmo valor", () => {
    const game = buildGame({ players: { a: { hand }, b: {} }, table: ["5H", "2C", "3C"] })
    expect(rejection(game, { type: "takeFromTable", tableCards: ["5H"], handCards: ["7C"] })).toBe(
      "CARDS_MUST_SHARE_RANK"
    )
  })

  it("avança uma quadra incompleta já aberta", () => {
    const game = buildGame({
      players: { a: { hand: ["5C"], melds: [meldOf("5D", "5S")] }, b: {} },
      table: ["5H", "2C", "3C"],
    })
    const next = act(game, { type: "takeFromTable", tableCards: ["5H"], handCards: ["5C"] })
    expect(getPlayer(next, "a").melds[0]?.cards).toHaveLength(4)
  })

  it("recusa carta que não está na mesa", () => {
    const game = buildGame({ players: { a: { hand }, b: {} }, table: ["2C", "3C", "4C"] })
    expect(rejection(game, { type: "takeFromTable", tableCards: ["5H"], handCards: ["5C"] })).toBe(
      "CARD_NOT_ON_TABLE"
    )
  })

  it("recusa carta da mão que o jogador não tem", () => {
    const game = buildGame({ players: { a: { hand }, b: {} }, table: ["AC", "2C", "3C"] })
    expect(rejection(game, { type: "takeFromTable", tableCards: ["AC"], handCards: ["AD"] })).toBe(
      "CARD_NOT_IN_HAND"
    )
  })
})

describe("RN-07 abrir quadra", () => {
  it("recusa abrir com 1 carta", () => {
    const game = buildGame({ players: { a: { hand }, b: {} } })
    expect(rejection(game, { type: "layDown", cards: ["7C"] })).toBe("MELD_REQUIRES_TWO_CARDS")
  })

  it("abre com 2 cartas do mesmo valor", () => {
    const game = buildGame({ players: { a: { hand }, b: {} } })
    const next = act(game, { type: "layDown", cards: ["5C", "5D"] })
    expect(getPlayer(next, "a").melds).toEqual([{ rank: "5", cards: ["5C", "5D"] }])
  })

  it("avança com 1 carta numa quadra já aberta", () => {
    const game = buildGame({
      players: { a: { hand: ["5C"], melds: [meldOf("5D", "5H")] }, b: {} },
    })
    const next = act(game, { type: "layDown", cards: ["5C"] })
    expect(getPlayer(next, "a").melds[0]?.cards).toEqual(["5D", "5H", "5C"])
  })

  it("recusa valores diferentes", () => {
    const game = buildGame({ players: { a: { hand }, b: {} } })
    expect(rejection(game, { type: "layDown", cards: ["5C", "7C"] })).toBe("CARDS_MUST_SHARE_RANK")
  })

  it("recusa seleção vazia", () => {
    const game = buildGame({ players: { a: { hand }, b: {} } })
    expect(rejection(game, { type: "layDown", cards: [] })).toBe("NO_CARDS_SELECTED")
  })
})

describe("RN-08 e RN-09 quadra completa", () => {
  it("não pode ser roubada", () => {
    const game = buildGame({
      players: { a: { hand: ["3C"] }, b: { melds: [quadOf("7")] } },
    })
    expect(rejection(game, { type: "steal", targetId: "b", rank: "7", handCards: ["3C"] })).toBe(
      "MELD_NOT_STEALABLE"
    )
  })

  it("recusa roubar valor que o adversário não tem", () => {
    const game = buildGame({ players: { a: { hand: ["3C"] }, b: {} } })
    expect(rejection(game, { type: "steal", targetId: "b", rank: "3", handCards: ["3C"] })).toBe(
      "MELD_NOT_STEALABLE"
    )
  })
})

describe("RN-10 roubo", () => {
  const scene = buildGame({
    players: {
      a: { hand: ["3C", "9C"] },
      b: { melds: [quadOf("10"), meldOf("3D", "3H")] },
    },
  })

  it("leva a quadra e a carta usada para a área do ladrão", () => {
    const next = act(scene, { type: "steal", targetId: "b", rank: "3", handCards: ["3C"] })

    expect(getPlayer(next, "a").melds).toEqual([{ rank: "3", cards: ["3D", "3H", "3C"] }])
    expect(getPlayer(next, "a").hand).toEqual(["9C"])
    expect(getPlayer(next, "b").melds).toEqual([quadOf("10")])
  })

  it("exige carta do mesmo valor na mão", () => {
    expect(rejection(scene, { type: "steal", targetId: "b", rank: "3", handCards: [] })).toBe(
      "NO_CARDS_SELECTED"
    )
    expect(rejection(scene, { type: "steal", targetId: "b", rank: "3", handCards: ["9C"] })).toBe(
      "CARDS_MUST_SHARE_RANK"
    )
    expect(rejection(scene, { type: "steal", targetId: "b", rank: "3", handCards: ["3S"] })).toBe(
      "CARD_NOT_IN_HAND"
    )
  })

  it("recusa roubar de si mesmo ou de quem não existe", () => {
    expect(rejection(scene, { type: "steal", targetId: "a", rank: "3", handCards: ["3C"] })).toBe(
      "CANNOT_STEAL_FROM_SELF"
    )
    expect(rejection(scene, { type: "steal", targetId: "z", rank: "3", handCards: ["3C"] })).toBe(
      "TARGET_NOT_FOUND"
    )
  })
})

describe("RN-10 com um par igual em cada área", () => {
  const scene = buildGame({
    players: {
      a: { hand: ["9C"], melds: [meldOf("7C", "7D")] },
      b: { hand: ["KS"], melds: [meldOf("7H", "7S")] },
    },
  })

  it("quem joga primeiro pega o par do outro sem carta da mão e fecha a quadra", () => {
    const next = act(scene, { type: "steal", targetId: "b", rank: "7", handCards: [] })

    expect(getPlayer(next, "a").melds).toEqual([{ rank: "7", cards: ["7C", "7D", "7H", "7S"] }])
    expect(getPlayer(next, "a").hand).toEqual(["9C"])
    expect(getPlayer(next, "b").melds).toEqual([])
    expect(next.events.at(-1)).toMatchObject({ type: "stole", completed: true, stolenCount: 2 })
  })

  it("não vale para quem não tem par desse valor", () => {
    const game = buildGame({
      players: {
        a: { hand: ["9C"], melds: [meldOf("8C", "8D")] },
        b: { melds: [meldOf("7H", "7S")] },
      },
    })
    expect(rejection(game, { type: "steal", targetId: "b", rank: "7", handCards: [] })).toBe(
      "NO_CARDS_SELECTED"
    )
  })

  it("só o jogador da vez pode pegar", () => {
    expect(rejection(scene, { type: "steal", targetId: "a", rank: "7", handCards: [] }, "b")).toBe(
      "NOT_YOUR_TURN"
    )
  })
})

describe("RN-11 e RN-12 limites do roubo", () => {
  it("o jogador escolhe qual quadra roubar e só leva uma", () => {
    const game = buildGame({
      players: {
        a: { hand: ["3C", "4C"] },
        b: { melds: [meldOf("3D", "3H"), meldOf("4D", "4H")] },
      },
    })
    const next = act(game, { type: "steal", targetId: "b", rank: "4", handCards: ["4C"] })
    expect(getPlayer(next, "b").melds).toEqual([meldOf("3D", "3H")])
  })

  it("completa a quadra roubada na mesma jogada", () => {
    const game = buildGame({
      players: { a: { hand: ["3C", "3S"] }, b: { melds: [meldOf("3D", "3H")] } },
    })
    const next = act(game, { type: "steal", targetId: "b", rank: "3", handCards: ["3C", "3S"] })

    expect(getPlayer(next, "a").melds[0]?.cards).toHaveLength(4)
    expect(next.events.at(-1)).toMatchObject({ type: "stole", completed: true, stolenCount: 2 })
  })
})

describe("RN-13 descarte", () => {
  it("vai para a mesa e quem descartou pode pegar de volta depois", () => {
    const game = buildGame({
      players: { a: { hand: ["5C", "5D"] }, b: {} },
      table: ["2C", "3C", "4C"],
    })
    const discarded = act(game, { type: "discard", card: "5C" })
    expect(discarded.table).toContain("5C")

    const nextTurn = { ...discarded, turn: { ...discarded.turn, usedActions: [] } }
    const recovered = act(nextTurn, {
      type: "takeFromTable",
      tableCards: ["5C"],
      handCards: ["5D"],
    })
    expect(getPlayer(recovered, "a").melds).toEqual([{ rank: "5", cards: ["5D", "5C"] }])
  })
})

describe("RN-15 fim da partida", () => {
  it("termina ao fechar a 13ª quadra", () => {
    const ranks = ["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q"]
    const game = buildGame({
      players: {
        a: { hand: ["KC", "KD"], melds: [meldOf("KH", "KS"), ...ranks.slice(0, 6).map(quadOf)] },
        b: { melds: ranks.slice(6).map(quadOf) },
      },
      deck: [],
      table: [],
    })
    const next = act(game, { type: "layDown", cards: ["KC", "KD"] })

    expect(next.endReason).toBe("allQuadsComplete")
    expect(next.winnerIds).toEqual(["a"])
  })

  it("não termina com quadra faltando", () => {
    const game = buildGame({
      players: { a: { hand: ["KC", "KD"] }, b: { melds: [quadOf("7")] } },
      deck: [],
      table: [],
    })
    expect(act(game, { type: "layDown", cards: ["KC", "KD"] }).endReason).toBeNull()
  })
})

describe("RN-16 e RN-17 placar", () => {
  it("só quadras completas contam para o vencedor", () => {
    const first = ["A", "2", "3", "4", "5", "6"]
    const second = ["7", "8", "9", "10", "J", "Q"]
    const game = buildGame({
      players: {
        a: { hand: ["KC"], melds: [meldOf("KD", "KH", "KS"), ...first.map(quadOf)] },
        b: { melds: second.map(quadOf) },
      },
      deck: [],
      table: [],
    })
    const next = act(game, { type: "layDown", cards: ["KC"] })

    expect(next.winnerIds).toEqual(["a"])
    expect(getPlayer(next, "a").melds.filter((meld) => meld.cards.length === 4)).toHaveLength(7)
  })

  it("empate entre dois jogadores declara os dois vencedores", () => {
    const first = ["A", "2", "3", "4", "5", "6"]
    const second = ["7", "8", "9", "10", "J", "Q"]
    const game = buildGame({
      players: {
        a: { melds: first.map(quadOf) },
        b: { hand: ["KC"], melds: [meldOf("KD", "KH", "KS"), ...second.slice(0, 5).map(quadOf)] },
        c: { melds: [quadOf("Q")] },
      },
      deck: [],
      table: [],
      current: "b",
    })
    const next = act(game, { type: "layDown", cards: ["KC"] })
    expect(next.winnerIds).toEqual(["a", "b"])
  })
})

describe("RN-19 mesa baixa", () => {
  it("completa até 10 quando fica com menos de 3 cartas", () => {
    const game = buildGame({
      players: { a: { hand: ["5C", "5D"] }, b: {} },
      table: ["5H", "2C", "3C"],
    })
    const next = act(game, { type: "takeFromTable", tableCards: ["5H"], handCards: ["5C", "5D"] })
    expect(next.table).toHaveLength(10)
    expect(next.deck).toHaveLength(0)
  })

  it("repõe só o que o monte tiver", () => {
    const game = buildGame({
      players: { a: { hand: ["5C", "5D"] }, b: {} },
      table: ["5H", "2C"],
      deck: ["KC", "KD"],
    })
    const next = act(game, { type: "takeFromTable", tableCards: ["5H"], handCards: ["5C", "5D"] })
    expect(next.table).toEqual(["2C", "KC", "KD"])
    expect(next.deck).toEqual([])
  })

  it("com 3 cartas na mesa não repõe", () => {
    const game = buildGame({
      players: { a: { hand: ["5C", "5D"] }, b: {} },
      table: ["5H", "2C", "3C", "4C"],
    })
    const next = act(game, { type: "takeFromTable", tableCards: ["5H"], handCards: ["5C", "5D"] })
    expect(next.table).toEqual(["2C", "3C", "4C"])
  })
})
