import { describe, expect, it } from "vitest"
import type { Card } from "../../src/domain/cards/card.js"
import {
  expireBlackjack,
  playBlackjack,
  removeBlackjackPlayer,
} from "../../src/domain/games/blackjack/actions.js"
import type { BlackjackAction } from "../../src/domain/games/blackjack/actions.js"
import {
  DEAL_DONE_MS,
  DEAL_STEP_MS,
  DEALER_STEP_MS,
  FINAL_PAUSE_MS,
  getSeat,
  HAND_CLOSE_MS,
  NATURAL_PAUSE_MS,
  SETTLE_PAUSE_MS,
} from "../../src/domain/games/blackjack/model.js"
import type { BlackjackGame } from "../../src/domain/games/blackjack/model.js"
import { toBlackjackView } from "../../src/domain/games/blackjack/player-view.js"
import { dealerStep, settle } from "../../src/domain/games/blackjack/round.js"
import { blackjackPauseAfter, blackjackRules } from "../../src/domain/games/blackjack/rules.js"
import { scoreOf } from "../../src/domain/games/blackjack/scoring.js"
import { startGame } from "../../src/domain/games/blackjack/setup.js"
import type { Seat } from "../../src/domain/shared/seat.js"
import { seededRandom, unwrap } from "../support/game-builder.js"
import { buildBlackjack, cardsInPlay, hand } from "../support/blackjack-builder.js"

const random = seededRandom(5)

const seats = (count: number): readonly Seat[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `p${index}`,
    nickname: `P${index}`,
    team: null,
  }))

const act = (game: BlackjackGame, playerId: string, action: BlackjackAction) =>
  unwrap(playBlackjack(game, playerId, action, random))

const refusal = (game: BlackjackGame, playerId: string, action: BlackjackAction) => {
  const result = playBlackjack(game, playerId, action, random)
  return result.ok ? null : result.error
}

const runDealer = (game: BlackjackGame): BlackjackGame => {
  let current = game
  while (current.phase === "dealer") current = dealerStep(current, random)
  return current
}

const dealOut = (game: BlackjackGame, source = random): BlackjackGame => {
  let current = game
  while (current.phase === "dealing") current = expireBlackjack(current, source)
  return current
}

const net = (game: BlackjackGame, playerId: string) =>
  game.lastRound?.hands.filter((result) => result.playerId === playerId).map((result) => result.net)

describe("BJ-RN-01 a BJ-RN-04 preparação", () => {
  it("aceita de 1 a 6 jogadores, inclusive sozinho", () => {
    expect(startGame(seats(0), "p0", random)).toEqual({
      ok: false,
      error: "BLACKJACK_PLAYER_COUNT",
    })
    expect(startGame(seats(7), "p0", random)).toEqual({
      ok: false,
      error: "BLACKJACK_PLAYER_COUNT",
    })
    for (const count of [1, 2, 6]) expect(startGame(seats(count), "p0", random).ok).toBe(true)
  })

  it("começa a rodada 1 de apostas com 1000 fichas para cada um", () => {
    const game = unwrap(startGame(seats(3), "p2", random))
    expect(game).toMatchObject({ round: 1, phase: "betting" })
    expect(game.players.map((seat) => seat.chips)).toEqual([1000, 1000, 1000])
  })

  it("embaralha um baralho de 52 a cada distribuição e segue a ordem da sala", () => {
    let game = unwrap(startGame(seats(3), "p2", random))
    for (const id of ["p0", "p1", "p2"]) game = act(game, id, { type: "bet", amount: 10 })
    expect(game.phase).toBe("dealing")
    game = dealOut(game)
    const cards = cardsInPlay(game)
    expect(cards).toHaveLength(52)
    expect(new Set(cards).size).toBe(52)
    expect(game.players.every((seat) => seat.hands[0]?.cards.length === 2)).toBe(true)
  })
})

