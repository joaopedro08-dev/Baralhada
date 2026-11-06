import { describe, expect, it } from "vitest"

import {
  callLabel,
  clampAmount,
  pressAction,
  pressLabel,
  pressOf,
  quickBets,
  sliderStep,
} from "@/lib/game/domain/poker/betting"
import {
  describeBlinds,
  describeHandResult,
  describeNextStep,
  describeResult,
  describeTurn,
  explainEnd,
  formatChips,
  positionsOf,
  standingsOf,
  statusLabel,
} from "@/lib/game/domain/poker/guide"
import { pokerNotice } from "@/lib/game/domain/poker/notice"
import { seatOrderFrom, seatSpots } from "@/lib/game/domain/poker/seating"
import { chipBreakdown } from "@/lib/game/domain/poker/chips"
import { buildPoker } from "@/lib/game/domain/poker/test-fixtures"
import type { HandSummary } from "@/lib/game/domain/poker/types"

const SHOWDOWN: HandSummary = {
  number: 1,
  board: ["2C", "7D", "9S", "JH", "3C"],
  showdown: true,
  shown: [
    {
      playerId: "eu",
      hole: ["AH", "AD"],
      category: "pair",
      cards: ["AH", "AD", "JH", "9S", "7D"],
    },
    {
      playerId: "beto",
      hole: ["KH", "KD"],
      category: "pair",
      cards: ["KH", "KD", "JH", "9S", "7D"],
    },
  ],
  pots: [
    {
      amount: 360,
      eligibleIds: ["eu", "beto"],
      winnerIds: ["eu"],
      category: "pair",
    },
    {
      amount: 400,
      eligibleIds: ["beto"],
      winnerIds: ["beto"],
      category: "pair",
    },
  ],
  winnings: { eu: 360, beto: 400 },
  eliminatedIds: ["caio"],
}

describe("PK-RF-08 e PK-RF-10 placar, blinds e posições", () => {
  it("diz de quem é a vez", () => {
    expect(describeTurn(buildPoker(), "eu")).toBe("Sua vez")
    expect(describeTurn(buildPoker({ currentPlayerId: "beto" }), "eu")).toBe(
      "Vez de Beto"
    )
  })

  it("mostra as blinds e quantas mãos faltam para dobrar", () => {
    expect(describeBlinds(buildPoker())).toBe("Blinds 10/20 · dobram em 5 mãos")
    expect(describeBlinds(buildPoker({ handsUntilBlindsRise: 1 }))).toBe(
      "Blinds 10/20 · dobram na próxima mão"
    )
    expect(formatChips(12500)).toBe("12.500")
  })

  it("marca botão, small blind e big blind de cada jogador", () => {
    const game = buildPoker()
    expect(positionsOf(game, "caio")).toEqual(["D"])
    expect(positionsOf(game, "eu")).toEqual(["SB"])
    expect(positionsOf(game, "beto")).toEqual(["BB"])
    expect(positionsOf({ ...game, buttonId: "eu" }, "eu")).toEqual(["D", "SB"])
  })

  it("rotula quem desistiu, está all-in ou fora", () => {
    expect(statusLabel("folded")).toBe("Desistiu")
    expect(statusLabel("allIn")).toBe("All-in")
    expect(statusLabel("out")).toBe("Fora")
    expect(statusLabel("active")).toBeNull()
  })
})

describe("PK-RF-03 próximo passo", () => {
  it("explica o que fazer em cada situação", () => {
    expect(describeNextStep(buildPoker(), "eu")).toBe(
      "Pague 10, aumente ou desista."
    )
    const open = {
      fold: false,
      check: true,
      call: null,
      bet: { min: 20, max: 990 },
      raise: null,
    }
    expect(describeNextStep(buildPoker({ moves: open }), "eu")).toBe(
      "Passe ou aposte."
    )
    expect(
      describeNextStep(buildPoker({ currentPlayerId: "beto" }), "eu")
    ).toBe("Aguarde Beto.")
    const folded = buildPoker().players.map((player) =>
      player.id === "eu" ? { ...player, status: "folded" as const } : player
    )
    expect(describeNextStep(buildPoker({ players: folded }), "eu")).toBe(
      "Você desistiu desta mão."
    )
    const out = folded.map((player) => ({ ...player, status: "out" as const }))
    expect(describeNextStep(buildPoker({ players: out }), "eu")).toBe(
      "Você foi eliminado e está assistindo."
    )
    const allIn = folded.map((player) => ({
      ...player,
      status: "allIn" as const,
    }))
    expect(describeNextStep(buildPoker({ players: allIn }), "eu")).toBe(
      "Você está all-in. Torça pela mesa!"
    )
    expect(describeNextStep(buildPoker({ endReason: "chips" }), "eu")).toBe(
      "A partida terminou."
    )
  })
})

