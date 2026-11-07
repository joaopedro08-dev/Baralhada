import { describe, expect, it } from "vitest"
import { DECK_SIZE } from "../../src/domain/cards/card.js"
import type { Card } from "../../src/domain/cards/card.js"
import { expirePoker, playPoker, removePokerPlayer } from "../../src/domain/games/poker/actions.js"
import type { PokerAction } from "../../src/domain/games/poker/betting.js"
import { movesOf } from "../../src/domain/games/poker/betting.js"
import { dealHand } from "../../src/domain/games/poker/hand-flow.js"
import { computePokerHints } from "../../src/domain/games/poker/hints.js"
import {
  blindsFor,
  getPlayer,
  handsUntilBlindsRise,
  STARTING_CHIPS,
} from "../../src/domain/games/poker/model.js"
import type { PokerGame } from "../../src/domain/games/poker/model.js"
import { collectedPotsOf, toPokerView } from "../../src/domain/games/poker/player-view.js"
import { buildPots, splitPot } from "../../src/domain/games/poker/pots.js"
import {
  BETTING_CLOSED_PAUSE_MS,
  DEAL_PAUSE_MS,
  FOLD_WIN_PAUSE_MS,
  pokerPauseAfter,
  pokerRules,
  RUNOUT_STREET_MS,
  SHOWDOWN_PAUSE_MS,
  STREET_REVEAL_MS,
} from "../../src/domain/games/poker/rules.js"
import { startGame } from "../../src/domain/games/poker/setup.js"
import type { Seat } from "../../src/domain/shared/seat.js"
import { seededRandom, unwrap } from "../support/game-builder.js"
import { buildPoker, cardsInPlay, chipsInPlay } from "../support/poker-builder.js"

const random = seededRandom(7)

const seats = (count: number): readonly Seat[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    nickname: `P${index}`,
    team: null,
  }))

const start = (count: number): PokerGame => unwrap(startGame(seats(count), "p0", random))

const settle = (game: PokerGame): PokerGame =>
  game.pending === null ? game : settle(expirePoker(game, random))

const play = (game: PokerGame, playerId: string, action: PokerAction): PokerGame =>
  unwrap(playPoker(game, playerId, action, random))

const act = (game: PokerGame, playerId: string, action: PokerAction): PokerGame =>
  settle(play(game, playerId, action))

const refusal = (game: PokerGame, playerId: string, action: PokerAction) => {
  const result = playPoker(game, playerId, action, random)
  return result.ok ? "aceita" : result.error
}

const chipsOf = (game: PokerGame, playerId: string) => getPlayer(game, playerId).chips

const fold: PokerAction = { type: "fold" }
const check: PokerAction = { type: "check" }
const call: PokerAction = { type: "call" }
const bet = (amount: number): PokerAction => ({ type: "bet", amount })
const raise = (amount: number): PokerAction => ({ type: "raise", amount })

const FLOP: readonly Card[] = ["2C", "7D", "9S"]
const TURN_AND_RIVER: readonly Card[] = ["JH", "3C"]

describe("PK-RN-01 a PK-RN-04 preparação", () => {
  it("aceita de 2 a 6 jogadores", () => {
    expect(pokerRules.playerCounts).toEqual([2, 3, 4, 5, 6])
    expect(startGame(seats(1), "p0", random)).toEqual({ ok: false, error: "INVALID_PLAYER_COUNT" })
    expect(startGame(seats(7), "p0", random)).toEqual({ ok: false, error: "INVALID_PLAYER_COUNT" })
  })

  it("dá 2 cartas fechadas diferentes a cada um e guarda o resto no baralho", () => {
    const game = start(6)
    expect(game.players.every((player) => player.hole.length === 2)).toBe(true)
    expect(new Set(cardsInPlay(game)).size).toBe(DECK_SIZE)
    expect(cardsInPlay(game)).toHaveLength(DECK_SIZE)
  })

  it("todos começam com 1000 fichas e o botão é o jogador sorteado pela sala", () => {
    const game = start(3)
    expect(chipsInPlay(game)).toBe(3 * STARTING_CHIPS)
    expect(game.deal.buttonId).toBe("p0")
    expect(game.deal.number).toBe(1)
  })
})

