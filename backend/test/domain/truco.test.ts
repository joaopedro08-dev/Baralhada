import { describe, expect, it } from "vitest"
import type { Card } from "../../src/domain/cards/card.js"
import { expireTruco, playTruco, removeTrucoPlayer } from "../../src/domain/games/truco/actions.js"
import type { TrucoAction } from "../../src/domain/games/truco/actions.js"
import {
  createTrucoDeck,
  isTrucoCard,
  manilhaOf,
  MAX_STRENGTH,
  strengthOf,
} from "../../src/domain/games/truco/cards.js"
import { handOutcome } from "../../src/domain/games/truco/hand-flow.js"
import {
  ANSWER_PAUSE_MS,
  CALL_PAUSE_MS,
  HAND_PAUSE_MS,
  ROUND_PAUSE_MS,
  RUN_PAUSE_MS,
  trucoPauseAfter,
} from "../../src/domain/games/truco/pacing.js"
import { actorOf, nextStake } from "../../src/domain/games/truco/model.js"
import type { RoundResult, TrucoGame } from "../../src/domain/games/truco/model.js"
import { movesOf, toTrucoView } from "../../src/domain/games/truco/player-view.js"
import { trucoRules } from "../../src/domain/games/truco/rules.js"
import { dealHand, modeFor, startGame } from "../../src/domain/games/truco/setup.js"
import type { Seat } from "../../src/domain/shared/seat.js"
import { seededRandom, unwrap } from "../support/game-builder.js"
import { buildTruco, duel, foursome } from "../support/truco-builder.js"

const random = seededRandom(7)

const act = (game: TrucoGame, playerId: string, action: TrucoAction): TrucoGame =>
  unwrap(playTruco(game, playerId, action, random))

const refusal = (game: TrucoGame, playerId: string, action: TrucoAction) => {
  const result = playTruco(game, playerId, action, random)
  return result.ok ? "aceita" : result.error
}

const play = (card: Card): TrucoAction => ({ type: "play", card })

const seatsOf = (teams: readonly (number | null)[]): readonly Seat[] =>
  teams.map((team, index) => ({ id: `p${index}`, nickname: `P${index}`, team }))

const allDealtCards = (game: TrucoGame): readonly Card[] => [
  game.hand.vira,
  ...game.players.flatMap((player) => player.hand),
]

describe("TR-RN-01 jogadores, times e assentos", () => {
  it("aceita 2, 4 e 6 jogadores e recusa números ímpares", () => {
    for (const count of [2, 4, 6]) {
      const seats = seatsOf(Array.from({ length: count }, (_, index) => index % 2))
      expect(startGame(seats, "p0", random).ok).toBe(true)
    }
    for (const count of [1, 3, 5, 8]) {
      const seats = seatsOf(Array.from({ length: count }, (_, index) => index % 2))
      expect(startGame(seats, "p0", random)).toEqual({ ok: false, error: "INVALID_PLAYER_COUNT" })
    }
    expect(trucoRules.playerCounts).toEqual([2, 4, 6])
    expect(trucoRules.teamCount).toBe(2)
  })

  it("senta os jogadores alternados, cada um seguido por um adversário", () => {
    const game = unwrap(startGame(seatsOf([0, 0, 1, 1, 0, 1]), "p0", random))
    expect(game.players.map((player) => player.id)).toEqual(["p0", "p2", "p1", "p3", "p4", "p5"])
    game.players.forEach((player, index) => {
      const next = game.players[(index + 1) % game.players.length]
      expect(next?.team).not.toBe(player.team)
    })
  })

  it("recusa times desiguais, sem time ou quem abre fora da mesa", () => {
    expect(startGame(seatsOf([0, 0, 0, 1]), "p0", random)).toEqual({
      ok: false,
      error: "INVALID_TEAMS",
    })
    expect(startGame(seatsOf([0, null]), "p0", random)).toEqual({
      ok: false,
      error: "INVALID_TEAMS",
    })
    expect(startGame(seatsOf([0, 1]), "intruso", random)).toEqual({
      ok: false,
      error: "INVALID_TEAMS",
    })
  })
})

