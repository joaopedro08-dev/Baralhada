import { describe, expect, it } from "vitest"

import { stealNotice, trucoNotice } from "@/lib/game/domain/score-notice"
import { buildGame, buildPlayer } from "@/lib/game/domain/test-fixtures"
import { buildTruco } from "@/lib/game/domain/truco/test-fixtures"
import type { HandSummary } from "@/lib/game/domain/truco/types"

const summary = (changes: Partial<HandSummary> = {}): HandSummary => ({
  number: 1,
  winnerTeam: 0,
  points: 3,
  ending: "rounds",
  table: [],
  rounds: [0, 0],
  runner: null,
  ...changes,
})

describe("mini placar do truco", () => {
  it("mostra quem marcou na mão e o placar antes e depois", () => {
    const before = buildTruco({ scores: [2, 4] })
    const after = buildTruco({ scores: [5, 4], lastHand: summary() })
    expect(trucoNotice(before, after)).toMatchObject({
      key: "mao-1",
      tone: "good",
      title: "Nós +3",
      detail: "Nós marcamos 3 pontos.",
      lines: [
        { label: "Nós", before: 2, value: 5, lead: true, mine: true },
        { label: "Eles", before: 4, value: 4, lead: false, mine: false },
      ],
    })
  })

  it("fica neutro na mão empatada e vermelho quando o outro time marca", () => {
    const before = buildTruco()
    const tied = buildTruco({
      lastHand: summary({ winnerTeam: null, points: 0, ending: "tied" }),
    })
    expect(trucoNotice(before, tied)).toMatchObject({
      tone: "neutral",
      title: "Mão empatada",
    })
    const lost = buildTruco({
      scores: [0, 1],
      lastHand: summary({ winnerTeam: 1, points: 1, ending: "ran" }),
    })
    expect(trucoNotice(before, lost)).toMatchObject({
      tone: "bad",
      title: "Eles +1",
    })
  })

  it("avisa quando quem correu mostra as cartas", () => {
    const ran = summary({
      winnerTeam: 0,
      points: 1,
      ending: "ran",
      runner: { playerId: "beto", cards: null, shown: false },
    })
    const before = buildTruco({ lastHand: ran })
    const after = buildTruco({
      lastHand: {
        ...ran,
        runner: { playerId: "beto", cards: ["3H", "2C"], shown: true },
      },
    })
    expect(trucoNotice(before, after)).toMatchObject({
      title: "Beto mostrou as cartas",
      cards: ["3H", "2C"],
    })
    expect(trucoNotice(after, after)).toBeNull()
  })

  it("confirma para quem correu que as cartas foram mostradas", () => {
    const ran = summary({
      winnerTeam: 1,
      points: 1,
      ending: "ran",
      runner: { playerId: "eu", cards: ["4D"], shown: false },
    })
    const before = buildTruco({ lastHand: ran, canShowHand: true })
    const after = buildTruco({
      lastHand: {
        ...ran,
        runner: { playerId: "eu", cards: ["4D"], shown: true },
      },
      canShowHand: false,
    })
    expect(trucoNotice(before, after)).toMatchObject({
      title: "Você mostrou as cartas",
      cards: ["4D"],
    })
  })

  it("não avisa que mostrou quando quem correu deixa a chance passar", () => {
    const ran = summary({
      winnerTeam: 1,
      points: 1,
      ending: "ran",
      runner: { playerId: "eu", cards: ["4D", "7C"], shown: false },
    })
    const offered = buildTruco({ lastHand: ran, canShowHand: true })
    const missed = buildTruco({
      lastHand: ran,
      canShowHand: false,
      turnNumber: 9,
    })
    expect(trucoNotice(offered, missed)).toBeNull()
  })

  it("não avisa nada sem mão encerrada", () => {
    expect(trucoNotice(buildTruco(), buildTruco({ turnNumber: 2 }))).toBeNull()
  })
})

describe("mini placar do rouba monte", () => {
  const before = buildGame({
    players: [
      { ...buildPlayer("eu"), pileSize: 4 },
      { ...buildPlayer("ana"), pileSize: 9 },
    ],
    turnNumber: 6,
  })
  const after = buildGame({
    players: [
      { ...buildPlayer("eu"), pileSize: 14 },
      { ...buildPlayer("ana"), pileSize: 0 },
    ],
    turnNumber: 7,
  })
  const steal = { thiefId: "eu", victimId: "ana", count: 10 }

  it("comemora o roubo de quem roubou, com os montes antes e depois", () => {
    expect(stealNotice(before, after, steal, "eu")).toMatchObject({
      tone: "good",
      title: "Você roubou o monte!",
      lines: [
        { label: "Você", before: 4, value: 14, lead: true, mine: true },
        { before: 9, value: 0, lead: false, mine: false },
      ],
    })
  })

  it("alerta a vítima e informa quem só assiste", () => {
    expect(stealNotice(before, after, steal, "ana")).toMatchObject({
      tone: "bad",
      title: "Roubaram seu monte!",
    })
    expect(stealNotice(before, after, steal, "visitante").tone).toBe("neutral")
  })
})