describe("BJ-RN-05 e BJ-RN-06 valores", () => {
  it.each<[readonly Card[], number, boolean]>([
    [["AS", "6H"], 17, true],
    [["AS", "6H", "KD"], 17, false],
    [["KS", "QH"], 20, false],
    [["AS", "AH"], 12, true],
    [["AS", "AH", "9C"], 21, true],
    [["5S", "4H", "2C"], 11, false],
  ])("%j soma %i", (cards, total, soft) => {
    expect(scoreOf(cards)).toEqual({ total, soft })
  })

  it("blackjack ganha de 21 com 3 cartas e paga 3 para 2", () => {
    const game = buildBlackjack({
      phase: "dealer",
      dealer: { cards: ["10S", "5H", "6D"], revealed: true },
      players: {
        ana: { hands: [hand(["AS", "KH"], 20, { done: true })] },
        beto: { hands: [hand(["7S", "7H", "7D"], 20, { done: true })] },
      },
    })
    const settled = settle(game)
    expect(net(settled, "ana")).toEqual([30])
    expect(net(settled, "beto")).toEqual([0])
    expect(getSeat(settled, "ana").chips).toBe(900 + 50)
  })
})

describe("BJ-RN-07 apostas", () => {
  const game = buildBlackjack({
    phase: "betting",
    players: { ana: { chips: 1000 }, beto: { chips: 25 } },
  })

  it("aceita de 10 em 10 até todas as fichas e recusa o resto", () => {
    expect(refusal(game, "ana", { type: "bet", amount: 5 })).toBe("INVALID_BET")
    expect(refusal(game, "ana", { type: "bet", amount: 15 })).toBe("INVALID_BET")
    expect(refusal(game, "ana", { type: "bet", amount: 1010 })).toBe("INVALID_BET")
    expect(refusal(game, "ana", { type: "hit" })).toBe("NOT_YOUR_TURN")
    const placed = act(game, "ana", { type: "bet", amount: 200 })
    expect(getSeat(placed, "ana")).toMatchObject({ bet: 200, chips: 800 })
    expect(refusal(placed, "ana", { type: "bet", amount: 10 })).toBe("ALREADY_BET")
  })

  it("aceita apostar todas as fichas mesmo fora do passo de 10", () => {
    expect(getSeat(act(game, "beto", { type: "bet", amount: 25 }), "beto")).toMatchObject({
      bet: 25,
      chips: 0,
    })
  })

  it("só distribui quando todos apostaram", () => {
    const one = act(game, "ana", { type: "bet", amount: 10 })
    expect(one.phase).toBe("betting")
    const both = act(one, "beto", { type: "bet", amount: 20 })
    expect(both.phase).not.toBe("betting")
    expect(refusal(both, "ana", { type: "bet", amount: 10 })).toBe("NOT_BETTING")
  })
})

describe("BJ-RN-08 e BJ-RN-17 distribuição e visibilidade", () => {
  it("dá 2 cartas abertas a cada um e esconde a segunda da banca", () => {
    const game = buildBlackjack({
      dealer: { cards: ["9S", "QD"] },
      players: { ana: { hands: [hand(["2S", "3H"])] }, beto: { hands: [hand(["4S", "5H"])] } },
    })
    const view = toBlackjackView(game, "beto")
    expect(view.dealer).toEqual({ cards: ["9S"], hidden: 1, total: 9, soft: false })
    expect(JSON.stringify(view)).not.toContain('"QD"')
    expect(JSON.stringify(view)).not.toContain('"2C"')
    expect(view.players[0]?.hands[0]?.cards).toEqual(["2S", "3H"])
  })
})

