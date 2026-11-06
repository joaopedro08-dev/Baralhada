import { describe, expect, it } from "vitest"
import { createFullDeck } from "../../src/domain/cards/card.js"
import type { Card } from "../../src/domain/cards/card.js"
import {
  expireTrincas,
  playTrincas,
  removeTrincasPlayer,
} from "../../src/domain/games/tres-trincas/actions.js"
import type { TrincaAction } from "../../src/domain/games/tres-trincas/actions.js"
import { computeTrincaHints } from "../../src/domain/games/tres-trincas/hints.js"
import { getPlayer, WIN_PAUSE_MS } from "../../src/domain/games/tres-trincas/model.js"
import type { TrincaGame } from "../../src/domain/games/tres-trincas/model.js"
import { toTrincaView, trincaMovesOf } from "../../src/domain/games/tres-trincas/player-view.js"
import { trincasPauseAfter, tresTrincasRules } from "../../src/domain/games/tres-trincas/rules.js"
import {
  findSets,
  isSet,
  jokersFor,
  splitIntoSets,
} from "../../src/domain/games/tres-trincas/sets.js"
import { startGame } from "../../src/domain/games/tres-trincas/setup.js"
import type { Seat } from "../../src/domain/shared/seat.js"
import { seededRandom, unwrap } from "../support/game-builder.js"
import { allTrincaCards, buildTrincas } from "../support/trincas-builder.js"

const random = seededRandom(11)
const jokers = jokersFor("5C")

const seats = (count: number): readonly Seat[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    nickname: `P${index}`,
    team: null,
  }))

const act = (game: TrincaGame, playerId: string, action: TrincaAction): TrincaGame =>
  unwrap(playTrincas(game, playerId, action, random))

const refusal = (game: TrincaGame, playerId: string, action: TrincaAction) => {
  const result = playTrincas(game, playerId, action, random)
  return result.ok ? "aceita" : result.error
}

const handOf = (game: TrincaGame, playerId: string) => getPlayer(game, playerId).hand

const draw: TrincaAction = { type: "draw" }
const discard = (card: Card): TrincaAction => ({ type: "discard", card })
const meld = (...cards: Card[]): TrincaAction => ({ type: "meld", cards })

const SEVEN: readonly Card[] = ["9C", "9D", "9H", "KC", "KD", "3S", "7H"]

describe("TT-RN-01 a TT-RN-04 preparação", () => {
  it("aceita de 2 a 4 jogadores", () => {
    expect(tresTrincasRules.playerCounts).toEqual([2, 3, 4])
    expect(startGame(seats(1), "p0", random)).toEqual({
      ok: false,
      error: "INVALID_PLAYER_COUNT",
    })
    expect(startGame(seats(5), "p0", random)).toEqual({
      ok: false,
      error: "INVALID_PLAYER_COUNT",
    })
  })

  it("dá 7 cartas a cada um, vira 1 carta e o resto forma o monte", () => {
    const game = unwrap(startGame(seats(4), "p2", random))
    expect(game.players.map((player) => player.hand.length)).toEqual([7, 7, 7, 7])
    expect(game.stock).toHaveLength(52 - 28 - 1)
    expect(game.discard).toEqual([])
    expect([...allTrincaCards(game)].sort()).toEqual([...createFullDeck()].sort())
    expect(game.events).toEqual([{ type: "dealt", vira: game.vira }])
  })

  it("começa por quem a sala sorteou e segue a ordem de entrada", () => {
    const game = unwrap(startGame(seats(3), "p2", random))
    expect(game.turn).toEqual({ number: 1, playerId: "p2", stage: "start" })
    const card = handOf(game, "p2")[0] as Card
    const next = act(act(game, "p2", draw), "p2", discard(card))
    expect(next.turn).toEqual({ number: 2, playerId: "p0", stage: "start" })
  })
})

