import { describe, expect, it } from "vitest"
import { computeHints } from "../../src/domain/games/rouba-monte/hints.js"
import type { Game } from "../../src/domain/games/rouba-monte/model.js"
import { countRanksInPiles, toPlayerView } from "../../src/domain/games/rouba-monte/player-view.js"
import { startGame } from "../../src/domain/games/rouba-monte/setup.js"
import { buildGame, seededRandom, unwrap } from "../support/game-builder.js"

const hintsOf = (game: Game, viewerId: string) =>
  computeHints(toPlayerView(game, viewerId), countRanksInPiles(game))

describe("RN-15 e RNF-04 visibilidade", () => {
  const seats = ["a", "b", "c"].map((id) => ({ id, nickname: id }))
  const game = unwrap(startGame(seats, "a", seededRandom(5)))
  const withPiles = buildGame({
    players: { a: { hand: ["2C"] }, b: { hand: ["3C"], pile: ["5C", "6D", "7H"] } },
  })

  it("mostra só a mão do próprio jogador", () => {
    const serialized = JSON.stringify(toPlayerView(game, "a"))
    const others = game.players.filter((player) => player.id !== "a")
    for (const card of others.flatMap((player) => player.hand)) {
      expect(serialized).not.toContain(`"${card}"`)
    }
    for (const card of game.players[0]?.hand ?? []) expect(serialized).toContain(`"${card}"`)
  })

  it("nunca revela a ordem do baralho de compra", () => {
    const serialized = JSON.stringify(toPlayerView(game, "b"))
    for (const card of game.deck) expect(serialized).not.toContain(`"${card}"`)
  })

  it("mostra o topo e o tamanho dos montes, mas não as cartas de baixo", () => {
    const view = toPlayerView(withPiles, "a")
    const serialized = JSON.stringify(view)

    expect(view.players[1]).toMatchObject({ pileSize: 3, pileTop: "7H", handSize: 1 })
    expect(serialized).not.toContain('"5C"')
    expect(serialized).not.toContain('"6D"')
  })

  it("mostra o tamanho das mãos e do baralho", () => {
    const view = toPlayerView(game, "b")
    expect(view.deckSize).toBe(game.deck.length)
    expect(view.players.map((player) => player.handSize)).toEqual([4, 4, 4])
  })

  it("quem saiu da partida vira espectador sem cartas", () => {
    expect(toPlayerView(game, "ausente").hand).toEqual([])
  })
})

describe("RF-16 e RF-17 jogadas possíveis", () => {
  const scene = buildGame({
    players: {
      a: { hand: ["5C", "3C", "KS", "2D"], pile: ["2H"] },
      b: { pile: ["9C", "8D", "3D"] },
      c: { pile: ["4C"] },
    },
    table: ["5H", "9D", "JD"],
  })

  it("ordena da melhor para a pior e lista o descarte por último", () => {
    const { plays } = hintsOf(scene, "a")
    const scores = plays.map((play) => play.score)

    expect(scores).toEqual([...scores].sort((first, second) => second - first))
    expect(plays[0]).toMatchObject({ kind: "steal", targetId: "b", gainedCards: 4 })
    expect(plays.at(-1)?.kind).toBe("discard")
  })

  it("inclui capturar, pôr no monte, roubar e descartar", () => {
    const kinds = hintsOf(scene, "a").plays.map((play) => play.kind)
    expect(new Set(kinds)).toEqual(new Set(["steal", "capture", "stack", "discard"]))
  })

  it("destaca as cartas da mão, da mesa e os topos que podem ser usados", () => {
    const { highlights } = hintsOf(scene, "a")
    expect(new Set(highlights.handCards)).toEqual(new Set(["5C", "3C", "2D"]))
    expect(highlights.tableCards).toEqual(["5H"])
    expect(new Set(highlights.piles)).toEqual(new Set(["a", "b"]))
  })

  it("não sugere nada fora da vez", () => {
    expect(hintsOf(scene, "b").plays).toEqual([])
  })

  it("não sugere nada com a partida encerrada", () => {
    expect(hintsOf({ ...scene, endReason: "noPlaysLeft" }, "a").plays).toEqual([])
  })
})

describe("RF-18 alerta de risco", () => {
  it("avisa quantas cartas do valor do topo ainda não apareceram", () => {
    const game = buildGame({
      players: { a: { hand: ["7C"], pile: ["2C", "7D"] }, b: {} },
      table: ["4S", "5S", "6S"],
    })
    expect(hintsOf(game, "a").risk).toEqual({ rank: "7", pileSize: 2, unseenCards: 2 })
  })

  it("não avisa quando todas as cartas do valor já apareceram", () => {
    const game = buildGame({
      players: { a: { hand: ["7C"], pile: ["7D"] }, b: { pile: ["7H", "7S"] } },
      table: ["4S", "5S", "6S"],
    })
    expect(hintsOf(game, "a").risk).toBeNull()
  })

  it("não avisa sem monte", () => {
    expect(hintsOf(buildGame({ players: { a: { hand: ["7C"] }, b: {} } }), "a").risk).toBeNull()
  })
})

describe("RF-19 e RF-20 contador e informação pública", () => {
  const base = buildGame({
    players: { a: { hand: ["7C", "AS"] }, b: { hand: ["7D"], pile: ["7H", "KC"] } },
    table: ["7S", "AH"],
    deck: ["2C", "3C"],
  })

  it("conta as cartas que já apareceram na mesa, na mão e nos montes", () => {
    const counts = hintsOf(base, "a").cardCounts
    expect(counts.find((count) => count.rank === "7")).toEqual({
      rank: "7",
      visible: 3,
      missing: 1,
    })
    expect(counts).toHaveLength(13)
  })

  it("dá as mesmas dicas mesmo quando as cartas escondidas mudam", () => {
    const shuffled: Game = {
      ...base,
      deck: ["7D", "2C"],
      players: base.players.map((player) =>
        player.id === "b" ? { ...player, hand: ["3C"] } : player
      ),
    }
    expect(hintsOf(shuffled, "a")).toEqual(hintsOf(base, "a"))
  })
})
