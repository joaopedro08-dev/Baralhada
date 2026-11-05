import { describe, expect, it } from "vitest"
import type { Card } from "../../src/domain/cards/card.js"
import { getPlayer } from "../../src/domain/games/rouba-monte/model.js"
import type { Game } from "../../src/domain/games/rouba-monte/model.js"
import type { TurnAction } from "../../src/domain/games/rouba-monte/turn-actions.js"
import { expireTurn, playTurn, removePlayer } from "../../src/domain/games/rouba-monte/turn-flow.js"
import { allCardsOf, buildGame, seededRandom, unwrap } from "../support/game-builder.js"

const random = seededRandom(11)

const play = (game: Game, action: TurnAction): Game =>
  unwrap(playTurn(game, game.turn.playerId, action))

const discardFirst = (game: Game): Game =>
  play(game, { type: "discard", card: getPlayer(game, game.turn.playerId).hand[0] as Card })

describe("RN-04 e RF-10 uma jogada fecha o turno", () => {
  it("passa a vez para a direita e volta ao primeiro", () => {
    const game = buildGame({
      players: { a: { hand: ["2C", "2D"] }, b: { hand: ["3C", "3D"] }, c: { hand: ["4C"] } },
      deck: [],
      table: ["2H", "3H", "4H"],
    })
    const b = discardFirst(game)
    const c = discardFirst(b)
    const a = discardFirst(c)

    expect([b.turn.playerId, c.turn.playerId, a.turn.playerId]).toEqual(["b", "c", "a"])
    expect(a.turn.number).toBe(4)
  })

  it("não deixa o mesmo jogador jogar duas vezes", () => {
    const game = buildGame({ players: { a: { hand: ["2C", "2D"] }, b: { hand: ["3C"] } } })
    expect(playTurn(discardFirst(game), "a", { type: "discard", card: "2D" })).toEqual({
      ok: false,
      error: "NOT_YOUR_TURN",
    })
  })
})

describe("RN-10 a mão sempre volta a 4 cartas", () => {
  it("compra automaticamente a carta que falta ao fechar o turno", () => {
    const game = buildGame({
      players: { a: { hand: ["2C", "5D", "6H", "7S"] }, b: { hand: ["3C", "4C", "8C", "JC"] } },
      deck: ["KC", "KD", "KH"],
    })
    const next = discardFirst(game)

    expect(getPlayer(next, "a").hand).toEqual(["5D", "6H", "7S", "KC"])
    expect(next.deck).toEqual(["KD", "KH"])
    expect(next.events).toContainEqual({ type: "handRefilled", playerId: "a", count: 1 })
  })

  it("completa até 4 qualquer mão menor", () => {
    const game = buildGame({
      players: { a: { hand: ["2C"] }, b: { hand: ["3C", "4C", "8C", "JC"] } },
      deck: ["KC", "KD", "KH", "KS", "QC"],
    })
    const next = discardFirst(game)

    expect(getPlayer(next, "a").hand).toEqual(["KC", "KD", "KH", "KS"])
    expect(next.events).toContainEqual({ type: "handRefilled", playerId: "a", count: 4 })
  })

  it("entrega só as que restam no baralho", () => {
    const game = buildGame({
      players: { a: { hand: ["2C"] }, b: { hand: ["3C", "4C", "8C", "JC"] } },
      deck: ["KC", "KD"],
    })
    expect(getPlayer(discardFirst(game), "a").hand).toEqual(["KC", "KD"])
  })
})