describe("TT-RN-05 a TT-RN-08 trincas e coringa", () => {
  it("forma trinca com 3 cartas do mesmo valor, sem olhar o naipe", () => {
    expect(isSet(["7C", "7H", "7D"], jokers)).toBe(true)
    expect(isSet(["7C", "7H", "8D"], jokers)).toBe(false)
    expect(isSet(["7C", "7H"], jokers)).toBe(false)
  })

  it("aceita o 2 como coringa com par, com uma carta e sozinho", () => {
    expect(isSet(["9C", "9H", "2D"], jokers)).toBe(true)
    expect(isSet(["9C", "2H", "2D"], jokers)).toBe(true)
    expect(isSet(["2C", "2H", "2D"], jokers)).toBe(true)
    expect(isSet(["9C", "10H", "2D"], jokers)).toBe(false)
  })

  it("não deixa o valor do vira formar trinca, nem com coringa", () => {
    expect(isSet(["5D", "5H", "5S"], jokers)).toBe(false)
    expect(isSet(["5D", "5H", "2S"], jokers)).toBe(false)
    const game = buildTrincas({
      players: { a: { hand: ["5D", "5H", "2S", "9C", "KD", "3S", "7H"] }, b: {} },
    })
    expect(refusal(game, "a", meld("5D", "5H", "2S"))).toBe("DEAD_CARD")
    const discarded = act(act(game, "a", draw), "a", discard("5D"))
    expect(discarded.discard).toEqual(["5D"])
  })

  it("com vira 2, o 2 fica morto e o valete vira coringa", () => {
    const backup = jokersFor("2H")
    expect(backup).toEqual({ dead: "2", wild: "J" })
    expect(isSet(["9C", "9H", "JD"], backup)).toBe(true)
    expect(isSet(["9C", "9H", "2D"], backup)).toBe(false)
    expect(isSet(["JC", "JH", "JD"], backup)).toBe(true)
  })

  it("separa 6 cartas em duas trincas quando a ordem engana", () => {
    expect(splitIntoSets(["9C", "2H", "9D", "9H", "KC", "KD"], jokers)).toEqual([
      ["9C", "9D", "9H"],
      ["2H", "KC", "KD"],
    ])
    expect(splitIntoSets(["9C", "9D", "KC", "KD", "QC", "2H"], jokers)).toBeNull()
  })

  it("acha o maior número de trincas gastando o mínimo de coringas", () => {
    expect(findSets(["9C", "9D", "9H", "9S", "KC", "2H", "2D"], jokers)).toEqual([
      ["9C", "9D", "9H"],
      ["9S", "2H", "2D"],
    ])
    expect(findSets(["QC", "QD", "KC", "KD", "2H", "AC", "7D"], jokers)).toEqual([
      ["QC", "QD", "2H"],
    ])
  })
})

describe("TT-RN-09 e TT-RN-10 vez normal e baixar", () => {
  const game = buildTrincas({ players: { a: { hand: SEVEN }, b: {} } })

  it("compra 1 do monte e descarta 1, e a vez passa", () => {
    const drawn = act(game, "a", draw)
    expect(handOf(drawn, "a")).toEqual([...SEVEN, "AC"])
    expect(drawn.stock).toHaveLength(5)
    expect(drawn.turn.stage).toBe("drawn")
    const done = act(drawn, "a", discard("7H"))
    expect(handOf(done, "a")).toHaveLength(7)
    expect(done.discard).toEqual(["7H"])
    expect(done.turn).toEqual({ number: 2, playerId: "b", stage: "start" })
  })

  it("não descarta sem comprar nem compra duas vezes", () => {
    expect(refusal(game, "a", discard("7H"))).toBe("DRAW_FIRST")
    expect(refusal(act(game, "a", draw), "a", draw)).toBe("ALREADY_DREW")
    expect(refusal(game, "b", draw)).toBe("NOT_YOUR_TURN")
    expect(refusal(act(game, "a", draw), "a", discard("QS"))).toBe("CARD_NOT_IN_HAND")
  })

  it("baixar é escolha do jogador e a trinca fica à vista de todos", () => {
    const melded = act(game, "a", meld("9C", "9D", "9H"))
    expect(toTrincaView(melded, "b").players[0]?.sets).toEqual([["9C", "9D", "9H"]])
    expect(toTrincaView(melded, "b").hand).toEqual([])
  })
})