describe("PK-RN-05 a PK-RN-07 blinds", () => {
  it("o jogador depois do botão paga a small e o seguinte a big", () => {
    const game = start(3)
    expect(game.deal).toMatchObject({ smallBlindId: "p1", bigBlindId: "p2" })
    expect(chipsOf(game, "p1")).toBe(990)
    expect(chipsOf(game, "p2")).toBe(980)
    expect(game.deal.actorId).toBe("p0")
  })

  it("começam em 10 e 20 e dobram a cada 10 mãos", () => {
    expect(blindsFor(1)).toEqual({ small: 10, big: 20 })
    expect(blindsFor(10)).toEqual({ small: 10, big: 20 })
    expect(blindsFor(11)).toEqual({ small: 20, big: 40 })
    expect(blindsFor(21)).toEqual({ small: 40, big: 80 })
    expect(handsUntilBlindsRise(1)).toBe(10)
    expect(handsUntilBlindsRise(10)).toBe(1)
    expect(handsUntilBlindsRise(11)).toBe(10)
  })

  it("com 2 jogadores, o botão paga a small e fala primeiro antes do flop", () => {
    const game = start(2)
    expect(game.deal).toMatchObject({ buttonId: "p0", smallBlindId: "p0", bigBlindId: "p1" })
    expect(game.deal.actorId).toBe("p0")
    const flop = act(act(game, "p0", call), "p1", check)
    expect(flop.deal.street).toBe("flop")
    expect(flop.deal.actorId).toBe("p1")
  })

  it("quem não tem fichas para a blind coloca o que tem e fica all-in", () => {
    const table = buildPoker({
      players: { a: { chips: 1000 }, b: { chips: 5 }, c: { chips: 1000 } },
    })
    const game = dealHand(table, 1, "a", random)
    expect(getPlayer(game, "b")).toMatchObject({ chips: 0, bet: 5, status: "allIn" })
    expect(getPlayer(game, "c")).toMatchObject({ chips: 980, bet: 20 })
  })
})

