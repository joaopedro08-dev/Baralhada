import { describe, expect, it } from "vitest"

import { sortByStrength, trucoStrength } from "@/lib/game/domain/truco/cards"
import {
  describeHandSummary,
  describeNextStep,
  describeTrucoResult,
  describeTurn,
  explainTrucoEnd,
  modeLabel,
  raiseLabel,
  roundMarks,
} from "@/lib/game/domain/truco/guide"
import {
  seatsFromViewer,
  sideLabel,
  teamLabel,
  teamNames,
} from "@/lib/game/domain/truco/teams"
import { buildTruco, NO_MOVES } from "@/lib/game/domain/truco/test-fixtures"

describe("cartas do truco", () => {
  it("ordena pela força com a manilha no topo", () => {
    expect(sortByStrength(["5C", "3H", "4D", "5D"], "5")).toEqual([
      "4D",
      "3H",
      "5D",
      "5C",
    ])
    expect(trucoStrength("5C", "5")).toBeGreaterThan(trucoStrength("5H", "5"))
  })
})

describe("times", () => {
  it("nomeia os times do ponto de vista de quem joga", () => {
    const game = buildTruco()
    expect(sideLabel(game, 0)).toBe("Nós")
    expect(sideLabel(game, 1)).toBe("Eles")
    expect(teamNames(game, 1)).toBe("Beto e Duda")
    expect(teamLabel(1)).toBe("Time B")
    expect(seatsFromViewer(game, "caio").map((player) => player.id)).toEqual([
      "caio",
      "duda",
      "eu",
      "beto",
    ])
  })

  it("com 2 jogadores usa você e o nome do adversário", () => {
    const duel = buildTruco({ players: buildTruco().players.slice(0, 2) })
    expect(sideLabel(duel, 0)).toBe("Você")
    expect(sideLabel(duel, 1)).toBe("Beto")
  })
})

describe("orientação da vez", () => {
  it("convida a jogar ou pedir truco", () => {
    const game = buildTruco()
    expect(describeTurn(game, "eu")).toBe("Sua vez")
    expect(describeNextStep(game)).toBe(
      "Sua vez: jogue uma carta ou peça truco."
    )
    expect(raiseLabel(6)).toBe("Pedir seis")
  })

  it("explica o pedido pendente para quem responde e para quem espera", () => {
    const request = {
      requesterId: "beto",
      responderId: "eu",
      stake: 3 as const,
    }
    const answering = buildTruco({
      request,
      actorId: "eu",
      moves: { ...NO_MOVES, answer: true, raiseTo: 6 },
    })
    expect(describeTurn(answering, "eu")).toBe("Responda ao truco")
    expect(describeNextStep(answering)).toBe(
      "Beto pediu truco. Aceite, corra ou peça seis."
    )
    const waiting = buildTruco({ request, actorId: "caio", moves: NO_MOVES })
    expect(describeTurn(waiting, "eu")).toBe("Caio responde ao truco")
    expect(describeNextStep(waiting)).toBe(
      "Aguardando Caio responder ao truco."
    )
  })

  it("orienta a mão de onze e a mão de ferro", () => {
    const eleven = buildTruco({
      mode: "eleven",
      elevenDeciderId: "eu",
      partnerHands: [{ playerId: "caio", cards: ["2C", "3C", "AC"] }],
      moves: { ...NO_MOVES, decideEleven: true },
    })
    expect(describeTurn(eleven, "eu")).toBe("Decida a mão de onze")
    expect(describeNextStep(eleven)).toMatch(/Veja as cartas do parceiro/)
    expect(modeLabel(eleven)).toBe("Mão de onze")

    const iron = buildTruco({
      mode: "iron",
      blind: true,
      hand: [],
      moves: { ...NO_MOVES, play: true },
    })
    expect(describeNextStep(iron)).toMatch(/ninguém vê as cartas/)
    expect(modeLabel(iron)).toBe("Mão de ferro")
    expect(modeLabel(buildTruco())).toBeNull()
  })

  it("aguarda o jogador da vez", () => {
    const game = buildTruco({ actorId: "beto", moves: NO_MOVES })
    expect(describeTurn(game, "eu")).toBe("Vez de Beto")
    expect(describeNextStep(game)).toBe("Aguardando Beto jogar.")
  })
})

describe("placar e fim", () => {
  it("marca as rodadas como ganhas, perdidas, empatadas ou por jogar", () => {
    expect(roundMarks(buildTruco({ rounds: [0, "tie"] }))).toEqual([
      "won",
      "tie",
      "pending",
    ])
    expect(roundMarks(buildTruco({ rounds: [1], viewerTeam: 1 }))).toEqual([
      "won",
      "pending",
      "pending",
    ])
  })

  it("resume a mão que acabou", () => {
    const game = buildTruco()
    const summary = { number: 1, table: [], rounds: [], runner: null }
    expect(
      describeHandSummary(game, {
        ...summary,
        winnerTeam: 0,
        points: 3,
        ending: "rounds",
      })
    ).toBe("Nós marcamos 3 pontos.")
    expect(
      describeHandSummary(game, {
        ...summary,
        winnerTeam: 1,
        points: 1,
        ending: "ran",
      })
    ).toBe("Eles marcaram 1 ponto (o outro time correu).")
    expect(
      describeHandSummary(game, {
        ...summary,
        winnerTeam: null,
        points: 0,
        ending: "tied",
      })
    ).toBe("Mão empatada: ninguém marcou ponto.")
  })

  it("anuncia o vencedor e o motivo do fim", () => {
    const won = buildTruco({
      winnerTeam: 0,
      endReason: "score",
      scores: [12, 7],
    })
    expect(describeTrucoResult(won)).toBe("Seu time venceu!")
    expect(explainTrucoEnd(won)).toBe("Chegou a 12 pontos primeiro.")
    const lost = buildTruco({ winnerTeam: 1, endReason: "abandoned" })
    expect(describeTrucoResult(lost)).toBe("Beto e Duda venceram")
    expect(explainTrucoEnd(lost)).toMatch(/um jogador saiu/)
    expect(describeTurn(lost, "eu")).toBe("Partida encerrada")
  })
})
