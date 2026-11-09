import { describe, expect, it } from "vitest"
import { createFullDeck } from "../../src/domain/cards/card.js"
import type { Card } from "../../src/domain/cards/card.js"
import {
  expireCacheta,
  playCacheta,
  removeCachetaPlayer,
} from "../../src/domain/games/cacheta/actions.js"
import type { CachetaAction } from "../../src/domain/games/cacheta/actions.js"
import { computeCachetaHints } from "../../src/domain/games/cacheta/hints.js"
import { DEAL_PAUSE_MS, getPlayer, KNOCK_PAUSE_MS } from "../../src/domain/games/cacheta/model.js"
import type { CachetaGame } from "../../src/domain/games/cacheta/model.js"
import { cachetaMovesOf, toCachetaView } from "../../src/domain/games/cacheta/player-view.js"
import { cachetaPauseAfter, cachetaRules } from "../../src/domain/games/cacheta/rules.js"
import { startGame } from "../../src/domain/games/cacheta/setup.js"
import type { Seat } from "../../src/domain/shared/seat.js"
import { seededRandom, unwrap } from "../support/game-builder.js"
import { allCachetaCards, buildCacheta } from "../support/cacheta-builder.js"

const random = seededRandom(7)

const seats = (count: number): readonly Seat[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    nickname: `P${index}`,
    team: null,
  }))

const act = (game: CachetaGame, playerId: string, action: CachetaAction): CachetaGame =>
  unwrap(playCacheta(game, playerId, action, random))

const refusal = (game: CachetaGame, playerId: string, action: CachetaAction) => {
  const result = playCacheta(game, playerId, action, random)
  return result.ok ? null : result.error
}

const MELDED: readonly Card[] = ["7H", "7C", "7D", "2S", "3S", "4S", "9D", "10D", "JD"]
const DIRTY: readonly Card[] = ["7H", "7C", "6D", "2S", "3S", "4S", "9D", "10D", "JD"]
const LOOSE: readonly Card[] = ["7H", "8C", "2S", "4S", "9D", "JD", "KC", "QH", "4D"]

const knockReady = (hand: readonly Card[] = MELDED, others: Record<string, number> = {}) =>
  buildCacheta({
    players: {
      ana: { hand: [...hand, "KC"] },
      beto: { hand: LOOSE, points: others.beto ?? 10 },
      caio: { hand: LOOSE, points: others.caio ?? 10 },
    },
    turn: { stage: "drawn", drawn: "KC" },
  })

const counts = (cards: readonly Card[]) => {
  const tally = new Map<Card, number>()
  for (const card of cards) tally.set(card, (tally.get(card) ?? 0) + 1)
  return tally
}

describe("CA-RN-01 a CA-RN-06 preparação", () => {
  it("aceita de 2 a 4 jogadores", () => {
    expect(startGame(seats(1), "p0", random)).toEqual({ ok: false, error: "CACHETA_PLAYER_COUNT" })
    expect(startGame(seats(5), "p0", random)).toEqual({ ok: false, error: "CACHETA_PLAYER_COUNT" })
    for (const count of [2, 3, 4]) expect(startGame(seats(count), "p0", random).ok).toBe(true)
  })

  it("usa 2 baralhos, dá 9 cartas, vira 1 e começa com o descarte vazio", () => {
    const game = unwrap(startGame(seats(4), "p2", random))
    const cards = allCachetaCards(game)
    expect(cards).toHaveLength(104)
    expect([...counts(cards).values()].every((count) => count === 2)).toBe(true)
    expect(counts(cards).size).toBe(createFullDeck().length)
    expect(game.players.every((player) => player.hand.length === 9)).toBe(true)
    expect(game.stock).toHaveLength(104 - 36 - 1)
    expect(game.discard).toEqual([])
    expect(game.turn).toMatchObject({ playerId: "p2", stage: "start" })
    expect(game.players.every((player) => player.points === 10)).toBe(true)
  })

  it("a próxima rodada começa com o próximo na ordem da sala", () => {
    const knocked = act(knockReady(), "ana", { type: "knock", card: "KC" })
    const next = expireCacheta(knocked, random)
    expect(next.round).toBe(2)
    expect(next.starterId).toBe("beto")
    expect(next.turn).toMatchObject({ playerId: "beto", stage: "start" })
    expect(next.players.every((player) => player.hand.length === 9)).toBe(true)
  })

  it("pula o eliminado ao escolher quem começa", () => {
    const game = { ...knockReady(MELDED, { beto: 1 }), starterId: "ana" }
    const next = expireCacheta(act(game, "ana", { type: "knock", card: "KC" }), random)
    expect(next.starterId).toBe("caio")
    expect(getPlayer(next, "beto").hand).toEqual([])
  })
})

