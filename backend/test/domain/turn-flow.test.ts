import { describe, expect, it } from "vitest"
import type { Game } from "../../src/domain/game/model.js"
import { getPlayer } from "../../src/domain/game/model.js"
import { applyTurnAction } from "../../src/domain/game/turn-actions.js"
import type { TurnAction } from "../../src/domain/game/turn-actions.js"
import { endTurn, expireTurn, removePlayer, playTurn } from "../../src/domain/game/turn-flow.js"
import { allCardsOf, buildGame, meldOf, quadOf, seededRandom } from "../support/game-builder.js"

const random = seededRandom(11)

const unwrap = <T>(result: { ok: true; value: T } | { ok: false; error: string }): T => {
  if (!result.ok) throw new Error(result.error)
  return result.value
}

const act = (game: Game, action: TurnAction): Game =>
  unwrap(applyTurnAction(game, game.turn.playerId, action))

const close = (game: Game): Game => unwrap(endTurn(game, game.turn.playerId, random))

describe("RN-05 e RF-10 mão ao encerrar", () => {
  const players = { a: { hand: ["2C", "3C", "4C", "5C"] as const }, b: {} }

  it("bloqueia encerrar com 5 cartas", () => {
    const drew = act(buildGame({ players }), { type: "draw" })
    expect(endTurn(drew, "a", random)).toEqual({ ok: false, error: "MUST_DISCARD" })
  })

  it("encerra com exatamente 4 após comprar e descartar", () => {
    const drew = act(buildGame({ players }), { type: "draw" })
    const discarded = act(drew, { type: "discard", card: "2C" })
    const next = close(discarded)
    expect(getPlayer(next, "a").hand).toHaveLength(4)
    expect(next.turn.playerId).toBe("b")
  })

  it("completa a mão ao encerrar com menos de 4 sem contar como compra", () => {
    const game = buildGame({
      players: { a: { hand: ["2C", "2D", "4C", "5C"] }, b: {} },
      deck: ["KC", "KD", "KH"],
    })
    const laid = act(game, { type: "layDown", cards: ["2C", "2D"] })
    const next = close(laid)

    expect(getPlayer(next, "a").hand).toEqual(["4C", "5C", "KC", "KD"])
    expect(next.deck).toEqual(["KH"])
    expect(next.events.at(-1)).toMatchObject({ type: "handRefilled", count: 2 })
  })

  it("recusa encerrar turno alheio ou de partida encerrada", () => {
    const game = buildGame({ players })
    expect(endTurn(game, "b", random)).toEqual({ ok: false, error: "NOT_YOUR_TURN" })
    expect(endTurn({ ...game, endReason: "abandoned" }, "a", random)).toEqual({
      ok: false,
      error: "GAME_FINISHED",
    })
  })
})

describe("turnos para a direita", () => {
  it("segue a ordem dos assentos e volta ao primeiro", () => {
    const game = buildGame({
      players: { a: { hand: ["2C"] }, b: { hand: ["3C"] }, c: { hand: ["4C"] } },
    })
    const b = close(game)
    const c = close(b)
    const a = close(c)
    expect([b.turn.playerId, c.turn.playerId, a.turn.playerId]).toEqual(["b", "c", "a"])
    expect(a.turn.number).toBe(4)
  })

  it("zera as ações usadas no novo turno", () => {
    const game = buildGame({ players: { a: { hand: ["2C", "3C", "4C", "5C"] }, b: {} } })
    const next = close(act(game, { type: "discard", card: "2C" }))
    expect(next.turn.usedActions).toEqual([])
  })
})