describe("TT-RN-11 a TT-RN-13 a mão diminui a cada trinca", () => {
  it("com 7 cartas, baixa uma trinca sem comprar e fica com 4", () => {
    const game = buildTrincas({ players: { a: { hand: SEVEN }, b: {} } })
    const melded = act(game, "a", meld("9C", "9D", "9H"))
    expect(handOf(melded, "a")).toEqual(["KC", "KD", "3S", "7H"])
    expect(melded.stock).toHaveLength(6)
    expect(melded.turn).toEqual({ number: 2, playerId: "b", stage: "start" })
  })

  it("com duas trincas, baixa as duas, compra 1 obrigatoriamente e fica com 2", () => {
    const hand: readonly Card[] = ["9C", "9D", "9H", "KC", "KD", "2S", "7H"]
    const game = buildTrincas({ players: { a: { hand }, b: {} } })
    const melded = act(game, "a", meld("9C", "9D", "9H", "KC", "KD", "2S"))
    expect(getPlayer(melded, "a").sets).toHaveLength(2)
    expect(handOf(melded, "a")).toEqual(["7H", "AC"])
    expect(melded.turn.playerId).toBe("b")
  })

  it("com 7 cartas não baixa depois de comprar", () => {
    const game = buildTrincas({ players: { a: { hand: SEVEN }, b: {} } })
    expect(refusal(act(game, "a", draw), "a", meld("9C", "9D", "9H"))).toBe("MELD_ONLY_AT_START")
  })

  it("com 4 cartas a compra é obrigatória e a trinca deixa 2", () => {
    const game = buildTrincas({
      players: { a: { hand: ["KC", "KD", "3S", "7H"], sets: [["9C", "9D", "9H"]] }, b: {} },
      stock: ["KH", "AC"],
    })
    expect(refusal(game, "a", meld("KC", "KD", "3S"))).toBe("DRAW_BEFORE_MELD")
    expect(trincaMovesOf(game, "a")).toEqual({ draw: true, discard: false, meldLimit: 0 })
    const drawn = act(game, "a", draw)
    expect(trincaMovesOf(drawn, "a")).toEqual({ draw: false, discard: true, meldLimit: 1 })
    expect(refusal(drawn, "a", meld("KC", "KD", "3S"))).toBe("NOT_A_SET")
    const melded = act(drawn, "a", meld("KC", "KD", "KH"))
    expect(handOf(melded, "a")).toEqual(["3S", "7H"])
    expect(melded.turn.playerId).toBe("b")
    const passed = act(drawn, "a", discard("3S"))
    expect(handOf(passed, "a")).toHaveLength(4)
  })

  it("só baixa uma trinca por vez depois da primeira", () => {
    const game = buildTrincas({
      players: {
        a: { hand: ["KC", "KD", "KH", "7H"], sets: [["9C", "9D", "9H"]] },
        b: {},
      },
      stock: ["7C"],
    })
    const drawn = act(game, "a", draw)
    expect(refusal(drawn, "a", meld("KC", "KD"))).toBe("WRONG_MELD_SIZE")
  })

  it("com 2 cartas, compra e vence com a mão vazia se formar a terceira trinca", () => {
    const sets = [
      ["9C", "9D", "9H"],
      ["KC", "KD", "KH"],
    ] as const
    const game = buildTrincas({
      players: { a: { hand: ["QC", "QD"], sets }, b: {} },
      stock: ["2H", "AC"],
    })
    const drawn = act(game, "a", draw)
    const won = act(drawn, "a", meld("QC", "QD", "2H"))
    expect(won.endReason).toBe("sets")
    expect(won.winnerId).toBe("a")
    expect(handOf(won, "a")).toEqual([])
    expect(won.events.at(-1)).toEqual({ type: "won", playerId: "a" })
  })

  it("com 2 cartas, se não formar, descarta e continua com 2", () => {
    const game = buildTrincas({
      players: {
        a: {
          hand: ["QC", "QD"],
          sets: [
            ["9C", "9D", "9H"],
            ["KC", "KD", "KH"],
          ],
        },
        b: {},
      },
      stock: ["7S", "AC"],
    })
    const passed = act(act(game, "a", draw), "a", discard("7S"))
    expect(handOf(passed, "a")).toEqual(["QC", "QD"])
    expect(passed.endReason).toBeNull()
  })
})