describe("TR-RN-02 baralho de 40 cartas e distribuição", () => {
  it("tira 8, 9 e 10 e não repete cartas", () => {
    const deck = createTrucoDeck()
    expect(deck).toHaveLength(40)
    expect(new Set(deck).size).toBe(40)
    expect(deck.some((card) => /^(8|9|10)/.test(card))).toBe(false)
    expect(isTrucoCard("9H")).toBe(false)
    expect(isTrucoCard("QH")).toBe(true)
  })

  it("dá 3 cartas a cada um e vira uma carta que não está em nenhuma mão", () => {
    const game = unwrap(startGame(seatsOf([0, 1, 0, 1, 0, 1]), "p0", random))
    expect(game.players.every((player) => player.hand.length === 3)).toBe(true)
    const dealt = allDealtCards(game)
    expect(new Set(dealt).size).toBe(dealt.length)
    expect(dealt.every(isTrucoCard)).toBe(true)
    expect(game.hand.manilha).toBe(manilhaOf(game.hand.vira))
  })
})

describe("TR-RN-03 força das cartas e manilha", () => {
  it("a manilha é o valor seguinte ao da vira, voltando do 3 para o 4", () => {
    expect(manilhaOf("7H")).toBe("Q")
    expect(manilhaOf("3S")).toBe("4")
    expect(manilhaOf("KD")).toBe("A")
    expect(manilhaOf("QC")).toBe("J")
  })

  it("segue a ordem 4, 5, 6, 7, Q, J, K, A, 2, 3 sem contar o naipe", () => {
    const order: Card[] = ["4H", "5H", "6H", "7H", "QH", "JH", "KH", "AH", "2H", "3H"]
    const manilha = manilhaOf("3D")
    const strengths = order.slice(1).map((card) => strengthOf(card, manilha))
    expect([...strengths].sort((a, b) => a - b)).toEqual(strengths)
    expect(strengthOf("7C", "4")).toBe(strengthOf("7D", "4"))
  })

  it("manilha vence qualquer carta e entre elas vale paus, copas, espadas e ouros", () => {
    const manilha = manilhaOf("7H")
    expect(strengthOf("QD", manilha)).toBeGreaterThan(strengthOf("3C", manilha))
    const suits: Card[] = ["QC", "QH", "QS", "QD"]
    const strengths = suits.map((card) => strengthOf(card, manilha))
    expect([...strengths].sort((a, b) => b - a)).toEqual(strengths)
    expect(strengthOf("QC", manilha)).toBe(MAX_STRENGTH)
  })
})

describe("TR-RN-04 quem abre a mão", () => {
  it("abre quem foi sorteado e depois o jogador à direita de quem abriu", () => {
    const game = unwrap(startGame(seatsOf([0, 1, 0, 1]), "p1", random))
    expect(game.hand.openerId).toBe("p1")
    expect(game.hand.currentPlayerId).toBe("p1")
    const ran = act(act(game, "p1", { type: "raise" }), "p2", { type: "run" })
    expect(ran.hand.number).toBe(2)
    expect(ran.hand.openerId).toBe("p2")
    expect(ran.hand.currentPlayerId).toBe("p2")
  })
})

describe("TR-RN-05 rodadas e mão", () => {
  it("quem joga a carta mais forte abre a rodada seguinte e quem vence 2 leva a mão", () => {
    let game = duel(["3H", "4H", "6H"], ["2C", "7C", "QC"])
    game = act(act(game, "a", play("3H")), "b", play("2C"))
    expect(game.hand.rounds).toEqual([0])
    expect(game.hand.currentPlayerId).toBe("a")

    game = act(act(game, "a", play("4H")), "b", play("7C"))
    expect(game.hand.rounds).toEqual([0, 1])
    expect(game.hand.currentPlayerId).toBe("b")

    game = act(act(game, "b", play("QC")), "a", play("6H"))
    expect(game.scores).toEqual([0, 1])
    expect(game.lastHand).toMatchObject({ winnerTeam: 1, points: 1, ending: "rounds" })
    expect(game.hand.number).toBe(2)
    expect(game.hand.rounds).toEqual([])
  })

  it("encerra a mão em duas rodadas quando o mesmo time vence as duas", () => {
    let game = duel(["3H", "2H", "4H"], ["7C", "6C", "QC"])
    game = act(act(game, "a", play("3H")), "b", play("7C"))
    game = act(act(game, "a", play("2H")), "b", play("6C"))
    expect(game.scores).toEqual([1, 0])
    expect(game.lastHand?.rounds).toEqual([0, 0])
  })

  it("só o jogador da vez joga e só cartas da própria mão", () => {
    const game = duel(["3H", "2H", "4H"], ["7C", "6C", "QC"])
    expect(refusal(game, "b", play("7C"))).toBe("NOT_YOUR_TURN")
    expect(refusal(game, "a", play("7C"))).toBe("CARD_NOT_IN_HAND")
  })
})