describe("RN-14 monte vazio", () => {
  it("permite encerrar com mais de 4 cartas quando a compra esvaziou o monte", () => {
    const game = buildGame({
      players: { a: { hand: ["2C", "3C", "4C", "5C"] }, b: { hand: ["6C"] } },
      deck: ["KC"],
    })
    const next = close(act(game, { type: "draw" }))
    expect(getPlayer(next, "a").hand).toHaveLength(5)
    expect(next.turn.playerId).toBe("b")
  })

  it("não repõe a mão e pula quem já esvaziou", () => {
    const game = buildGame({
      players: { a: { hand: ["2C"] }, b: {}, c: { hand: ["4C"] } },
      deck: [],
    })
    const next = close(game)
    expect(getPlayer(next, "a").hand).toEqual(["2C"])
    expect(next.turn.playerId).toBe("c")
  })
})

describe("impasse com monte e mãos vazios (RN-15)", () => {
  it("nunca encerra com quadra faltando e devolve a mesa ao jogo", () => {
    const game = buildGame({
      players: { a: { hand: [], melds: [meldOf("7C", "7D", "7H")] }, b: {} },
      deck: [],
      table: ["7S", "2C", "3C"],
    })
    const next = close(game)

    expect(next.endReason).toBeNull()
    expect(next.events.some((event) => event.type === "pileRecycled")).toBe(true)
    expect(getPlayer(next, "b").hand.length + getPlayer(next, "a").hand.length).toBe(3)
    expect(next.table).toEqual([])
    expect(allCardsOf(next)).toHaveLength(6)
  })

  it("distribui uma carta por vez começando pelo próximo jogador", () => {
    const game = buildGame({
      players: { a: {}, b: {} },
      deck: [],
      table: ["7S", "2C", "3C"],
    })
    const next = close(game)
    expect(next.turn.playerId).toBe("b")
    expect(getPlayer(next, "b").hand).toHaveLength(2)
    expect(getPlayer(next, "a").hand).toHaveLength(1)
  })

  it("com a mesa vazia devolve só as quadras incompletas", () => {
    const game = buildGame({
      players: {
        a: { melds: [meldOf("7C", "7D"), quadOf("9")] },
        b: { melds: [meldOf("7H", "7S")] },
      },
      deck: [],
      table: [],
    })
    const next = close(game)

    expect(getPlayer(next, "a").melds).toEqual([quadOf("9")])
    expect(getPlayer(next, "b").melds).toEqual([])
    expect(getPlayer(next, "a").hand.length + getPlayer(next, "b").hand.length).toBe(4)
  })

  it("com sobra de cartas repõe também a mesa", () => {
    const table = ["2C", "3C", "4C", "5C", "6C", "7C", "8C", "9C", "10C", "JC", "QC"] as const
    const game = buildGame({ players: { a: {}, b: {} }, deck: [], table })
    const next = close(game)

    expect(getPlayer(next, "a").hand).toHaveLength(4)
    expect(getPlayer(next, "b").hand).toHaveLength(4)
    expect(next.table).toHaveLength(3)
  })
})

describe("RN-20 saída no meio da partida", () => {
  const scene = buildGame({
    players: {
      a: { hand: ["2C", "3C"], melds: [quadOf("9")] },
      b: { hand: ["4C"], melds: [meldOf("5C", "5D")] },
      c: { hand: ["6C"] },
    },
    deck: ["KC"],
    current: "b",
  })

  it("devolve mão e quadras (completas e incompletas) ao monte embaralhado", () => {
    const next = removePlayer(scene, "a", random)

    expect(next.players.map((player) => player.id)).toEqual(["b", "c"])
    expect(next.deck).toHaveLength(7)
    expect([...next.deck].sort()).toEqual(["2C", "3C", "9C", "9D", "9H", "9S", "KC"].sort())
    expect(allCardsOf(next)).toHaveLength(allCardsOf(scene).length)
  })

  it("mantém a vez quando quem sai não é o jogador da vez", () => {
    expect(removePlayer(scene, "c", random).turn.number).toBe(1)
    expect(removePlayer(scene, "c", random).turn.playerId).toBe("b")
  })

  it("passa a vez para a direita quando o jogador da vez sai", () => {
    const next = removePlayer(scene, "b", random)
    expect(next.turn.playerId).toBe("c")
    expect(next.turn.number).toBe(2)
  })

  it("encerra por abandono quando resta só 1 jogador", () => {
    const duo = buildGame({ players: { a: { hand: ["2C"] }, b: { hand: ["3C"] } } })
    const next = removePlayer(duo, "a", random)
    expect(next.endReason).toBe("abandoned")
    expect(next.winnerIds).toEqual(["b"])
  })

  it("não altera uma partida já encerrada", () => {
    const finished = { ...scene, endReason: "abandoned" as const }
    expect(removePlayer(finished, "a", random)).toBe(finished)
  })
})