describe("PK-RN-08 a PK-RN-11 rodadas de aposta", () => {
  it("antes do flop começa o jogador depois da big blind", () => {
    expect(start(4).deal.actorId).toBe("p3")
  })

  it("só libera as ações válidas na vez (PK-RF-03)", () => {
    const game = start(3)
    expect(movesOf(game, "p0")).toEqual({
      fold: true,
      check: false,
      call: 20,
      bet: null,
      raise: { min: 40, max: 1000 },
    })
    expect(movesOf(game, "p1")).toEqual({
      fold: false,
      check: false,
      call: null,
      bet: null,
      raise: null,
    })
    expect(refusal(game, "p0", check)).toBe("CANNOT_CHECK")
    expect(refusal(game, "p0", bet(100))).toBe("CANNOT_BET")
    expect(refusal(game, "p1", call)).toBe("NOT_YOUR_TURN")
  })

  it("a big blind pode passar ou aumentar quando todos só pagaram", () => {
    const called = act(act(start(3), "p0", call), "p1", call)
    const moves = movesOf(called, "p2")
    expect(moves.check).toBe(true)
    expect(moves.fold).toBe(false)
    expect(moves.raise).toEqual({ min: 40, max: 1000 })
    expect(refusal(called, "p2", call)).toBe("NOTHING_TO_CALL")
    expect(refusal(called, "p2", fold)).toBe("CANNOT_FOLD")
  })

  it("abre o flop depois da rodada e começa o primeiro depois do botão", () => {
    const flop = act(act(act(start(3), "p0", call), "p1", call), "p2", check)
    expect(flop.deal.street).toBe("flop")
    expect(flop.deal.board).toHaveLength(3)
    expect(flop.deal.currentBet).toBe(0)
    expect(flop.deal.actorId).toBe("p1")
    expect(flop.players.every((player) => player.bet === 0)).toBe(true)
  })

  it("abre turn e river, uma carta de cada vez", () => {
    let game = act(act(act(start(3), "p0", call), "p1", call), "p2", check)
    for (const size of [4, 5]) {
      game = act(act(act(game, "p1", check), "p2", check), "p0", check)
      expect(game.deal.board).toHaveLength(size)
    }
  })

  it("aposta mínima é a big blind e máxima é tudo", () => {
    const game = buildPoker({ players: { a: {}, b: {} }, deal: { actorId: "b" } })
    expect(movesOf(game, "b").bet).toEqual({ min: 20, max: 1000 })
    expect(refusal(game, "b", bet(10))).toBe("AMOUNT_TOO_SMALL")
    expect(refusal(game, "b", bet(1001))).toBe("AMOUNT_TOO_LARGE")
    expect(refusal(game, "b", raise(100))).toBe("CANNOT_RAISE")
    expect(act(game, "b", bet(1000)).players[1]).toMatchObject({ chips: 0, status: "allIn" })
  })

  it("o aumento mínimo é o tamanho do último aumento", () => {
    const game = start(3)
    expect(refusal(game, "p0", raise(30))).toBe("AMOUNT_TOO_SMALL")
    const raised = act(game, "p0", raise(60))
    expect(movesOf(raised, "p1").raise).toEqual({ min: 100, max: 1000 })
    expect(movesOf(raised, "p1").call).toBe(50)
  })

  it("all-in menor que um aumento completo não reabre a aposta para quem já falou", () => {
    const game = buildPoker({
      players: { a: {}, b: { chips: 150 }, c: {} },
      deal: { buttonId: "c", actorId: "a" },
    })
    const shoved = act(act(game, "a", bet(100)), "b", raise(150))
    expect(movesOf(shoved, "c").raise).toEqual({ min: 250, max: 1000 })
    const called = act(shoved, "c", call)
    expect(called.deal.actorId).toBe("a")
    expect(movesOf(called, "a")).toMatchObject({ call: 50, raise: null })
  })

  it("não deixa aumentar quando todos os outros estão all-in", () => {
    const game = buildPoker({
      players: { a: { chips: 300 }, b: {} },
      deal: { buttonId: "b", actorId: "a" },
    })
    const shoved = act(game, "a", bet(300))
    expect(movesOf(shoved, "b")).toMatchObject({ call: 300, raise: null })
  })

  it("quem tem menos que o valor a pagar paga o que tem e fica all-in", () => {
    const game = buildPoker({
      players: { a: {}, b: { chips: 50 } },
      deal: { buttonId: "b", actorId: "a" },
    })
    const bet100 = act(game, "a", bet(100))
    expect(movesOf(bet100, "b")).toMatchObject({ call: 50, raise: null })
  })
})

describe("PK-RN-12 todos desistem", () => {
  it("o último leva o pote na hora, sem mostrar as cartas, e o botão passa", () => {
    const game = act(act(start(3), "p0", fold), "p1", fold)
    expect(game.lastHand).toMatchObject({
      number: 1,
      showdown: false,
      shown: [],
      winnings: { p2: 30 },
    })
    expect(game.deal).toMatchObject({
      number: 2,
      buttonId: "p1",
      smallBlindId: "p2",
      bigBlindId: "p0",
    })
    expect(chipsInPlay(game)).toBe(3 * STARTING_CHIPS)
  })
})