describe("TR-RN-06 empates", () => {
  it.each<[RoundResult[], ReturnType<typeof handOutcome>]>([
    [[0], null],
    [["tie"], null],
    [[0, 0], 0],
    [[1, "tie"], 1],
    [["tie", 1], 1],
    [[0, 1], null],
    [["tie", "tie"], null],
    [[0, 1, 1], 1],
    [[0, 1, "tie"], 0],
    [["tie", "tie", 0], 0],
    [["tie", "tie", "tie"], "nobody"],
  ])("%j decide %s", (rounds, outcome) => {
    expect(handOutcome(rounds)).toBe(outcome)
  })

  it("cartas iguais de times diferentes empatam a rodada", () => {
    const game = act(
      act(duel(["3H", "4H", "6H"], ["3C", "7C", "QC"]), "a", play("3H")),
      "b",
      play("3C")
    )
    expect(game.hand.rounds).toEqual(["tie"])
  })

  it("cartas iguais do mesmo time não empatam: o time vence", () => {
    let game = foursome([["3H"], ["2C"], ["3S"], ["7C"]])
    game = act(game, "a", play("3H"))
    game = act(game, "b", play("2C"))
    game = act(game, "c", play("3S"))
    game = act(game, "d", play("7C"))
    expect(game.hand.rounds).toEqual([0])
    expect(game.hand.currentPlayerId).toBe("a")
  })

  it("com as três rodadas empatadas ninguém pontua e a próxima mão vale 1", () => {
    let game = duel(["3H", "2H", "AH"], ["3C", "2C", "AC"], { stake: 3, lastRaiserTeam: 0 })
    game = act(act(game, "a", play("3H")), "b", play("3C"))
    game = act(act(game, "a", play("2H")), "b", play("2C"))
    game = act(act(game, "a", play("AH")), "b", play("AC"))
    expect(game.scores).toEqual([0, 0])
    expect(game.lastHand).toMatchObject({ winnerTeam: null, points: 0, ending: "tied" })
    expect(game.hand.stake).toBe(1)
  })
})

describe("TR-RN-07 quem abre depois do empate", () => {
  it("abre a próxima rodada quem abriu a rodada empatada", () => {
    const opened = { openerId: "b", roundOpenerId: "b", currentPlayerId: "b" }
    const game = act(
      act(duel(["3H", "4H", "6H"], ["3C", "7C", "QC"], opened), "b", play("3C")),
      "a",
      play("3H")
    )
    expect(game.hand.rounds).toEqual(["tie"])
    expect(game.hand.currentPlayerId).toBe("b")
  })
})