describe("CA-RN-10 vez", () => {
  const game = buildCacheta({
    players: { ana: { hand: LOOSE }, beto: { hand: LOOSE } },
    stock: ["KH", "QD"],
    discard: ["3C", "5H"],
  })

  it("compra do monte e descarta para passar a vez", () => {
    const drawn = act(game, "ana", { type: "draw" })
    expect(getPlayer(drawn, "ana").hand).toHaveLength(10)
    expect(drawn.turn).toMatchObject({ stage: "drawn", drawn: "KH" })
    const passed = act(drawn, "ana", { type: "discard", card: "KH" })
    expect(passed.discard.at(-1)).toBe("KH")
    expect(passed.turn).toMatchObject({ playerId: "beto", stage: "start", number: 2 })
  })

  it("pega a última do descarte quando quiser", () => {
    const taken = act(game, "ana", { type: "take" })
    expect(getPlayer(taken, "ana").hand).toContain("5H")
    expect(taken.discard).toEqual(["3C"])
  })

  it("recusa descartar antes de comprar, comprar duas vezes e jogar fora da vez", () => {
    expect(refusal(game, "ana", { type: "discard", card: "7H" })).toBe("PICK_BEFORE_DISCARD")
    expect(refusal(game, "beto", { type: "draw" })).toBe("NOT_YOUR_TURN")
    const drawn = act(game, "ana", { type: "draw" })
    expect(refusal(drawn, "ana", { type: "draw" })).toBe("ALREADY_DREW")
    expect(refusal(drawn, "ana", { type: "take" })).toBe("ALREADY_DREW")
    expect(refusal(drawn, "ana", { type: "discard", card: "AS" })).toBe("CARD_NOT_IN_HAND")
  })

  it("recusa pegar do descarte vazio", () => {
    expect(refusal({ ...game, discard: [] }, "ana", { type: "take" })).toBe("EMPTY_DISCARD")
    expect(cachetaMovesOf({ ...game, discard: [] }, "ana").take).toBe(false)
  })

  it("com duas cartas iguais na mão, descarta só uma", () => {
    const twins = buildCacheta({
      players: { ana: { hand: ["7H", "7H", "2C"] }, beto: {} },
      turn: { stage: "drawn", drawn: "7H" },
    })
    expect(getPlayer(act(twins, "ana", { type: "discard", card: "7H" }), "ana").hand).toEqual([
      "7H",
      "2C",
    ])
  })
})

describe("CA-RN-11 e CA-RN-13 bater", () => {
  it("bate descartando a 10ª e mostra os jogos", () => {
    const knocked = act(knockReady(), "ana", { type: "knock", card: "KC" })
    expect(knocked.lastRound).toMatchObject({
      knockerId: "ana",
      discard: "KC",
      clean: true,
    })
    expect(knocked.lastRound?.melds).toHaveLength(3)
    expect(knocked.discard.at(-1)).toBe("KC")
    expect(knocked.pending).toBe("nextRound")
  })

  it("batida limpa tira 2 pontos de cada um; com coringa, tira 1", () => {
    const clean = act(knockReady(), "ana", { type: "knock", card: "KC" })
    expect(clean.players.map((player) => player.points)).toEqual([10, 8, 8])
    const dirty = act(knockReady(DIRTY), "ana", { type: "knock", card: "KC" })
    expect(dirty.lastRound?.clean).toBe(false)
    expect(dirty.players.map((player) => player.points)).toEqual([10, 9, 9])
  })

  it("batida inválida é recusada e a vez continua", () => {
    const game = knockReady()
    expect(refusal(game, "ana", { type: "knock", card: "7H" })).toBe("NOT_A_KNOCK")
    expect(
      refusal({ ...game, turn: { ...game.turn, stage: "start" } }, "ana", {
        type: "knock",
        card: "KC",
      })
    ).toBe("PICK_BEFORE_KNOCK")
    expect(refusal(game, "ana", { type: "knock", card: "AS" })).toBe("CARD_NOT_IN_HAND")
  })

  it("enquanto a rodada fecha, ninguém joga", () => {
    const knocked = act(knockReady(), "ana", { type: "knock", card: "KC" })
    expect(refusal(knocked, "beto", { type: "draw" })).toBe("ROUND_CLOSING")
    expect(cachetaMovesOf(knocked, "ana")).toEqual({
      draw: false,
      take: false,
      discard: false,
      knock: false,
    })
  })
})