describe("TT-RN-14 monte de compra refeito", () => {
  it("embaralha o descarte quando o monte acaba", () => {
    const game = buildTrincas({
      players: { a: { hand: SEVEN }, b: {} },
      stock: ["AC"],
      discard: ["4C", "4D", "6H"],
    })
    const drawn = act(game, "a", draw)
    expect(drawn.discard).toEqual([])
    expect([...drawn.stock].sort()).toEqual(["4C", "4D", "6H"])
    expect(drawn.events.at(-1)).toEqual({ type: "restocked", count: 3 })
  })

  it("refaz o monte antes de comprar se ele estava vazio", () => {
    const game = buildTrincas({
      players: { a: { hand: SEVEN }, b: {} },
      stock: [],
      discard: ["4C"],
    })
    const drawn = act(game, "a", draw)
    expect(handOf(drawn, "a")).toContain("4C")
    expect(drawn.discard).toEqual([])
  })
})

describe("TT-RN-15 fim", () => {
  const game = buildTrincas({
    players: {
      a: {
        hand: ["QC", "QD", "QH"],
        sets: [
          ["9C", "9D", "9H"],
          ["KC", "KD", "KH"],
        ],
      },
      b: {},
    },
    turn: { stage: "drawn" },
  })

  it("termina na hora com a terceira trinca e segura a mesa um instante", () => {
    const won = act(game, "a", meld("QC", "QD", "QH"))
    expect(refusal(won, "b", draw)).toBe("GAME_FINISHED")
    expect(trincasPauseAfter(game, won)).toBe(WIN_PAUSE_MS)
    expect(trincasPauseAfter(won, won)).toBe(0)
    expect(trincasPauseAfter(game, game)).toBe(0)
  })
})

describe("TT-RN-16 visibilidade", () => {
  it("mostra só a própria mão e deixa público o resto", () => {
    const game = buildTrincas({
      players: { a: { hand: SEVEN, sets: [["QC", "QD", "QH"]] }, b: { hand: ["3C", "3D"] } },
      discard: ["4C", "6H"],
    })
    const view = toTrincaView(game, "b")
    expect(view.hand).toEqual(["3C", "3D"])
    expect(view.players).toEqual([
      { id: "a", nickname: "A", handSize: 7, sets: [["QC", "QD", "QH"]] },
      { id: "b", nickname: "B", handSize: 2, sets: [] },
    ])
    expect(view).toMatchObject({
      vira: "5C",
      deadRank: "5",
      wildRank: "2",
      stockSize: 6,
      discardTop: "6H",
      discardSize: 2,
    })
    expect(JSON.stringify(view)).not.toContain("9C")
    expect(view.moves).toEqual({ draw: false, discard: false, meldLimit: 0 })
  })
})

describe("TT-RN-17 tempo de turno", () => {
  it("compra e descarta uma carta aleatória por quem não jogou", () => {
    const game = buildTrincas({ players: { a: { hand: SEVEN }, b: {} } })
    const expired = expireTrincas(game, random)
    expect(handOf(expired, "a")).toHaveLength(7)
    expect(expired.discard).toHaveLength(1)
    expect(expired.turn).toEqual({ number: 2, playerId: "b", stage: "start" })
    expect(expired.events[0]).toEqual({ type: "timedOut", playerId: "a" })
  })

  it("só descarta quando o jogador já tinha comprado", () => {
    const drawn = act(buildTrincas({ players: { a: { hand: SEVEN }, b: {} } }), "a", draw)
    const expired = expireTrincas(drawn, random)
    expect(handOf(expired, "a")).toHaveLength(7)
    expect(expired.stock).toEqual(drawn.stock)
    expect(expired.turn.playerId).toBe("b")
  })
})