describe("TR-RN-08 a TR-RN-10 pedidos de aumento", () => {
  const base = () => duel(["3H", "2H", "4H"], ["7C", "6C", "QC"])

  it("sobe na escada 1, 3, 6, 9 e 12", () => {
    expect([1, 3, 6, 9, 12].map((stake) => nextStake(stake as 1))).toEqual([3, 6, 9, 12, null])
  })

  it("o jogador da vez pede e o adversário seguinte responde; ninguém joga enquanto isso", () => {
    const asked = act(base(), "a", { type: "raise" })
    expect(asked.hand.request).toEqual({ requesterId: "a", responderId: "b", stake: 3 })
    expect(actorOf(asked.hand)).toBe("b")
    expect(refusal(asked, "a", play("3H"))).toBe("NOT_YOUR_TURN")
    expect(refusal(asked, "b", play("7C"))).toBe("REQUEST_PENDING")
    expect(refusal(base(), "b", { type: "raise" })).toBe("NOT_YOUR_TURN")
  })

  it("aceitar faz a mão valer o novo valor e o time que pediu não pede de novo", () => {
    const accepted = act(act(base(), "a", { type: "raise" }), "b", { type: "accept" })
    expect(accepted.hand.stake).toBe(3)
    expect(accepted.hand.request).toBeNull()
    expect(actorOf(accepted.hand)).toBe("a")
    expect(refusal(accepted, "a", { type: "raise" })).toBe("NOT_YOUR_RAISE")

    const played = act(accepted, "a", play("3H"))
    expect(movesOf(played, "b").raiseTo).toBe(6)
    const won = act(act(act(played, "b", play("7C")), "a", play("2H")), "b", play("6C"))
    expect(won.scores).toEqual([3, 0])
  })

  it("correr dá ao time que pediu o valor anterior e encerra a mão", () => {
    const ran = act(act(base(), "a", { type: "raise" }), "b", { type: "run" })
    expect(ran.scores).toEqual([1, 0])
    expect(ran.lastHand).toMatchObject({ winnerTeam: 0, points: 1, ending: "ran" })
    expect(ran.hand.number).toBe(2)
  })

  it("aumentar devolve a resposta ao outro time e quem corre entrega o valor aceito", () => {
    const raised = act(act(base(), "a", { type: "raise" }), "b", { type: "raise" })
    expect(raised.hand.stake).toBe(3)
    expect(raised.hand.request).toEqual({ requesterId: "b", responderId: "a", stake: 6 })
    const ran = act(raised, "a", { type: "run" })
    expect(ran.scores).toEqual([0, 3])
  })

  it("com 4 jogadores responde o adversário logo depois de quem pediu", () => {
    const game = foursome([["3H"], ["2C"], ["3S"], ["7C"]])
    const asked = act(game, "a", { type: "raise" })
    expect(asked.hand.request?.responderId).toBe("b")
    const raised = act(asked, "b", { type: "raise" })
    expect(raised.hand.request?.responderId).toBe("c")
  })

  it("não passa de 12 e só responde quem tem pedido", () => {
    expect(refusal(duel(["3H"], ["7C"], { stake: 12 }), "a", { type: "raise" })).toBe("MAX_STAKE")
    const pending = duel(["3H"], ["7C"], {
      stake: 9,
      request: { requesterId: "a", responderId: "b", stake: 12 },
    })
    expect(refusal(pending, "b", { type: "raise" })).toBe("MAX_STAKE")
    expect(refusal(base(), "a", { type: "accept" })).toBe("NOTHING_TO_ANSWER")
  })
})

describe("TR-RN-11 mão de onze", () => {
  const table = (scores: readonly [number, number]) => {
    const game = foursome([[], [], [], []])
    const { hand: _hand, ...rest } = { ...game, scores }
    return rest
  }

  it("o time com 11 vê as cartas do parceiro e decide; o outro time não vê nada", () => {
    const game = dealHand(table([11, 5]), 1, "b", random)
    expect(modeFor(game.scores)).toBe("eleven")
    expect(game.hand.elevenDeciderId).toBe("c")
    expect(actorOf(game.hand)).toBe("c")

    const partner = game.players.find((player) => player.id === "c")?.hand
    expect(toTrucoView(game, "a").partnerHands).toEqual([{ playerId: "c", cards: partner }])
    expect(toTrucoView(game, "b").partnerHands).toEqual([])
    expect(movesOf(game, "c")).toEqual({
      play: false,
      raiseTo: null,
      answer: false,
      decideEleven: true,
      cover: false,
      fold: false,
    })
    expect(refusal(game, "b", play(game.players[1]?.hand[0] as Card))).toBe("NOT_YOUR_TURN")
    expect(refusal(game, "c", { type: "raise" })).toBe("ELEVEN_DECISION_PENDING")
    expect(refusal(game, "c", play(partner?.[0] as Card))).toBe("ELEVEN_DECISION_PENDING")
  })

  it("jogar faz a mão valer 3 sem pedidos de aumento", () => {
    const game = act(dealHand(table([11, 5]), 1, "b", random), "c", { type: "accept" })
    expect(game.hand.stake).toBe(3)
    expect(game.hand.elevenDeciderId).toBeNull()
    expect(actorOf(game.hand)).toBe("b")
    expect(refusal(game, "b", { type: "raise" })).toBe("RAISE_NOT_ALLOWED")
    expect(movesOf(game, "b").raiseTo).toBeNull()
  })

  it("correr dá 1 ponto ao outro time", () => {
    const game = act(dealHand(table([5, 11]), 1, "a", random), "b", { type: "run" })
    expect(game.scores).toEqual([6, 11])
    expect(game.lastHand).toMatchObject({ winnerTeam: 0, points: 1, ending: "elevenRan" })
  })
})