describe("PK-RN-13 a PK-RN-15 showdown e potes", () => {
  const river = (players: Parameters<typeof buildPoker>[0]["players"], buttonId = "a") =>
    buildPoker({
      players,
      deal: {
        street: "river",
        board: [...FLOP, ...TURN_AND_RIVER],
        buttonId,
        actorId: "b",
      },
    })

  it("vence o melhor jogo de 5 cartas e todos que chegaram mostram as cartas", () => {
    const game = river({
      a: { chips: 900, committed: 100, hole: ["AH", "AD"] },
      b: { chips: 900, committed: 100, hole: ["KH", "KD"] },
    })
    const done = act(act(game, "b", check), "a", check)
    expect(done.lastHand).toMatchObject({
      showdown: true,
      winnings: { a: 200 },
      pots: [{ amount: 200, winnerIds: ["a"], category: "pair" }],
    })
    expect(done.lastHand?.shown.map((hand) => hand.playerId)).toEqual(["b", "a"])
    expect(done.lastHand?.shown[1]?.cards).toContain("AH")
  })

  it("empate divide o pote e a ficha que sobra vai para o primeiro depois do botão", () => {
    const game = buildPoker({
      players: {
        a: { chips: 900, committed: 100, hole: ["2C", "3D"] },
        b: { chips: 900, committed: 100, hole: ["4H", "5C"] },
        c: { chips: 985, committed: 15, status: "folded", hole: ["6H", "7C"] },
      },
      deal: {
        street: "river",
        board: ["10S", "JS", "QS", "KS", "AS"],
        buttonId: "a",
        actorId: "b",
      },
    })
    const done = act(act(game, "b", check), "a", check)
    expect(done.lastHand?.pots).toEqual([
      { amount: 215, eligibleIds: ["a", "b"], winnerIds: ["b", "a"], category: "royalFlush" },
    ])
    expect(done.lastHand?.winnings).toEqual({ b: 108, a: 107 })
  })

  it("all-in de 3 jogadores com valores diferentes forma potes paralelos (PK-RF-05)", () => {
    const game = buildPoker({
      players: {
        a: { chips: 100, committed: 20, hole: ["AH", "AD"] },
        b: { chips: 300, committed: 20, hole: ["KH", "KD"] },
        c: { chips: 1000, committed: 20, hole: ["QH", "QD"] },
      },
      deal: { board: FLOP, deck: TURN_AND_RIVER, buttonId: "c", actorId: "a" },
    })
    const shoved = act(act(game, "a", bet(100)), "b", raise(300))
    const done = act(shoved, "c", call)
    expect(done.lastHand?.board).toEqual([...FLOP, ...TURN_AND_RIVER])
    expect(done.lastHand?.pots).toEqual([
      { amount: 360, eligibleIds: ["a", "b", "c"], winnerIds: ["a"], category: "pair" },
      { amount: 400, eligibleIds: ["b", "c"], winnerIds: ["b"], category: "pair" },
    ])
    expect(done.lastHand?.winnings).toEqual({ a: 360, b: 400 })
    expect(chipsInPlay(done)).toBe(1460)
  })

  it("quem está all-in só disputa o que cobriu; o excesso volta para quem apostou", () => {
    const game = buildPoker({
      players: {
        a: { chips: 1000, hole: ["4H", "5D"] },
        b: { chips: 200, hole: ["AH", "AD"] },
      },
      deal: { board: FLOP, deck: TURN_AND_RIVER, buttonId: "b", actorId: "a" },
    })
    const done = act(act(game, "a", bet(500)), "b", call)
    expect(done.lastHand?.pots).toEqual([
      { amount: 400, eligibleIds: ["a", "b"], winnerIds: ["b"], category: "pair" },
      { amount: 300, eligibleIds: ["a"], winnerIds: ["a"], category: "highCard" },
    ])
  })

  it("com todos all-in, a mesa abre até o river sem novas apostas", () => {
    const game = buildPoker({
      players: { a: { chips: 300, hole: ["AH", "AD"] }, b: { chips: 1000, hole: ["KH", "KD"] } },
      deal: { board: FLOP, deck: TURN_AND_RIVER, buttonId: "b", actorId: "a" },
    })
    const done = act(act(game, "a", bet(300)), "b", call)
    const dealt = done.events.filter((event) => event.type === "streetDealt")
    expect(dealt.map((event) => event.type === "streetDealt" && event.street)).toEqual([
      "turn",
      "river",
    ])
    expect(done.lastHand?.showdown).toBe(true)
  })

  it("monta potes juntando camadas com os mesmos disputantes", () => {
    expect(
      buildPots([
        { playerId: "a", amount: 50, live: true },
        { playerId: "b", amount: 100, live: false },
        { playerId: "c", amount: 100, live: true },
      ])
    ).toEqual([
      { amount: 150, eligibleIds: ["a", "c"] },
      { amount: 100, eligibleIds: ["c"] },
    ])
    expect(splitPot(10, ["x", "y", "z"])).toEqual(
      new Map([
        ["x", 4],
        ["y", 3],
        ["z", 3],
      ])
    )
  })
})