describe("TT-RN-18 saída no meio da partida", () => {
  const game = buildTrincas({
    players: {
      a: { hand: ["KC", "KD", "3S", "7H"], sets: [["9C", "9D", "9H"]] },
      b: { hand: SEVEN.slice(0, 2) },
      c: { hand: ["4C"] },
    },
  })

  it("devolve a mão e as trincas ao monte e a partida segue", () => {
    const reduced = removeTrincasPlayer(game, "a", random)
    expect(reduced.players.map((player) => player.id)).toEqual(["b", "c"])
    expect(reduced.stock).toHaveLength(6 + 7)
    expect(reduced.turn).toEqual({ number: 2, playerId: "b", stage: "start" })
    expect(reduced.endReason).toBeNull()
    expect(reduced.events).toEqual([{ type: "playerLeft", playerId: "a", returnedCount: 7 }])
  })

  it("mantém a vez de quem estava jogando", () => {
    expect(removeTrincasPlayer(game, "c", random).turn.playerId).toBe("a")
  })

  it("termina quando sobra 1 jogador, que vence", () => {
    const alone = removeTrincasPlayer(removeTrincasPlayer(game, "c", random), "b", random)
    expect(alone.endReason).toBe("abandoned")
    expect(alone.winnerId).toBe("a")
    expect(removeTrincasPlayer(alone, "a", random)).toBe(alone)
  })
})

describe("TT-RF-10 e TT-RF-11 dicas", () => {
  const hintsFor = (game: TrincaGame, viewerId: string) =>
    computeTrincaHints(toTrincaView(game, viewerId))

  it("agrupa a mão por valor, com coringas e o valor morto no fim", () => {
    const game = buildTrincas({
      players: { a: { hand: ["5D", "KC", "2H", "9C", "KD", "9D", "9H"] }, b: {} },
    })
    expect(hintsFor(game, "a").groups).toEqual([
      { rank: "9", role: "natural", cards: ["9C", "9D", "9H"] },
      { rank: "K", role: "natural", cards: ["KC", "KD"] },
      { rank: "2", role: "wild", cards: ["2H"] },
      { rank: "5", role: "dead", cards: ["5D"] },
    ])
  })

  it("destaca as trincas prontas e sugere baixar as duas com 7 cartas", () => {
    const game = buildTrincas({
      players: { a: { hand: ["5D", "KC", "2H", "9C", "KD", "9D", "9H"] }, b: {} },
    })
    const hints = hintsFor(game, "a")
    expect(hints.ready).toEqual([
      ["9C", "9D", "9H"],
      ["KC", "KD", "2H"],
    ])
    expect(hints.suggestions).toEqual([
      {
        action: { type: "meld", cards: ["9C", "9D", "9H", "KC", "KD", "2H"] },
        advice: "meldTwo",
        ranks: ["9", "K"],
      },
      { action: { type: "draw" }, advice: "draw", ranks: [] },
    ])
  })

  it("sugere descartar o valor morto e guardar a trinca para a próxima vez", () => {
    const game = buildTrincas({
      players: { a: { hand: [...SEVEN.slice(0, 6), "5D"] }, b: {} },
      turn: { stage: "drawn" },
    })
    expect(hintsFor(game, "a").suggestions).toEqual([
      { action: { type: "discard", card: "5D" }, advice: "discardDead", ranks: ["5"] },
    ])
    const kept = buildTrincas({
      players: { a: { hand: ["9C", "9D", "9H", "KC", "KD", "QS", "7H", "AC"] }, b: {} },
      turn: { stage: "drawn" },
    })
    expect(hintsFor(kept, "a").suggestions[0]?.advice).toBe("discardKeepingSet")
  })

  it("avisa quando a trinca vence a partida", () => {
    const game = buildTrincas({
      players: {
        a: {
          hand: ["QC", "QD", "2H"],
          sets: [
            ["9C", "9D", "9H"],
            ["KC", "KD", "KH"],
          ],
        },
        b: {},
      },
      turn: { stage: "drawn" },
    })
    expect(hintsFor(game, "a").suggestions[0]).toMatchObject({ advice: "meldLast" })
  })

  it("usa só a própria mão e o que é público", () => {
    const base = { a: { hand: SEVEN }, b: { hand: ["3C", "3D"] as Card[] } }
    const other = { a: { hand: SEVEN }, b: { hand: ["QC", "QD"] as Card[] } }
    expect(hintsFor(buildTrincas({ players: base }), "a")).toEqual(
      hintsFor(buildTrincas({ players: other }), "a")
    )
  })
})