describe("TR-RN-12 mão de ferro", () => {
  const iron = () => {
    const game = duel([], [])
    const { hand: _hand, ...rest } = { ...game, scores: [11, 11] as const }
    return dealHand(rest, 1, "a", random)
  }

  it("ninguém vê as próprias cartas e não há pedidos", () => {
    const game = iron()
    expect(game.hand.mode).toBe("iron")
    expect(game.hand.elevenDeciderId).toBeNull()
    const view = toTrucoView(game, "a")
    expect(view.blind).toBe(true)
    expect(view.hand).toEqual([])
    expect(view.handSize).toBe(3)
    expect(refusal(game, "a", { type: "raise" })).toBe("RAISE_NOT_ALLOWED")
    expect(refusal(game, "a", play(game.players[0]?.hand[0] as Card))).toBe("CARD_HIDDEN")
    expect(refusal(game, "a", { type: "playBlind", slot: 3 })).toBe("CARD_NOT_IN_HAND")
  })

  it("a carta escolhida aparece ao ser jogada e quem vence a mão vence a partida", () => {
    let game = iron()
    const card = game.players[0]?.hand[1]
    game = act(game, "a", { type: "playBlind", slot: 1 })
    expect(toTrucoView(game, "b").table).toEqual([{ playerId: "a", card, covered: false }])
    for (let guard = 0; guard < 6 && game.endReason === null && game.hand.number === 1; guard++) {
      game = act(game, actorOf(game.hand), { type: "playBlind", slot: 0 })
    }
    const lastWinner = game.lastHand?.winnerTeam ?? null
    if (lastWinner === null) {
      expect(game.hand.mode).toBe("iron")
    } else {
      expect(game.winnerTeam).toBe(lastWinner)
      expect(game.scores[lastWinner]).toBe(12)
    }
  })

  it("fora da mão de ferro não se joga carta virada", () => {
    expect(refusal(duel(["3H"], ["7C"]), "a", { type: "playBlind", slot: 0 })).toBe(
      "NOT_BLIND_HAND"
    )
  })
})

describe("TR-RN-13 fim da partida", () => {
  it("vence o primeiro a 12 e o placar nunca passa de 12", () => {
    let game = buildTruco({
      players: {
        a: { team: 0, hand: ["3H", "2H", "4H"] },
        b: { team: 1, hand: ["7C", "6C", "QC"] },
      },
      scores: [10, 4],
      hand: { stake: 3, lastRaiserTeam: 1 },
    })
    game = act(act(game, "a", play("3H")), "b", play("7C"))
    game = act(act(game, "a", play("2H")), "b", play("6C"))
    expect(game.scores).toEqual([12, 4])
    expect(game.winnerTeam).toBe(0)
    expect(game.endReason).toBe("score")
    expect(trucoRules.isFinished(game)).toBe(true)
    expect(refusal(game, "a", play("4H"))).toBe("GAME_FINISHED")
    expect(expireTruco(game, random)).toBe(game)
  })
})