describe("RN-21 tempo do turno", () => {
  it("descarta carta aleatória com 5 na mão e encerra", () => {
    const game = buildGame({
      players: { a: { hand: ["2C", "3C", "4C", "5C"] }, b: {} },
      table: ["8C", "9C", "10C"],
    })
    const next = expireTurn(act(game, { type: "draw" }), random)

    expect(getPlayer(next, "a").hand).toHaveLength(4)
    expect(next.table).toHaveLength(4)
    expect(next.turn.playerId).toBe("b")
    expect(next.events.some((event) => event.type === "turnTimedOut")).toBe(true)
  })

  it("compra o que falta com menos de 4", () => {
    const game = buildGame({ players: { a: { hand: ["2C"] }, b: {} } })
    expect(getPlayer(expireTurn(game, random), "a").hand).toHaveLength(4)
  })

  it("com 4 cartas e monte cheio só passa a vez", () => {
    const game = buildGame({ players: { a: { hand: ["2C", "3C", "4C", "5C"] }, b: {} } })
    const next = expireTurn(game, random)
    expect(getPlayer(next, "a").hand).toEqual(["2C", "3C", "4C", "5C"])
    expect(next.turn.playerId).toBe("b")
  })

  it("com monte vazio descarta para a partida andar", () => {
    const game = buildGame({
      players: { a: { hand: ["2C", "3C"] }, b: { hand: ["4C"] } },
      deck: [],
    })
    expect(getPlayer(expireTurn(game, random), "a").hand).toHaveLength(1)
  })

  it("não descarta de novo se o jogador já descartou com o monte vazio", () => {
    const game = buildGame({
      players: { a: { hand: ["2C", "3C"] }, b: { hand: ["4C"] } },
      deck: [],
    })
    const next = expireTurn(act(game, { type: "discard", card: "2C" }), random)
    expect(getPlayer(next, "a").hand).toEqual(["3C"])
  })

  it("não mexe em partida encerrada", () => {
    const finished = {
      ...buildGame({ players: { a: {}, b: {} } }),
      endReason: "abandoned" as const,
    }
    expect(expireTurn(finished, random)).toBe(finished)
  })
})