describe("comprar 1 carta", () => {
  const scene = (deck: readonly Card[] = ["KC", "KD", "KH"]) =>
    buildGame({
      players: { a: { hand: ["2C", "5D", "6H", "7S"] }, b: { hand: ["3C", "4C", "8C", "JC"] } },
      deck,
    })

  it("compra sem fechar o turno e fica com 5 cartas", () => {
    const next = play(scene(), { type: "draw" })

    expect(getPlayer(next, "a").hand).toEqual(["2C", "5D", "6H", "7S", "KC"])
    expect(next.deck).toEqual(["KD", "KH"])
    expect(next.turn).toEqual({ number: 1, playerId: "a", drew: true })
    expect(next.events.at(-1)).toEqual({ type: "drew", playerId: "a" })
  })

  it("com 5 cartas, a jogada fecha o turno e a mão fica com 4", () => {
    const drew = play(scene(), { type: "draw" })
    const next = play(drew, { type: "discard", card: "2C" })

    expect(getPlayer(next, "a").hand).toEqual(["5D", "6H", "7S", "KC"])
    expect(next.turn).toEqual({ number: 2, playerId: "b", drew: false })
    expect(next.deck).toEqual(["KD", "KH"])
  })

  it("não deixa comprar duas vezes no mesmo turno", () => {
    const drew = play(scene(), { type: "draw" })
    expect(playTurn(drew, "a", { type: "draw" })).toEqual({ ok: false, error: "ALREADY_DREW" })
  })

  it("não compra com o baralho vazio", () => {
    expect(playTurn(scene([]), "a", { type: "draw" })).toEqual({
      ok: false,
      error: "DECK_EMPTY",
    })
  })
})

describe("RN-11 reposição da mesa", () => {
  it("volta a 8 cartas quando fica com menos de 3, depois de completar a mão", () => {
    const game = buildGame({
      players: {
        a: { hand: ["9C", "2D", "3D", "4D"] },
        b: { hand: ["3C", "4C", "8C", "JC"] },
      },
      table: ["9H", "4S", "5S"],
      deck: ["KC", "KD", "KH", "KS", "QC", "QD", "QH", "QS"],
    })
    const next = play(game, { type: "capture", card: "9C", tableCards: ["9H"] })

    expect(getPlayer(next, "a").hand).toEqual(["2D", "3D", "4D", "KC"])
    expect(next.table).toEqual(["4S", "5S", "KD", "KH", "KS", "QC", "QD", "QH"])
    expect(next.events).toContainEqual({ type: "tableReplenished", count: 6 })
  })

  it("não mexe na mesa com 3 cartas ou mais", () => {
    const game = buildGame({
      players: { a: { hand: ["9C", "2D"] }, b: { hand: ["3C"] } },
      table: ["9H", "4S", "5S", "6S"],
    })
    const next = play(game, { type: "capture", card: "9C", tableCards: ["9H"] })
    expect(next.table).toEqual(["4S", "5S", "6S"])
  })
})

describe("RN-12 baralho vazio", () => {
  it("pula quem está sem cartas", () => {
    const game = buildGame({
      players: { a: { hand: ["2C", "8D"] }, b: {}, c: { hand: ["2D", "3D"] } },
      table: ["4S", "5S", "6S"],
      deck: [],
    })
    expect(discardFirst(game).turn.playerId).toBe("c")
  })
})

describe("RN-13 e RN-14 fim da partida", () => {
  it("termina quando o baralho acabou e ninguém consegue capturar nem roubar", () => {
    const game = buildGame({
      players: {
        a: { hand: ["2C", "5D"], pile: ["9C", "9D"] },
        b: { hand: ["3C"], pile: ["8C"] },
      },
      table: ["4S", "5S", "6S"],
      deck: [],
    })
    const next = play(game, { type: "capture", card: "5D", tableCards: ["5S"] })

    expect(next.endReason).toBe("noPlaysLeft")
    expect(next.winnerIds).toEqual(["a"])
  })

  it("continua enquanto alguém ainda tem jogada que pontua", () => {
    const game = buildGame({
      players: { a: { hand: ["2C", "5D"] }, b: { hand: ["2H"] } },
      table: ["4S", "6S", "7S"],
      deck: [],
    })
    const next = play(game, { type: "discard", card: "2C" })

    expect(next.endReason).toBeNull()
    expect(next.turn.playerId).toBe("b")
  })

  it("termina quando todas as mãos ficam vazias", () => {
    const game = buildGame({
      players: { a: { hand: ["9C"], pile: ["2C"] }, b: { pile: ["3C", "3D"] } },
      table: ["9H", "4S", "5S"],
      deck: [],
    })
    const next = play(game, { type: "capture", card: "9C", tableCards: ["9H"] })

    expect(next.endReason).toBe("handsEmpty")
    expect(next.winnerIds).toEqual(["a"])
  })

  it("declara todos os empatados vencedores", () => {
    const game = buildGame({
      players: { a: { hand: ["2C"], pile: ["9C"] }, b: { pile: ["3C", "3D", "3H"] } },
      table: ["2S", "5S", "6S"],
      deck: [],
    })
    const next = play(game, { type: "capture", card: "2C", tableCards: ["2S"] })
    expect(next.winnerIds).toEqual(["a", "b"])
  })

  it("recusa jogadas depois do fim", () => {
    const game = buildGame({ players: { a: { hand: ["2C"] }, b: {} } })
    const finished: Game = { ...game, endReason: "handsEmpty" }
    expect(playTurn(finished, "a", { type: "discard", card: "2C" })).toEqual({
      ok: false,
      error: "GAME_FINISHED",
    })
  })
})