describe("TR-RN-14 visibilidade", () => {
  it("cada jogador recebe só a própria mão; vira, mesa e placar são públicos", () => {
    const game = act(duel(["3H", "2H", "4H"], ["7C", "6C", "QC"]), "a", play("3H"))
    const view = toTrucoView(game, "b")
    const frame = JSON.stringify(view)
    expect(view.hand).toEqual(["7C", "6C", "QC"])
    for (const card of ["2H", "4H"]) expect(frame).not.toContain(`"${card}"`)
    expect(view.table).toEqual([{ playerId: "a", card: "3H", covered: false }])
    expect(view.vira).toBe("4C")
    expect(view.manilha).toBe("5")
    expect(view.players.map((player) => player.handSize)).toEqual([2, 3])
    expect(view.partnerHands).toEqual([])
  })

  it("quem não está na partida não recebe cartas nem jogadas", () => {
    const view = toTrucoView(duel(["3H"], ["7C"]), "visitante")
    expect(view.hand).toEqual([])
    expect(view.viewerTeam).toBeNull()
    expect(view.moves).toEqual({
      play: false,
      raiseTo: null,
      answer: false,
      decideEleven: false,
      cover: false,
      fold: false,
    })
  })
})

describe("carta escondida", () => {
  const secondRound = () =>
    act(act(duel(["3H", "2H", "4H"], ["7C", "6C", "QC"]), "a", play("3H")), "b", play("7C"))

  it("não deixa esconder na primeira rodada nem na mão de ferro", () => {
    const game = duel(["3H", "2H"], ["7C", "6C"])
    expect(movesOf(game, "a").cover).toBe(false)
    expect(refusal(game, "a", { type: "cover", card: "3H" })).toBe("COVER_NOT_ALLOWED")
    const ironHand = duel(["3H", "2H"], ["7C", "6C"], { mode: "iron", rounds: [0] })
    expect(refusal(ironHand, "a", { type: "cover", card: "3H" })).toBe("NOT_BLIND_HAND")
  })

  it("a carta escondida perde para qualquer outra e só o dono vê qual é", () => {
    const opened = secondRound()
    expect(movesOf(opened, "a").cover).toBe(true)
    const covered = act(opened, "a", { type: "cover", card: "2H" })
    expect(toTrucoView(covered, "b").table).toEqual([{ playerId: "a", card: null, covered: true }])
    expect(toTrucoView(covered, "a").table).toEqual([{ playerId: "a", card: "2H", covered: true }])
    expect(JSON.stringify(toTrucoView(covered, "b"))).not.toContain('"2H"')
    expect(covered.events.at(-1)).toEqual({ type: "covered", playerId: "a" })
    const answered = act(covered, "b", play("QC"))
    expect(answered.lastRound).toMatchObject({ round: 2, result: 1, winnerId: "b" })
  })

  it("duas cartas escondidas empatam a rodada", () => {
    const covered = act(secondRound(), "a", { type: "cover", card: "2H" })
    const both = act(covered, "b", { type: "cover", card: "6C" })
    expect(both.lastRound).toMatchObject({ round: 2, result: "tie", winnerId: null })
  })
})