describe("RN-04 uma jogada por turno", () => {
  const game = buildGame({
    players: { a: { hand: ["2C", "2D", "4C", "5C"] }, b: { hand: ["6C", "6D", "7C", "8C"] } },
    table: ["8D", "9C", "10C", "JC"],
    deck: ["QC", "QD", "QH", "QS", "KC", "KD"],
  })
  const play = (state: Game, action: TurnAction) =>
    unwrap(playTurn(state, state.turn.playerId, action, random))

  it("baixar fecha o turno e completa a mão", () => {
    const next = play(game, { type: "layDown", cards: ["2C", "2D"] })
    expect(next.turn.playerId).toBe("b")
    expect(next.turn.number).toBe(game.turn.number + 1)
    expect(next.turn.usedActions).toEqual([])
    expect(getPlayer(next, "a").hand).toHaveLength(4)
  })

  it("descartar fecha o turno", () => {
    const next = play(game, { type: "discard", card: "4C" })
    expect(next.turn.playerId).toBe("b")
    expect(next.table).toContain("4C")
  })

  it("pegar da mesa fecha o turno", () => {
    const scene = buildGame({
      players: { a: { hand: ["5C", "4C", "6C", "7C"] }, b: {} },
      table: ["5H", "8D", "9C", "10C"],
      deck: ["QC", "QD"],
    })
    const next = play(scene, { type: "takeFromTable", tableCards: ["5H"], handCards: ["5C"] })
    expect(next.turn.playerId).toBe("b")
  })

  it("roubar fecha o turno", () => {
    const scene = buildGame({
      players: {
        a: { hand: ["3C", "4C", "6C", "7C"] },
        b: { melds: [meldOf("3D", "3H")] },
      },
      deck: ["QC", "QD"],
    })
    const next = play(scene, { type: "steal", targetId: "b", rank: "3", handCards: ["3C"] })
    expect(next.turn.playerId).toBe("b")
    expect(getPlayer(next, "a").melds[0]?.cards).toHaveLength(3)
  })

  it("comprar espera o descarte e só então fecha o turno", () => {
    const drew = play(game, { type: "draw" })
    expect(drew.turn.playerId).toBe("a")
    expect(getPlayer(drew, "a").hand).toHaveLength(5)
    expect(playTurn(drew, "a", { type: "layDown", cards: ["2C", "2D"] }, random)).toEqual({
      ok: false,
      error: "MUST_DISCARD",
    })

    const closed = play(drew, { type: "discard", card: "4C" })
    expect(closed.turn.playerId).toBe("b")
    expect(getPlayer(closed, "a").hand).toHaveLength(4)
  })

  it("comprar e pegar da mesa com a carta comprada fecha o turno sem descarte", () => {
    const scene = buildGame({
      players: { a: { hand: ["2C", "3C", "4C", "6C"] }, b: { hand: ["7D"] } },
      table: ["5H", "5S", "8D", "9C", "10C", "JC"],
      deck: ["5C", "QC", "QD"],
    })
    const drew = play(scene, { type: "draw" })
    expect(drew.turn.playerId).toBe("a")

    const closed = play(drew, {
      type: "takeFromTable",
      tableCards: ["5H", "5S"],
      handCards: ["5C"],
    })
    expect(closed.turn.playerId).toBe("b")
    expect(getPlayer(closed, "a").hand).toEqual(["2C", "3C", "4C", "6C"])
    expect(getPlayer(closed, "a").melds).toEqual([{ rank: "5", cards: ["5C", "5H", "5S"] }])
  })

  it("não trava quem começa o turno com 5 cartas depois que alguém saiu", () => {
    const scene = buildGame({
      players: { a: { hand: ["2C", "3C", "4C", "6C", "8C"] }, b: { hand: ["7D"] } },
      table: ["8D", "9C", "10C", "JC"],
      deck: ["QC", "QD", "QH"],
    })
    const drew = play(scene, { type: "draw" })
    expect(getPlayer(drew, "a").hand).toHaveLength(6)

    const closed = play(drew, { type: "discard", card: "2C" })
    expect(closed.turn.playerId).toBe("b")
  })

  it("comprar e baixar em quadra incompleta fecha o turno sem descarte", () => {
    const scene = buildGame({
      players: {
        a: { hand: ["2C", "3C", "4C", "6C"], melds: [meldOf("5H", "5S")] },
        b: { hand: ["7D"] },
      },
      deck: ["5C", "QC", "QD"],
    })
    const drew = play(scene, { type: "draw" })
    const closed = play(drew, { type: "layDown", cards: ["5C"] })

    expect(closed.turn.playerId).toBe("b")
    expect(getPlayer(closed, "a").hand).toEqual(["2C", "3C", "4C", "6C"])
    expect(getPlayer(closed, "a").melds[0]?.cards).toHaveLength(3)
  })

  it("comprar não libera abrir quadra nova", () => {
    const scene = buildGame({
      players: { a: { hand: ["2C", "3C", "4C", "5D"] }, b: { hand: ["7D"] } },
      deck: ["5C", "QC", "QD"],
    })
    const drew = play(scene, { type: "draw" })
    expect(playTurn(drew, "a", { type: "layDown", cards: ["5C", "5D"] }, random)).toEqual({
      ok: false,
      error: "MUST_DISCARD",
    })
  })

  it("comprar não libera avançar quadra de outro valor", () => {
    const scene = buildGame({
      players: {
        a: { hand: ["2C", "3C", "4C", "5D"], melds: [meldOf("8H", "8S")] },
        b: { hand: ["7D"] },
      },
      deck: ["5C", "QC", "QD"],
    })
    const drew = play(scene, { type: "draw" })
    expect(playTurn(drew, "a", { type: "layDown", cards: ["5C", "5D"] }, random)).toEqual({
      ok: false,
      error: "MUST_DISCARD",
    })
  })

  it("comprar e roubar leva só a quadra escolhida e deixa a completa", () => {
    const scene = buildGame({
      players: {
        a: { hand: ["2C", "3C", "4C", "6C"] },
        b: { hand: ["7D"], melds: [quadOf("10"), meldOf("5H", "5S"), meldOf("JH", "JS")] },
      },
      deck: ["5C", "QC", "QD"],
    })
    const drew = play(scene, { type: "draw" })
    const closed = play(drew, { type: "steal", targetId: "b", rank: "5", handCards: ["5C"] })

    expect(closed.turn.playerId).toBe("b")
    expect(getPlayer(closed, "a").hand).toHaveLength(4)
    expect(getPlayer(closed, "a").melds).toEqual([{ rank: "5", cards: ["5H", "5S", "5C"] }])
    expect(getPlayer(closed, "b").melds).toEqual([quadOf("10"), meldOf("JH", "JS")])
  })

  it("comprar não libera pegar o par do outro sem carta da mão", () => {
    const scene = buildGame({
      players: {
        a: { hand: ["2C", "3C", "4C", "6C"], melds: [meldOf("5C", "5D")] },
        b: { hand: ["7D"], melds: [meldOf("5H", "5S")] },
      },
      deck: ["QC", "QD", "QH"],
    })
    const drew = play(scene, { type: "draw" })
    expect(
      playTurn(drew, "a", { type: "steal", targetId: "b", rank: "5", handCards: [] }, random)
    ).toEqual({ ok: false, error: "MUST_DISCARD" })
  })

  it("comprar a última carta fecha o turno, porque o monte acabou", () => {
    const scene = buildGame({
      players: { a: { hand: ["2C", "3C", "4C", "5C"] }, b: { hand: ["6C"] } },
      table: ["8D", "9C", "10C"],
      deck: ["QC"],
    })
    const next = play(scene, { type: "draw" })
    expect(next.turn.playerId).toBe("b")
    expect(getPlayer(next, "a").hand).toHaveLength(5)
  })

  it("não fecha o turno em jogada recusada", () => {
    expect(playTurn(game, "a", { type: "layDown", cards: ["AC", "AD"] }, random)).toEqual({
      ok: false,
      error: "CARD_NOT_IN_HAND",
    })
  })

  it("permite passar a vez sem jogar", () => {
    const next = unwrap(endTurn(game, "a", random))
    expect(next.turn.playerId).toBe("b")
    expect(getPlayer(next, "a").hand).toEqual(["2C", "2D", "4C", "5C"])
  })

  it("não avança o turno quando a jogada encerra a partida", () => {
    const melds = (["A", "2", "3", "4", "5", "6", "7", "8", "9", "10", "J", "Q"] as const).map(
      (rank) => meldOf(`${rank}C`, `${rank}D`, `${rank}H`, `${rank}S`)
    )
    const scene = buildGame({
      players: { a: { hand: ["KC", "KD"], melds: [...melds, meldOf("KH", "KS")] }, b: {} },
      deck: [],
    })
    const next = play(scene, { type: "layDown", cards: ["KC", "KD"] })
    expect(next.endReason).toBe("allQuadsComplete")
    expect(next.turn.playerId).toBe("a")
  })
})