describe("CA-RN-12 monte de compra", () => {
  it("com o monte vazio, o descarte menos a última vira o novo monte", () => {
    const game = buildCacheta({
      players: { ana: { hand: LOOSE }, beto: { hand: LOOSE } },
      stock: ["KH"],
      discard: ["2C", "3C", "4C", "5H"],
    })
    const drawn = act(game, "ana", { type: "draw" })
    expect(drawn.stock).toHaveLength(3)
    expect(drawn.discard).toEqual(["5H"])
    expect(drawn.events.at(-1)).toEqual({ type: "restocked", count: 3 })
  })
})

describe("CA-RN-14 eliminação e vitória", () => {
  it("quem chega a 0 é eliminado e o último com pontos vence", () => {
    const partial = act(knockReady(MELDED, { beto: 2 }), "ana", { type: "knock", card: "KC" })
    expect(getPlayer(partial, "beto")).toMatchObject({ points: 0, status: "out" })
    expect(partial.eliminations).toEqual(["beto"])
    expect(partial.endReason).toBeNull()

    const final = act(knockReady(MELDED, { beto: 1, caio: 2 }), "ana", {
      type: "knock",
      card: "KC",
    })
    expect(final.endReason).toBe("knockout")
    expect(final.winnerId).toBe("ana")
    expect(final.eliminations).toEqual(["beto", "caio"])
    expect(final.pending).toBeNull()
  })
})

describe("CA-RN-15 visibilidade", () => {
  it("cada um vê só a própria mão e a carta que comprou", () => {
    const game = act(
      buildCacheta({ players: { ana: { hand: LOOSE }, beto: { hand: MELDED } }, stock: ["KH"] }),
      "ana",
      { type: "draw" }
    )
    const mine = toCachetaView(game, "ana")
    const theirs = toCachetaView(game, "beto")
    expect(mine.hand).toHaveLength(10)
    expect(mine.drawnCard).toBe("KH")
    expect(theirs.hand).toEqual(MELDED)
    expect(theirs.drawnCard).toBeNull()
    expect(JSON.stringify(theirs)).not.toContain('"KH"')
    expect(theirs.players.map((player) => player.handSize)).toEqual([10, 9])
  })
})

describe("CA-RN-16 tempo", () => {
  it("ao estourar, compra do monte e descarta a carta comprada", () => {
    const game = buildCacheta({
      players: { ana: { hand: LOOSE }, beto: { hand: LOOSE } },
      stock: ["KH", "QD"],
    })
    const expired = expireCacheta(game, random)
    expect(getPlayer(expired, "ana").hand).toEqual(LOOSE)
    expect(expired.discard).toEqual(["KH"])
    expect(expired.turn.playerId).toBe("beto")
  })

  it("se já tinha pegado do descarte, devolve a carta pegada", () => {
    const game = buildCacheta({
      players: { ana: { hand: LOOSE }, beto: { hand: LOOSE } },
      discard: ["2C", "QS"],
    })
    const expired = expireCacheta(act(game, "ana", { type: "take" }), random)
    expect(getPlayer(expired, "ana").hand).toEqual(LOOSE)
    expect(expired.discard).toEqual(["2C", "QS"])
  })
})