describe("correr da mão e mostrar as cartas", () => {
  it("na sua vez dá para correr sem pedido: o outro time leva o valor da mão", () => {
    const game = duel(["3H", "2H", "4H"], ["7C", "6C", "QC"], { stake: 3, lastRaiserTeam: 1 })
    expect(movesOf(game, "a").fold).toBe(true)
    expect(movesOf(game, "b").fold).toBe(false)
    expect(refusal(game, "b", { type: "run" })).toBe("NOT_YOUR_TURN")
    const ran = act(game, "a", { type: "run" })
    expect(ran.scores).toEqual([0, 3])
    expect(ran.lastHand).toMatchObject({
      ending: "ran",
      winnerTeam: 1,
      points: 3,
      runner: { playerId: "a", cards: ["3H", "2H", "4H"], shown: false },
    })
  })

  it("as cartas de quem correu ficam escondidas até ele decidir mostrar", () => {
    const ran = act(duel(["3H", "2H", "4H"], ["7C", "6C", "QC"]), "a", { type: "run" })
    expect(toTrucoView(ran, "b").lastHand?.runner).toEqual({
      playerId: "a",
      cards: null,
      shown: false,
    })
    expect(toTrucoView(ran, "a").lastHand?.runner?.cards).toEqual(["3H", "2H", "4H"])
    expect(toTrucoView(ran, "a").canShowHand).toBe(true)
    expect(toTrucoView(ran, "b").canShowHand).toBe(false)
    expect(refusal(ran, "b", { type: "show" })).toBe("NOTHING_TO_SHOW")

    const shown = act(ran, "a", { type: "show" })
    expect(shown.step).toBe(ran.step)
    expect(toTrucoView(shown, "b").lastHand?.runner).toEqual({
      playerId: "a",
      cards: ["3H", "2H", "4H"],
      shown: true,
    })
    expect(toTrucoView(shown, "a").canShowHand).toBe(false)
    expect(shown.events.at(-1)).toEqual({
      type: "showed",
      playerId: "a",
      cards: ["3H", "2H", "4H"],
    })
    expect(refusal(shown, "a", { type: "show" })).toBe("NOTHING_TO_SHOW")
  })

  it("só dá para mostrar antes da primeira jogada da mão seguinte", () => {
    const ran = act(duel(["3H", "2H", "4H"], ["7C", "6C", "QC"]), "a", { type: "run" })
    const opener = actorOf(ran.hand)
    const card = ran.players.find((player) => player.id === opener)?.hand[0] as Card
    const moved = act(ran, opener, play(card))
    expect(toTrucoView(moved, "a").canShowHand).toBe(false)
    expect(refusal(moved, "a", { type: "show" })).toBe("NOTHING_TO_SHOW")
  })

  it("não oferece mostrar quando quem correu já tinha jogado todas as cartas", () => {
    const lastCardPlayed = duel([], ["7C"], {
      rounds: [0, 1],
      table: [{ playerId: "a", card: "3H", covered: false }],
      currentPlayerId: "b",
      request: { requesterId: "b", responderId: "a", stake: 3 },
    })
    const ran = act(lastCardPlayed, "a", { type: "run" })
    expect(ran.lastHand?.runner?.cards).toEqual([])
    expect(toTrucoView(ran, "a").canShowHand).toBe(false)
    expect(refusal(ran, "a", { type: "show" })).toBe("NOTHING_TO_SHOW")
    expect(trucoPauseAfter(lastCardPlayed, ran)).toBe(HAND_PAUSE_MS)
  })

  it("guarda a última rodada para a mesa mostrar quem levou", () => {
    const game = act(act(duel(["3H", "2H"], ["7C", "6C"]), "a", play("3H")), "b", play("7C"))
    expect(game.hand.table).toEqual([])
    expect(game.lastRound).toEqual({
      handNumber: 1,
      round: 1,
      table: [
        { playerId: "a", card: "3H", covered: false },
        { playerId: "b", card: "7C", covered: false },
      ],
      result: 0,
      winnerId: "a",
    })
  })
})

describe("TR-RN-15 saída pelo botão", () => {
  it("o time de quem sai perde e a partida termina", () => {
    const game = removeTrucoPlayer(foursome([["3H"], ["2C"], ["3S"], ["7C"]]), "c")
    expect(game.winnerTeam).toBe(1)
    expect(game.endReason).toBe("abandoned")
    expect(removeTrucoPlayer(game, "b")).toBe(game)
    const running = duel(["3H"], ["7C"])
    expect(removeTrucoPlayer(running, "visitante")).toBe(running)
  })
})

describe("TR-RN-16 tempo de 30 segundos", () => {
  it("joga uma carta aleatória de quem estourou", () => {
    const game = expireTruco(duel(["3H", "2H", "4H"], ["7C", "6C", "QC"]), random)
    expect(game.players[0]?.hand).toHaveLength(2)
    expect(game.hand.table).toHaveLength(1)
    expect(game.events.map((event) => event.type)).toEqual(["timedOut", "played"])
    expect(trucoRules.turnDurationMs).toBe(30_000)
  })

  it("quem estoura ao responder corre", () => {
    const asked = act(duel(["3H", "2H", "4H"], ["7C", "6C", "QC"]), "a", { type: "raise" })
    const game = expireTruco(asked, random)
    expect(game.scores).toEqual([1, 0])
    expect(game.lastHand?.ending).toBe("ran")
  })

  it("estourar na decisão da mão de onze vale como correr", () => {
    const base = duel([], [])
    const { hand: _hand, ...rest } = { ...base, scores: [11, 3] as const }
    const game = expireTruco(dealHand(rest, 1, "b", random), random)
    expect(game.scores).toEqual([11, 4])
  })

  it("na mão de ferro joga uma carta virada aleatória", () => {
    const base = duel([], [])
    const { hand: _hand, ...rest } = { ...base, scores: [11, 11] as const }
    const game = expireTruco(dealHand(rest, 1, "a", random), random)
    expect(game.hand.table).toHaveLength(1)
  })

  it("cada decisão ganha um novo número de turno para o relógio", () => {
    const game = duel(["3H", "2H", "4H"], ["7C", "6C", "QC"])
    const asked = act(game, "a", { type: "raise" })
    expect(trucoRules.turnOf(game)).toEqual({ number: 1, playerId: "a" })
    expect(trucoRules.turnOf(asked)).toEqual({ number: 2, playerId: "b" })
  })
})

