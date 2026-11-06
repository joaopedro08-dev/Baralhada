import { describe, expect, it } from "vitest"

import { detectCall } from "@/lib/game/domain/truco/calls"
import { buildTruco, NO_MOVES } from "@/lib/game/domain/truco/test-fixtures"
import type { HandSummary, RaiseRequest } from "@/lib/game/domain/truco/types"

const request = (changes: Partial<RaiseRequest> = {}): RaiseRequest => ({
  requesterId: "beto",
  responderId: "eu",
  stake: 3,
  ...changes,
})

const summary = (changes: Partial<HandSummary> = {}): HandSummary => ({
  number: 1,
  winnerTeam: 1,
  points: 1,
  ending: "ran",
  table: [],
  rounds: [],
  runner: null,
  ...changes,
})

describe("gritos do truco na mesa", () => {
  it("grita o pedido quando ele aparece", () => {
    const before = buildTruco()
    const after = buildTruco({
      request: request(),
      turnNumber: 2,
      moves: NO_MOVES,
    })
    expect(detectCall(before, after)).toMatchObject({
      shout: "TRUCO!",
      caption: "Beto pediu truco",
      tone: "raise",
    })
  })

  it("grita o aumento do pedido, com o novo valor", () => {
    const before = buildTruco({ request: request() })
    const after = buildTruco({
      request: request({ requesterId: "eu", responderId: "beto", stake: 6 }),
      turnNumber: 3,
    })
    expect(detectCall(before, after)).toMatchObject({
      shout: "SEIS!",
      caption: "Ana pediu seis",
    })
  })

  it("não repete o grito enquanto o mesmo pedido continua", () => {
    const pending = buildTruco({ request: request() })
    expect(detectCall(pending, buildTruco({ request: request() }))).toBeNull()
  })

  it("anuncia quando o pedido é aceito na mesma mão", () => {
    const before = buildTruco({ request: request() })
    const after = buildTruco({ stake: 3, turnNumber: 3 })
    expect(detectCall(before, after)).toMatchObject({
      shout: "ACEITO!",
      caption: "Ana aceitou o truco",
      tone: "accept",
    })
  })

  it("anuncia a corrida quando a mão acaba por recusa", () => {
    const before = buildTruco({ request: request() })
    const after = buildTruco({
      handNumber: 2,
      lastHand: summary({
        runner: { playerId: "eu", cards: null, shown: false },
      }),
      turnNumber: 4,
    })
    expect(detectCall(before, after)).toMatchObject({
      shout: "CORREU!",
      caption: "Ana correu do truco",
      tone: "run",
    })
  })

  it("anuncia quem correu da mão sem pedido", () => {
    const after = buildTruco({
      handNumber: 2,
      lastHand: summary({
        runner: { playerId: "beto", cards: null, shown: false },
      }),
    })
    expect(detectCall(buildTruco(), after)?.caption).toBe("Beto correu da mão")
  })

  it("anuncia a corrida da mão de onze", () => {
    const before = buildTruco({ mode: "eleven" })
    const after = buildTruco({
      handNumber: 2,
      lastHand: summary({ ending: "elevenRan" }),
    })
    expect(detectCall(before, after)?.caption).toBe(
      "O time correu da mão de onze"
    )
  })

  it("anuncia a mão de onze e a mão de ferro ao distribuir", () => {
    const before = buildTruco()
    const eleven = buildTruco({
      handNumber: 2,
      mode: "eleven",
      lastHand: summary({ ending: "rounds" }),
    })
    const iron = buildTruco({
      handNumber: 2,
      mode: "iron",
      lastHand: summary({ ending: "rounds" }),
    })
    expect(detectCall(before, eleven)?.shout).toBe("MÃO DE ONZE!")
    expect(detectCall(before, iron)?.shout).toBe("MÃO DE FERRO!")
  })

  it("fica em silêncio numa jogada comum", () => {
    expect(detectCall(buildTruco(), buildTruco({ turnNumber: 2 }))).toBeNull()
  })
})