describe("BJ-RN-09 blackjack da banca", () => {
  it("oferece seguro com ás da banca e paga 2 para 1 quando aceito", () => {
    const game = buildBlackjack({
      phase: "insurance",
      dealer: { cards: ["AS", "KD"] },
      turn: { playerId: "ana" },
      players: {
        ana: { chips: 900, insurance: null, hands: [hand(["9H", "QC"], 100, { done: true })] },
      },
    })

    const settled = act(game, "ana", { type: "insurance", accepted: true })

    expect(settled.phase).toBe("settled")
    expect(getSeat(settled, "ana")).toMatchObject({ chips: 1000, insurance: true })
    expect(settled.lastRound?.hands[0]).toMatchObject({
      insuranceBet: 50,
      insuranceNet: 100,
      outcome: "lose",
    })
  })

  it("não cobra o seguro recusado e segue a rodada se a banca não tiver blackjack", () => {
    const game = buildBlackjack({
      phase: "insurance",
      dealer: { cards: ["AS", "9D"] },
      turn: { playerId: "ana" },
      players: {
        ana: { chips: 900, insurance: null, hands: [hand(["9H", "QC"], 100, { done: true })] },
      },
    })

    const next = act(game, "ana", { type: "insurance", accepted: false })

    expect(next.phase).toBe("dealer")
    expect(getSeat(next, "ana")).toMatchObject({ chips: 900, insurance: false })
  })

  it("não oferece seguro quando o jogador não consegue pagar", () => {
    const game = buildBlackjack({
      phase: "insurance",
      dealer: { cards: ["AS", "9D"] },
      turn: { playerId: "ana" },
      players: {
        ana: { chips: 40, insurance: null, hands: [hand(["9H", "QC"], 100, { done: true })] },
      },
    })

    expect(toBlackjackView(game, "ana").moves.insurance).toBeNull()
  })

  it("revela na hora: quem não tem blackjack perde e quem tem empata", () => {
    const game = buildBlackjack({
      dealer: { cards: ["AS", "KD"] },
      phase: "dealer",
      players: {
        ana: { hands: [hand(["AH", "QH"], 100, { done: true })] },
        beto: { hands: [hand(["9H", "QC"], 100, { done: true })] },
      },
    })
    const settled = settle({ ...game, dealer: { ...game.dealer, revealed: true } })
    expect(settled.lastRound?.dealerBlackjack).toBe(true)
    expect(net(settled, "ana")).toEqual([0])
    expect(net(settled, "beto")).toEqual([-100])
  })

  it("a distribuição com blackjack da banca fecha a rodada sem vez dos jogadores", () => {
    for (let seed = 0; seed < 400; seed++) {
      let game = buildBlackjack({ phase: "betting", players: { ana: { chips: 1000 } } })
      const source = seededRandom(seed)
      game = dealOut(
        unwrap(playBlackjack(game, "ana", { type: "bet", amount: 10 }, source)),
        source
      )
      if (scoreOf(game.dealer.cards).total !== 21) continue
      expect(game.phase).toBe("settled")
      expect(game.dealer.revealed).toBe(true)
      return
    }
    throw new Error("nenhuma semente deu blackjack à banca")
  })
})

describe("BJ-RN-10 pedir e parar", () => {
  const game = buildBlackjack({
    deck: ["KC", "2D"],
    players: { ana: { hands: [hand(["10S", "6H"])] }, beto: { hands: [hand(["9S", "8H"])] } },
  })

  it("estoura passando de 21 e a vez passa", () => {
    const busted = act(game, "ana", { type: "hit" })
    expect(getSeat(busted, "ana").hands[0]).toMatchObject({
      done: true,
      cards: ["10S", "6H", "KC"],
    })
    expect(busted.turn.playerId).toBe("beto")
    expect(busted.events.at(-1)).toEqual({ type: "busted", playerId: "ana", total: 26 })
  })

  it("parar passa a vez e só o jogador da vez age", () => {
    expect(refusal(game, "beto", { type: "stand" })).toBe("NOT_YOUR_TURN")
    const stood = act(game, "ana", { type: "stand" })
    expect(stood.turn).toMatchObject({ playerId: "beto", number: 6 })
  })

  it("com 21 a mão para sozinha", () => {
    const one = buildBlackjack({ deck: ["5D"], players: { ana: { hands: [hand(["10S", "6H"])] } } })
    expect(act(one, "ana", { type: "hit" }).phase).toBe("dealer")
  })
})