describe("PK-RN-16 eliminação e fim", () => {
  it("quem zera é eliminado e vence o último com fichas", () => {
    const game = buildPoker({
      players: { a: { chips: 300, hole: ["4H", "5D"] }, b: { chips: 1000, hole: ["AH", "AD"] } },
      deal: { board: FLOP, deck: TURN_AND_RIVER, buttonId: "b", actorId: "a" },
    })
    const done = act(act(game, "a", bet(300)), "b", call)
    expect(done).toMatchObject({ winnerId: "b", endReason: "chips", eliminatedIds: ["a"] })
    expect(done.events).toContainEqual({ type: "eliminated", playerId: "a", place: 2 })
    expect(done.events.at(-1)).toEqual({ type: "matchWon", playerId: "b" })
    expect(refusal(done, "b", check)).toBe("GAME_FINISHED")
  })

  it("eliminados na mesma mão: sai antes quem começou com menos fichas", () => {
    const game = buildPoker({
      players: {
        a: { chips: 50, hole: ["4H", "5D"] },
        b: { chips: 200, hole: ["6C", "8C"] },
        c: { chips: 1000, hole: ["AH", "AD"] },
      },
      deal: { board: FLOP, deck: TURN_AND_RIVER, buttonId: "c", actorId: "a" },
    })
    const done = act(act(act(game, "a", bet(50)), "b", raise(200)), "c", call)
    expect(done.eliminatedIds).toEqual(["a", "b"])
    expect(done.winnerId).toBe("c")
    expect(done.events).toContainEqual({ type: "eliminated", playerId: "a", place: 3 })
    expect(done.events).toContainEqual({ type: "eliminated", playerId: "b", place: 2 })
  })

  it("o eliminado não recebe cartas na mão seguinte e o botão pula a vaga dele", () => {
    const game = buildPoker({
      players: {
        a: { chips: 100, hole: ["4H", "5D"] },
        b: { chips: 1000, hole: ["AH", "AD"] },
        c: { chips: 1000, hole: ["4C", "5D"] },
      },
      deal: { board: FLOP, deck: TURN_AND_RIVER, buttonId: "c", actorId: "a" },
    })
    const done = act(act(act(game, "a", bet(100)), "b", call), "c", fold)
    expect(done.eliminatedIds).toEqual(["a"])
    expect(getPlayer(done, "a")).toMatchObject({ status: "out", hole: [] })
    expect(done.deal).toMatchObject({ number: 2, buttonId: "b", smallBlindId: "b" })
    expect(movesOf(done, "a")).toMatchObject({ check: false, call: null })
  })
})

describe("PK-RN-18 tempo", () => {
  it("passa quando pode", () => {
    const game = buildPoker({ players: { a: {}, b: {} }, deal: { actorId: "b" } })
    const expired = expirePoker(game, random)
    expect(expired.events).toContainEqual({ type: "timedOut", playerId: "b" })
    expect(expired.events.at(-1)).toMatchObject({ type: "acted", playerId: "b", move: "check" })
    expect(expired.step).toBe(game.step + 1)
  })

  it("desiste quando há aposta para pagar", () => {
    const expired = expirePoker(start(3), random)
    expect(getPlayer(expired, "p0").status).toBe("folded")
  })

  it("não muda uma partida encerrada", () => {
    const done = { ...start(2), endReason: "chips" as const }
    expect(expirePoker(done, random)).toBe(done)
  })
})

describe("PK-RN-19 saída", () => {
  it("quem sai na vez desiste, é eliminado, e a vez passa", () => {
    const left = removePokerPlayer(start(3), "p0", random)
    expect(getPlayer(left, "p0")).toMatchObject({ status: "out", chips: 0 })
    expect(left.eliminatedIds).toEqual(["p0"])
    expect(left.deal.actorId).toBe("p1")
    expect(left.events).toContainEqual({ type: "playerLeft", playerId: "p0" })
  })

  it("quem sai fora da vez não muda de quem é a vez", () => {
    const left = removePokerPlayer(start(4), "p1", random)
    expect(left.deal.actorId).toBe("p3")
    expect(left.endReason).toBeNull()
  })

  it("com 1 jogador restante, ele vence e leva o pote", () => {
    const left = removePokerPlayer(start(2), "p1", random)
    expect(left).toMatchObject({ winnerId: "p0", endReason: "abandoned" })
    expect(chipsOf(left, "p0")).toBe(1020)
  })

  it("ignora quem não está na partida ou partida encerrada", () => {
    const game = start(3)
    expect(removePokerPlayer(game, "zz", random)).toBe(game)
    const done = { ...game, endReason: "chips" as const }
    expect(removePokerPlayer(done, "p0", random)).toBe(done)
  })

  it("sem ninguém, encerra sem vencedor", () => {
    const lonely = buildPoker({ players: { a: {}, b: { status: "out", chips: 0 } } })
    expect(removePokerPlayer(lonely, "a", random)).toMatchObject({
      winnerId: null,
      endReason: "abandoned",
    })
  })
})