describe("CA-RN-17 saída", () => {
  it("quem sai é eliminado e as cartas voltam ao monte", () => {
    const game = buildCacheta({
      players: { ana: { hand: LOOSE }, beto: { hand: MELDED }, caio: { hand: LOOSE } },
      stock: ["KH"],
    })
    const left = removeCachetaPlayer(game, "beto", random)
    expect(getPlayer(left, "beto")).toMatchObject({ status: "left", hand: [] })
    expect(left.stock).toHaveLength(10)
    expect(left.eliminations).toEqual(["beto"])
    expect(left.turn.playerId).toBe("ana")
  })

  it("se sai quem estava na vez, a vez passa", () => {
    const game = buildCacheta({
      players: { ana: { hand: LOOSE }, beto: { hand: LOOSE }, caio: { hand: LOOSE } },
    })
    expect(removeCachetaPlayer(game, "ana", random).turn).toMatchObject({
      playerId: "beto",
      stage: "start",
    })
  })

  it("com 1 jogador restante, ele vence", () => {
    const game = buildCacheta({ players: { ana: { hand: LOOSE }, beto: { hand: LOOSE } } })
    const left = removeCachetaPlayer(game, "ana", random)
    expect(left).toMatchObject({ endReason: "abandoned", winnerId: "beto" })
  })
})

describe("ritmo da mesa", () => {
  it("pausa para mostrar a batida e depois para revelar o vira", () => {
    const game = knockReady()
    const knocked = act(game, "ana", { type: "knock", card: "KC" })
    expect(cachetaPauseAfter(game, knocked)).toBe(KNOCK_PAUSE_MS)
    const dealt = expireCacheta(knocked, random)
    expect(cachetaPauseAfter(knocked, dealt)).toBe(DEAL_PAUSE_MS)
    const drawn = act(dealt, "beto", { type: "draw" })
    expect(cachetaPauseAfter(dealt, drawn)).toBe(0)
  })

  it("a distribuição da rodada seguinte é um passo automático", () => {
    const knocked = act(knockReady(), "ana", { type: "knock", card: "KC" })
    expect(cachetaRules.turnOf(knocked)).toMatchObject({ playerId: "ana", automatic: true })
    expect(cachetaRules.turnOf(expireCacheta(knocked, random)).automatic).toBe(false)
  })

  it("quem sai durante a pausa não trava a próxima rodada", () => {
    const knocked = act(knockReady(), "ana", { type: "knock", card: "KC" })
    const left = removeCachetaPlayer(knocked, "beto", random)
    expect(left.pending).toBe("nextRound")
    expect(expireCacheta(left, random).turn.playerId).toBe("caio")
  })
})

describe("CA-RF-11 e CA-RF-12 dicas", () => {
  it("avisa que dá para bater limpo", () => {
    const hints = computeCachetaHints(toCachetaView(knockReady(), "ana"))
    expect(hints.knock).toMatchObject({ discard: "KC", clean: true })
    expect(hints.suggestions[0]?.action).toEqual({ type: "knock", card: "KC" })
    expect(hints.ready.flatMap((meld) => meld.cards)).toHaveLength(9)
  })

  it("sugere pegar o coringa do descarte", () => {
    const game = buildCacheta({
      players: { ana: { hand: LOOSE }, beto: { hand: LOOSE } },
      discard: ["6H"],
    })
    expect(computeCachetaHints(toCachetaView(game, "ana")).suggestions[0]).toMatchObject({
      action: { type: "take" },
      advice: "takeJoker",
    })
  })

  it("sugere pegar a carta que fecha um jogo, e comprar quando não fecha", () => {
    const game = buildCacheta({
      players: { ana: { hand: LOOSE }, beto: { hand: LOOSE } },
      discard: ["4H"],
    })
    expect(computeCachetaHints(toCachetaView(game, "ana")).suggestions[0]?.advice).toBe(
      "takeForMeld"
    )
    const useless = { ...game, discard: ["AC" as Card] }
    expect(computeCachetaHints(toCachetaView(useless, "ana")).suggestions[0]?.advice).toBe("draw")
  })

  it("nunca sugere descartar coringa", () => {
    const game = buildCacheta({
      players: { ana: { hand: [...LOOSE, "6S"] }, beto: { hand: LOOSE } },
      turn: { stage: "drawn", drawn: "6S" },
    })
    const [suggestion] = computeCachetaHints(toCachetaView(game, "ana")).suggestions
    expect(suggestion?.action.type).toBe("discard")
    expect(suggestion?.card).not.toBe("6S")
  })
})