describe("BJ-RN-11 dobrar", () => {
  it("dobra a aposta, recebe 1 carta e para", () => {
    const game = buildBlackjack({
      deck: ["9C"],
      players: { ana: { chips: 500, hands: [hand(["5S", "6H"])] } },
    })
    const doubled = act(game, "ana", { type: "double" })
    expect(getSeat(doubled, "ana")).toMatchObject({ chips: 400 })
    expect(getSeat(doubled, "ana").hands[0]).toMatchObject({
      bet: 200,
      cards: ["5S", "6H", "9C"],
      done: true,
      doubled: true,
    })
    expect(doubled.phase).toBe("dealer")
  })

  it("recusa sem fichas ou depois da terceira carta", () => {
    const poor = buildBlackjack({ players: { ana: { chips: 50, hands: [hand(["5S", "6H"])] } } })
    expect(refusal(poor, "ana", { type: "double" })).toBe("CANNOT_DOUBLE")
    const three = buildBlackjack({ players: { ana: { hands: [hand(["2S", "3H", "4D"])] } } })
    expect(refusal(three, "ana", { type: "double" })).toBe("CANNOT_DOUBLE")
    expect(toBlackjackView(three, "ana").moves).toMatchObject({ hit: true, double: false })
  })
})

describe("BJ-RN-12 dividir", () => {
  it("separa o par em 2 mãos com a mesma aposta, jogadas uma de cada vez", () => {
    const game = buildBlackjack({
      deck: ["3C", "KD", "10H"],
      players: {
        ana: { chips: 500, hands: [hand(["8S", "8H"])] },
        beto: { hands: [hand(["9S", "9H"])] },
      },
    })
    const split = act(game, "ana", { type: "split" })
    const seat = getSeat(split, "ana")
    expect(seat.chips).toBe(400)
    expect(seat.hands.map((held) => held.cards)).toEqual([
      ["8S", "3C"],
      ["8H", "KD"],
    ])
    expect(seat.hands.every((held) => held.fromSplit && held.bet === 100)).toBe(true)
    expect(split.turn).toMatchObject({ playerId: "ana", handIndex: 0 })
    expect(refusal(split, "ana", { type: "double" })).toBe("CANNOT_DOUBLE")
    expect(refusal(split, "ana", { type: "split" })).toBe("CANNOT_SPLIT")
    const first = act(split, "ana", { type: "stand" })
    expect(first.turn).toMatchObject({ playerId: "ana", handIndex: 1 })
    expect(act(first, "ana", { type: "stand" }).turn.playerId).toBe("beto")
  })

  it("divide quaisquer duas cartas de valor 10, como dama e valete", () => {
    const game = buildBlackjack({
      deck: ["3C", "9D"],
      players: { ana: { chips: 500, hands: [hand(["QS", "JH"])] } },
    })
    expect(toBlackjackView(game, "ana").moves.split).toBe(true)
    const split = act(game, "ana", { type: "split" })
    expect(getSeat(split, "ana").hands.map((held) => held.cards)).toEqual([
      ["QS", "3C"],
      ["JH", "9D"],
    ])
    expect(split.events.at(-1)).toEqual({ type: "split", playerId: "ana", cards: ["QS", "JH"] })
    for (const pair of [
      ["10S", "KH"],
      ["KS", "QH"],
      ["JS", "10H"],
    ] as const) {
      const ten = buildBlackjack({ players: { ana: { chips: 500, hands: [hand(pair)] } } })
      expect(toBlackjackView(ten, "ana").moves.split).toBe(true)
    }
  })

  it("dois A recebem só 1 carta cada e param", () => {
    const game = buildBlackjack({
      deck: ["KC", "9D"],
      players: { ana: { chips: 500, hands: [hand(["AS", "AH"])] } },
    })
    const split = act(game, "ana", { type: "split" })
    expect(getSeat(split, "ana").hands.every((held) => held.done)).toBe(true)
    expect(split.phase).toBe("dealer")
  })

  it("21 depois de dividir não é blackjack e paga 1 para 1", () => {
    const game = buildBlackjack({
      phase: "dealer",
      dealer: { cards: ["10S", "8H"], revealed: true },
      players: { ana: { hands: [hand(["AS", "KC"], 100, { fromSplit: true, done: true })] } },
    })
    expect(net(settle(game), "ana")).toEqual([100])
  })

  it("recusa sem par ou sem fichas", () => {
    const loose = buildBlackjack({ players: { ana: { hands: [hand(["8S", "9H"])] } } })
    expect(refusal(loose, "ana", { type: "split" })).toBe("CANNOT_SPLIT")
    const poor = buildBlackjack({ players: { ana: { chips: 90, hands: [hand(["8S", "8H"])] } } })
    expect(refusal(poor, "ana", { type: "split" })).toBe("CANNOT_SPLIT")
  })
})