const randomMove = (game: TrucoGame, roll: ReturnType<typeof seededRandom>): TrucoAction => {
  const actor = actorOf(game.hand)
  const moves = movesOf(game, actor)
  const hand = game.players.find((player) => player.id === actor)?.hand ?? []
  if (moves.decideEleven) return roll.nextInt(2) === 0 ? { type: "accept" } : { type: "run" }
  if (moves.answer) {
    const options: TrucoAction[] = [{ type: "accept" }, { type: "run" }]
    if (moves.raiseTo !== null) options.push({ type: "raise" })
    return options[roll.nextInt(options.length)] as TrucoAction
  }
  if (moves.raiseTo !== null && roll.nextInt(8) === 0) return { type: "raise" }
  if (game.hand.mode === "iron") return { type: "playBlind", slot: roll.nextInt(hand.length) }
  return play(hand[roll.nextInt(hand.length)] as Card)
}

describe("simulação de partidas completas", () => {
  it.each([2, 4, 6])("%i jogadores sempre terminam com um vencedor e cartas válidas", (count) => {
    for (let seed = 1; seed <= 60; seed++) {
      const roll = seededRandom(seed)
      const seats = seatsOf(Array.from({ length: count }, (_, index) => index % 2))
      let game = unwrap(startGame(seats, "p0", roll))
      let steps = 0
      while (game.endReason === null) {
        const dealt = allDealtCards(game)
        expect(new Set(dealt).size).toBe(dealt.length)
        game = unwrap(playTruco(game, actorOf(game.hand), randomMove(game, roll), roll))
        expect(Math.max(...game.scores)).toBeLessThanOrEqual(12)
        steps++
        expect(steps).toBeLessThan(5000)
      }
      expect(game.winnerTeam).not.toBeNull()
      expect(game.scores[game.winnerTeam ?? 0]).toBe(12)
    }
  })
})

describe("ritmo da mesa", () => {
  const opened = () => duel(["3H", "2H", "4H"], ["7C", "6C", "QC"])

  it("pausa depois do pedido e da resposta, mas não depois de jogar uma carta", () => {
    const game = opened()
    const played = act(game, "a", play("3H"))
    expect(trucoPauseAfter(game, played)).toBe(0)
    const asked = act(game, "a", { type: "raise" })
    expect(trucoPauseAfter(game, asked)).toBe(CALL_PAUSE_MS)
    const raisedBack = act(asked, "b", { type: "raise" })
    expect(trucoPauseAfter(asked, raisedBack)).toBe(CALL_PAUSE_MS)
    const accepted = act(asked, "b", { type: "accept" })
    expect(trucoPauseAfter(asked, accepted)).toBe(ANSWER_PAUSE_MS)
  })

  it("pausa mais no fim da rodada e ainda mais no fim da mão", () => {
    const game = act(opened(), "a", play("3H"))
    const settled = act(game, "b", play("7C"))
    expect(trucoPauseAfter(game, settled)).toBe(ROUND_PAUSE_MS)
    const ran = act(opened(), "a", { type: "run" })
    expect(trucoPauseAfter(opened(), ran)).toBe(RUN_PAUSE_MS)
    const secondRound = act(settled, "a", play("2H"))
    const won = act(secondRound, "b", play("6C"))
    expect(won.hand.number).toBe(2)
    expect(trucoPauseAfter(secondRound, won)).toBe(HAND_PAUSE_MS)
    const shown = act(ran, "a", { type: "show" })
    expect(trucoPauseAfter(ran, shown)).toBe(0)
  })
})