describe("PK-RN-17 visibilidade", () => {
  it("cada jogador vê só as próprias cartas fechadas", () => {
    const game = start(3)
    const view = toPokerView(game, "p1")
    expect(view.hole).toEqual(getPlayer(game, "p1").hole)
    expect(view.players.every((player) => player.holeCount === 2)).toBe(true)
    expect(view).not.toHaveProperty("deck")
    const text = JSON.stringify(view)
    for (const card of [...game.deal.deck, ...getPlayer(game, "p0").hole]) {
      expect(text).not.toContain(`"${card}"`)
    }
  })

  it("mostra blinds, quantas mãos faltam para dobrar e as próximas (PK-RF-08)", () => {
    const view = toPokerView(start(3), "p0")
    expect(view.blinds).toEqual({ small: 10, big: 20 })
    expect(view.nextBlinds).toEqual({ small: 20, big: 40 })
    expect(view.handsUntilBlindsRise).toBe(10)
    expect(view.potTotal).toBe(30)
    expect(view.moves.call).toBe(20)
    expect(toPokerView(start(3), "p1").moves.call).toBeNull()
  })

  it("mostra os potes recolhidos com quem disputa cada um", () => {
    const game = buildPoker({
      players: {
        a: { committed: 120, status: "allIn", chips: 0 },
        b: { committed: 320 },
        c: { committed: 320, bet: 0 },
      },
    })
    expect(collectedPotsOf(game)).toEqual([
      { amount: 360, eligibleIds: ["a", "b", "c"] },
      { amount: 400, eligibleIds: ["b", "c"] },
    ])
  })
})

describe("PK-RF-12 e PK-RF-13 dicas", () => {
  const viewWith = (hole: readonly Card[], board: readonly Card[]) =>
    toPokerView(buildPoker({ players: { a: { hole }, b: {} }, deal: { board } }), "a")

  it("mostra o jogo atual com as cartas que o formam", () => {
    const hints = computePokerHints(viewWith(["AH", "AD"], []))
    expect(hints.current?.category).toBe("pair")
    expect(hints.outs).toBeNull()
  })

  it("conta as cartas que ainda melhoram o jogo sem olhar as dos outros", () => {
    const hints = computePokerHints(viewWith(["AH", "KH"], ["2H", "7H", "9C"]))
    expect(hints.current?.category).toBe("highCard")
    expect(hints.outs?.unseen).toBe(47)
    expect(hints.outs?.byCategory).toContainEqual({ category: "flush", count: 9 })
    expect(hints.outs?.byCategory.find((entry) => entry.category === "pair")?.count).toBe(14)
    expect(hints.outs?.total).toBe(23)
  })

  it("no river não há mais carta para vir", () => {
    expect(computePokerHints(viewWith(["AH", "KH"], [...FLOP, ...TURN_AND_RIVER])).outs).toBeNull()
  })

  it("quem não tem cartas não recebe dica", () => {
    expect(computePokerHints(viewWith([], []))).toEqual({ current: null, outs: null })
  })
})