describe("BJ-RN-13 vez da banca", () => {
  it("revela, compra uma carta por passo e para no 17 macio", () => {
    const game = buildBlackjack({
      phase: "dealer",
      deck: ["5C", "AH", "9C"],
      dealer: { cards: ["2S", "4H"] },
      players: { ana: { hands: [hand(["10S", "8H"], 100, { done: true })] } },
    })
    const revealed = dealerStep(game, random)
    expect(revealed.dealer).toEqual({ cards: ["2S", "4H"], revealed: true })
    const drew = dealerStep(revealed, random)
    expect(drew.dealer.cards).toEqual(["2S", "4H", "5C"])
    const soft = dealerStep(drew, random)
    expect(scoreOf(soft.dealer.cards)).toEqual({ total: 12, soft: false })
    const settled = runDealer(soft)
    expect(settled.dealer.cards).toEqual(["2S", "4H", "5C", "AH", "9C"])
    expect(settled.lastRound).toMatchObject({ dealerTotal: 21 })
    const softSeventeen = runDealer(
      buildBlackjack({
        phase: "dealer",
        deck: ["KC"],
        dealer: { cards: ["AS", "6H"], revealed: true },
        players: { ana: { hands: [hand(["10S", "8H"], 100, { done: true })] } },
      })
    )
    expect(softSeventeen.dealer.cards).toEqual(["AS", "6H"])
  })

  it("não compra se todos estouraram", () => {
    const game = buildBlackjack({
      phase: "dealer",
      deck: ["5C"],
      dealer: { cards: ["2S", "4H"], revealed: true },
      players: { ana: { hands: [hand(["10S", "8H", "9D"], 100, { done: true })] } },
    })
    expect(runDealer(game).dealer.cards).toEqual(["2S", "4H"])
  })
})

describe("BJ-RN-14 pagamento", () => {
  it("vitória paga a aposta, empate devolve e a banca estourada paga quem não estourou", () => {
    const game = buildBlackjack({
      phase: "dealer",
      dealer: { cards: ["10S", "8H"], revealed: true },
      players: {
        ana: { chips: 0, hands: [hand(["10H", "9H"], 100, { done: true })] },
        beto: { chips: 0, hands: [hand(["10D", "8D"], 100, { done: true })] },
        caio: { chips: 0, hands: [hand(["10C", "7C"], 100, { done: true })] },
      },
    })
    const settled = settle(game)
    expect(settled.players.map((seat) => seat.chips)).toEqual([200, 100, 0])
    const bust = settle({ ...game, dealer: { cards: ["10S", "6H", "9C"], revealed: true } })
    expect(bust.lastRound?.dealerBust).toBe(true)
    expect(bust.players.map((seat) => seat.chips)).toEqual([200, 200, 200])
  })
})