describe("RN-17 tempo de turno", () => {
  const game = buildGame({
    players: { a: { hand: ["2C", "3D", "4H", "5S"] }, b: { hand: ["4C", "6C", "7C", "8C"] } },
  })

  it("descarta 1 carta aleatória, completa a mão e passa a vez", () => {
    const next = expireTurn(game, random)
    const discarded = next.table.at(-1) as Card

    expect(["2C", "3D", "4H", "5S"]).toContain(discarded)
    expect(getPlayer(next, "a").hand).toHaveLength(4)
    expect(getPlayer(next, "a").hand).not.toContain(discarded)
    expect(next.turn).toEqual({ number: 2, playerId: "b", drew: false })
    expect(next.events).toContainEqual({ type: "turnTimedOut", playerId: "a" })
  })

  it("depois de comprar, descarta 1 das 5 cartas", () => {
    const drew = play(game, { type: "draw" })
    const next = expireTurn(drew, random)

    expect(getPlayer(next, "a").hand).toHaveLength(4)
    expect(next.table).toHaveLength(drew.table.length + 1)
    expect(next.deck).toEqual(drew.deck)
  })

  it("não mexe em partida encerrada", () => {
    const finished: Game = { ...game, endReason: "abandoned" }
    expect(expireTurn(finished, random)).toBe(finished)
  })
})

describe("RN-16 jogador sai no meio da partida", () => {
  const game = buildGame({
    players: {
      a: { hand: ["2C", "3C"], pile: ["5C", "5D"] },
      b: { hand: ["4C"], pile: ["6C"] },
      c: { hand: ["7C"] },
    },
  })

  it("devolve mão e monte ao baralho embaralhado", () => {
    const next = removePlayer(game, "b", random)

    expect(next.players.map((player) => player.id)).toEqual(["a", "c"])
    expect(next.deck).toHaveLength(game.deck.length + 2)
    expect(next.deck).toEqual(expect.arrayContaining(["4C", "6C"]))
    expect(allCardsOf(next)).toHaveLength(allCardsOf(game).length)
    expect(next.turn).toEqual(game.turn)
  })

  it("passa a vez quando quem saiu era o jogador da vez", () => {
    expect(removePlayer(game, "a", random).turn).toEqual({
      number: 2,
      playerId: "b",
      drew: false,
    })
  })

  it("encerra como abandonada quando sobra 1 jogador", () => {
    const pair = buildGame({ players: { a: { hand: ["2C"] }, b: { hand: ["3C"] } } })
    const next = removePlayer(pair, "a", random)

    expect(next.endReason).toBe("abandoned")
    expect(next.winnerIds).toEqual(["b"])
  })

  it("completa as mãos quando o baralho volta a ter cartas", () => {
    const stuck = buildGame({
      players: { a: { hand: ["2C"], pile: ["8C"] }, b: { hand: ["3C"] }, c: {} },
      table: ["3S", "5S", "6S"],
      deck: [],
    })
    const next = removePlayer(stuck, "a", random)

    expect(getPlayer(next, "b").hand.length + getPlayer(next, "c").hand.length).toBe(3)
    expect(next.deck).toEqual([])
    expect(next.turn.playerId).toBe("b")
  })

  it("ignora saídas depois do fim", () => {
    const finished: Game = { ...game, endReason: "handsEmpty" }
    expect(removePlayer(finished, "a", random)).toBe(finished)
  })
})