describe("PK-RF-04 valor da aposta", () => {
  it("oferece mínimo, meio pote, pote e all-in dentro do permitido", () => {
    expect(quickBets(buildPoker(), "eu")).toEqual([
      { label: "Mín.", amount: 40 },
      { label: "Pote", amount: 60 },
      { label: "All-in", amount: 1000 },
    ])
    const flop = buildPoker({
      currentBet: 0,
      potTotal: 120,
      moves: {
        fold: false,
        check: true,
        call: null,
        bet: { min: 20, max: 990 },
        raise: null,
      },
    })
    expect(quickBets(flop, "eu").map((option) => option.amount)).toEqual([
      20, 60, 120, 990,
    ])
    expect(
      quickBets(buildPoker({ moves: { ...flop.moves, bet: null } }), "eu")
    ).toEqual([])
  })

  it("mantém o valor entre o mínimo e o all-in", () => {
    const press = pressOf(buildPoker())
    expect(press).toEqual({ kind: "raise", range: { min: 40, max: 1000 } })
    if (!press) return
    expect(clampAmount(5, press.range)).toBe(40)
    expect(clampAmount(5000, press.range)).toBe(1000)
    expect(pressAction(press, 77.4)).toEqual({ type: "raise", amount: 77 })
    expect(pressAction({ kind: "bet", range: press.range }, 50)).toEqual({
      type: "bet",
      amount: 50,
    })
    expect(pressLabel(press, 80)).toBe("Aumentar para 80")
    expect(pressLabel({ kind: "bet", range: press.range }, 80)).toBe(
      "Apostar 80"
    )
    expect(pressLabel(press, 1000)).toBe("All-in 1.000")
    expect(sliderStep(press.range, 20)).toBe(10)
    expect(sliderStep({ min: 40, max: 50 }, 20)).toBe(1)
  })

  it("avisa quando pagar leva todas as fichas", () => {
    expect(callLabel(buildPoker(), "eu")).toBe("Pagar 10")
    const short = buildPoker().players.map((player) =>
      player.id === "eu" ? { ...player, chips: 10 } : player
    )
    expect(callLabel(buildPoker({ players: short }), "eu")).toBe(
      "Pagar 10 (all-in)"
    )
  })
})

describe("PK-RF-07 resultado da mão", () => {
  it("diz quem ganhou e com qual jogo", () => {
    const game = buildPoker()
    expect(describeHandResult(game, SHOWDOWN, "beto")).toBe(
      "Ana ganhou com par"
    )
    expect(describeHandResult(game, SHOWDOWN, "eu")).toBe("Você ganhou com par")
    const split = {
      ...SHOWDOWN,
      pots: [{ ...SHOWDOWN.pots[0]!, winnerIds: ["eu", "beto"] }],
    }
    expect(describeHandResult(game, split, "caio")).toBe(
      "Ana e Beto dividiram o pote com par"
    )
    const folded = { ...SHOWDOWN, showdown: false, shown: [] }
    expect(describeHandResult(game, folded, "caio")).toBe("Ana levou o pote")
  })

  it("anuncia a mão nova com as fichas ganhas e as 5 cartas usadas", () => {
    const before = buildPoker()
    const after = buildPoker({ lastHand: SHOWDOWN })
    const notice = pokerNotice(before, after, "eu")
    expect(notice).toMatchObject({
      key: "mao-1",
      tone: "good",
      title: "Você ganhou com par",
      detail: "760 fichas em 2 potes. Caio foi eliminado.",
      cards: ["AH", "AD", "JH", "9S", "7D"],
    })
    expect(notice?.lines.map((line) => [line.label, line.value])).toEqual([
      ["Beto", 400],
      ["Você", 360],
    ])
    expect(pokerNotice(after, after, "eu")).toBeNull()
    expect(pokerNotice(before, after, "caio")?.tone).toBe("bad")
  })
})

describe("PK-RF-09 fim da partida", () => {
  it("ordena o vencedor e depois a ordem inversa de eliminação", () => {
    const game = buildPoker({
      eliminatedIds: ["caio", "beto"],
      winnerId: "eu",
      endReason: "chips",
    })
    expect(
      standingsOf(game).map(({ player, place }) => [player.nickname, place])
    ).toEqual([
      ["Ana", 1],
      ["Beto", 2],
      ["Caio", 3],
    ])
    expect(describeResult(game, "eu")).toBe("Você venceu!")
    expect(describeResult(game, "beto")).toBe("Ana venceu")
    expect(describeResult({ ...game, winnerId: null }, "eu")).toBe(
      "Partida encerrada"
    )
    expect(explainEnd(game)).toBe("Ficou com todas as 3.000 fichas.")
    expect(explainEnd({ ...game, endReason: "abandoned" })).toBe(
      "Os outros jogadores saíram, e a partida terminou."
    )
  })
})

describe("lugares na mesa", () => {
  it("põe você embaixo e os outros no sentido do jogo", () => {
    expect(seatOrderFrom(["a", "eu", "b"], "eu")).toEqual(["eu", "b", "a"])
    const spots = seatSpots(["a", "eu", "b"], "eu")
    expect(spots[0]).toMatchObject({ playerId: "eu", seat: { x: 50, y: 91 } })
    expect(spots[1]?.seat.x).toBeLessThan(50)
    expect(spots[2]?.seat.x).toBeGreaterThan(50)
    expect(seatSpots(["a", "b"], "eu").map((spot) => spot.playerId)).toEqual([
      "a",
      "b",
    ])
  })
})

describe("fichas na mesa", () => {
  it("quebra o valor nas fichas maiores, até o limite da pilha", () => {
    expect(chipBreakdown(1630, 10)).toEqual([5, 25, 100, 500, 1000])
    expect(chipBreakdown(20, 3)).toEqual([5, 5, 5])
    expect(chipBreakdown(0, 6)).toEqual([])
  })
})