describe("BJ-RN-15 e BJ-RN-16 fim", () => {
  const closing = (round: number, chips: readonly number[]) =>
    buildBlackjack({
      round,
      phase: "dealer",
      dealer: { cards: ["10S", "8H"], revealed: true },
      players: Object.fromEntries(
        chips.map((amount, index) => [
          `p${index}`,
          { chips: amount, hands: [hand(["2S", "3H", "4D"], 10, { done: true })] },
        ])
      ),
    })

  it("depois da 10ª rodada vence quem tem mais fichas, com empate", () => {
    const ended = settle(closing(10, [500, 800, 800]))
    expect(ended).toMatchObject({ endReason: "rounds", winnerIds: ["p1", "p2"] })
    expect(settle(closing(9, [500, 800])).endReason).toBeNull()
  })

  it("quem zera só assiste e, se todos zerarem, a partida acaba", () => {
    const zeroed = settle(closing(3, [0, 300]))
    const next = expireBlackjack(zeroed, random)
    expect(getSeat(next, "p0").status).toBe("broke")
    expect(refusal(next, "p0", { type: "bet", amount: 10 })).toBe("OUT_OF_CHIPS")
    expect(next.events).toContainEqual({ type: "broke", playerId: "p0" })
    expect(settle(closing(3, [0, 0]))).toMatchObject({ endReason: "broke", winnerIds: [] })
  })
})

describe("BJ-RN-18 tempo", () => {
  it("na aposta, quem não apostou fica com a mínima e a mesa distribui", () => {
    const game = buildBlackjack({
      phase: "betting",
      players: { ana: { chips: 1000 }, beto: { chips: 5 } },
    })
    const placed = act(game, "ana", { type: "bet", amount: 300 })
    const expired = expireBlackjack(placed, random)
    expect(expired.phase).not.toBe("betting")
    expect(getSeat(expired, "beto").hands[0]?.bet).toBe(5)
    expect(getSeat(expired, "ana").hands[0]?.bet).toBe(300)
  })

  it("na jogada, o jogador para", () => {
    const game = buildBlackjack({
      players: { ana: { hands: [hand(["10S", "2H"])] }, beto: { hands: [hand(["9S", "8H"])] } },
    })
    const expired = expireBlackjack(game, random)
    expect(getSeat(expired, "ana").hands[0]).toMatchObject({ done: true, cards: ["10S", "2H"] })
    expect(expired.turn.playerId).toBe("beto")
  })
})

describe("BJ-RN-19 baralho acabando", () => {
  it("embaralha um novo sem as cartas da mesa", () => {
    const game = buildBlackjack({
      deck: [],
      players: { ana: { hands: [hand(["2S", "3H"])] } },
      dealer: { cards: ["4D", "5C"] },
    })
    const hit = act(game, "ana", { type: "hit" })
    const table = cardsInPlay(hit)
    expect(table).toHaveLength(52)
    expect(new Set(table).size).toBe(52)
    expect(hit.events).toContainEqual({ type: "restocked" })
  })
})

describe("BJ-RN-20 saída", () => {
  it("quem sai perde a aposta e sai do placar; a vez passa", () => {
    const game = buildBlackjack({
      players: { ana: { hands: [hand(["10S", "2H"])] }, beto: { hands: [hand(["9S", "8H"])] } },
    })
    const left = removeBlackjackPlayer(game, "ana", random)
    expect(left.players.map((seat) => seat.id)).toEqual(["beto"])
    expect(left.turn.playerId).toBe("beto")
    expect(left.events.at(-1)).toEqual({ type: "playerLeft", playerId: "ana", bet: 100 })
  })

  it("na aposta, a saída de quem faltava libera a distribuição", () => {
    const game = act(
      buildBlackjack({
        phase: "betting",
        players: { ana: { chips: 1000 }, beto: { chips: 1000 } },
      }),
      "ana",
      { type: "bet", amount: 10 }
    )
    expect(removeBlackjackPlayer(game, "beto", random).phase).not.toBe("betting")
  })

  it("sem ninguém, a partida termina", () => {
    const game = buildBlackjack({ players: { ana: { hands: [hand(["10S", "2H"])] } } })
    expect(removeBlackjackPlayer(game, "ana", random)).toMatchObject({
      endReason: "abandoned",
      winnerIds: [],
    })
  })
})