describe("ritmo da mesa", () => {
  it("fecha a rodada, espera e só então abre o flop", () => {
    const preflop = act(act(start(3), "p0", call), "p1", call)
    const closed = play(preflop, "p2", check)
    expect(closed.pending).toBe("street")
    expect(closed.deal.board).toEqual([])
    expect(getPlayer(closed, "p2").bet).toBe(20)
    expect(pokerPauseAfter(preflop, closed)).toBe(BETTING_CLOSED_PAUSE_MS)
    expect(pokerRules.turnOf(closed)).toMatchObject({ automatic: true })
    expect(movesOf(closed, "p1")).toMatchObject({ check: false, call: null, fold: false })
    expect(refusal(closed, "p1", check)).toBe("TABLE_MOVING")

    const flop = expirePoker(closed, random)
    expect(flop.pending).toBeNull()
    expect(flop.deal.board).toHaveLength(3)
    expect(flop.step).toBe(closed.step + 1)
    expect(pokerPauseAfter(closed, flop)).toBe(STREET_REVEAL_MS)
    expect(pokerRules.turnOf(flop)).toEqual({ number: flop.step, playerId: "p1", automatic: false })
  })

  it("no all-in abre uma rua por vez, mostra o resultado e só depois distribui", () => {
    const game = buildPoker({
      players: { a: { chips: 300, hole: ["AH", "AD"] }, b: { chips: 1000, hole: ["KH", "KD"] } },
      deal: { board: FLOP, deck: TURN_AND_RIVER, buttonId: "b", actorId: "a" },
    })
    const shoved = play(game, "a", bet(300))
    const called = play(shoved, "b", call)
    expect(called.pending).toBe("street")
    expect(pokerPauseAfter(shoved, called)).toBe(BETTING_CLOSED_PAUSE_MS)

    const turn = expirePoker(called, random)
    expect(turn.deal.board).toHaveLength(4)
    expect(turn.pending).toBe("street")
    expect(pokerPauseAfter(called, turn)).toBe(RUNOUT_STREET_MS)

    const river = expirePoker(turn, random)
    expect(river.deal.board).toHaveLength(5)
    expect(river.pending).toBe("showdown")
    expect(river.lastHand).toBeNull()
    expect(pokerPauseAfter(turn, river)).toBe(RUNOUT_STREET_MS)

    const shown = expirePoker(river, random)
    expect(shown.pending).toBe("nextHand")
    expect(shown.lastHand).toMatchObject({ number: 1, showdown: true, winnings: { a: 600 } })
    expect(shown.deal.number).toBe(1)
    expect(getPlayer(shown, "a").hole).toEqual(["AH", "AD"])
    expect(pokerPauseAfter(river, shown)).toBe(SHOWDOWN_PAUSE_MS)

    const next = expirePoker(shown, random)
    expect(next.deal.number).toBe(2)
    expect(next.pending).toBeNull()
    expect(next.lastHand?.number).toBe(1)
    expect(pokerPauseAfter(shown, next)).toBe(DEAL_PAUSE_MS)
  })

  it("quem leva o pote sem showdown ganha uma pausa mais curta", () => {
    const folded = act(start(3), "p0", fold)
    const won = play(folded, "p1", fold)
    expect(won.pending).toBe("nextHand")
    expect(won.deal.number).toBe(1)
    expect(pokerPauseAfter(folded, won)).toBe(FOLD_WIN_PAUSE_MS)
  })

  it("a mão que se resolve sozinha não apaga o resultado da anterior", () => {
    const table = buildPoker({ players: { a: { chips: 5 }, b: { chips: 1000 } } })
    const dealt = dealHand(table, 1, "a", random)
    expect(getPlayer(dealt, "a").status).toBe("allIn")
    expect(dealt.pending).toBe("street")
    expect(dealt.deal.board).toEqual([])
    expect(dealt.lastHand).toBeNull()
  })

  it("quem sai enquanto a mesa espera a próxima mão não destrava nada antes da hora", () => {
    const won = play(act(start(3), "p0", fold), "p1", fold)
    const left = removePokerPlayer(won, "p0", random)
    expect(left.pending).toBe("nextHand")
    expect(left.deal.number).toBe(1)
    const next = expirePoker(left, random)
    expect(next.deal.number).toBe(2)
    expect(getPlayer(next, "p0").hole).toEqual([])
  })

  it("informa a vez pelo número da decisão", () => {
    const game = start(3)
    expect(pokerRules.turnOf(game)).toEqual({ number: 1, playerId: "p0", automatic: false })
    expect(pokerRules.turnOf(act(game, "p0", call))).toEqual({
      number: 2,
      playerId: "p1",
      automatic: false,
    })
  })
})