describe("ritmo da mesa", () => {
  it("distribui uma carta por passo na ordem da sala, com a banca depois de cada volta", () => {
    let game = buildBlackjack({
      phase: "betting",
      players: { ana: { chips: 1000 }, beto: { chips: 1000 } },
    })
    game = act(act(game, "ana", { type: "bet", amount: 10 }), "beto", { type: "bet", amount: 20 })
    expect(game.phase).toBe("dealing")
    expect(blackjackRules.turnOf(game).automatic).toBe(true)
    expect(refusal(game, "ana", { type: "hit" })).toBe("TABLE_DEALING")
    const counts: string[] = []
    while (game.phase === "dealing") {
      game = expireBlackjack(game, random)
      const seats = game.players.map((seat) => seat.hands[0]?.cards.length ?? 0)
      counts.push([...seats, game.dealer.cards.length].join(""))
    }
    expect(counts).toEqual(["100", "110", "111", "211", "221", "222"])
    expect(toBlackjackView(game, "beto").dealer.hidden).toBe(1)
  })

  it("quem sai no meio da distribuição não desalinha a ordem", () => {
    let game = buildBlackjack({
      phase: "betting",
      players: { ana: { chips: 1000 }, beto: { chips: 1000 }, caio: { chips: 1000 } },
    })
    for (const id of ["ana", "beto", "caio"]) game = act(game, id, { type: "bet", amount: 10 })
    game = expireBlackjack(expireBlackjack(game, random), random)
    game = dealOut(removeBlackjackPlayer(game, "beto", random))
    expect(game.players.map((seat) => seat.hands[0]?.cards.length)).toEqual([2, 2])
    expect(game.dealer.cards).toHaveLength(2)
  })

  it("pausa em cada carta, ao fechar mão, na banca, no pagamento e mais no fim", () => {
    const betting = buildBlackjack({ phase: "betting", players: { ana: { chips: 1000 } } })
    const dealing = { ...betting, phase: "dealing" as const }
    const playing = buildBlackjack({ players: { ana: { hands: [hand(["10S", "2H"])] } } })
    const natural = buildBlackjack({
      players: {
        ana: { hands: [hand(["AS", "KH"], 10, { done: true })] },
        beto: { hands: [hand(["2S", "3H"])] },
      },
    })
    const closed = buildBlackjack({
      players: { ana: { hands: [hand(["10S", "2H"], 100, { done: true })] } },
    })
    const dealer = { ...playing, phase: "dealer" as const }
    const settled = { ...playing, phase: "settled" as const }
    expect(blackjackPauseAfter(betting, dealing)).toBe(DEAL_STEP_MS)
    expect(blackjackPauseAfter(dealing, playing)).toBe(DEAL_DONE_MS)
    expect(blackjackPauseAfter(dealing, natural)).toBe(NATURAL_PAUSE_MS)
    expect(blackjackPauseAfter(playing, closed)).toBe(HAND_CLOSE_MS)
    expect(blackjackPauseAfter(playing, dealer)).toBe(DEALER_STEP_MS)
    expect(blackjackPauseAfter(dealer, settled)).toBe(SETTLE_PAUSE_MS)
    expect(blackjackPauseAfter(dealer, { ...settled, endReason: "rounds" })).toBe(FINAL_PAUSE_MS)
    expect(blackjackPauseAfter(playing, playing)).toBe(0)
  })

  it("a distribuição, a banca e a passagem de rodada são passos automáticos", () => {
    const playing = buildBlackjack({ players: { ana: { hands: [hand(["10S", "2H"])] } } })
    expect(blackjackRules.turnOf(playing)).toMatchObject({ playerId: "ana", automatic: false })
    expect(blackjackRules.turnOf({ ...playing, phase: "dealer" }).automatic).toBe(true)
    expect(blackjackRules.turnOf({ ...playing, phase: "settled" }).automatic).toBe(true)
    const betting = buildBlackjack({ phase: "betting", players: { ana: { bet: 10 }, beto: {} } })
    expect(blackjackRules.turnOf(betting)).toMatchObject({ playerId: "beto", automatic: false })
  })
})
