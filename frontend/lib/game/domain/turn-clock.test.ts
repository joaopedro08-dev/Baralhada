import { describe, expect, it } from "vitest"

import { buildRoom } from "@/lib/game/domain/test-fixtures"
import { withLocalDeadline } from "@/lib/game/domain/turn-clock"

describe("prazo do turno no relógio do aparelho", () => {
  it("mantém o tempo restante com o relógio do aparelho adiantado", () => {
    const room = {
      ...buildRoom(),
      serverNow: 1_000_000,
      turnDeadlineAt: 1_060_000,
    }
    const fiveMinutesAhead = 1_300_000
    const local = withLocalDeadline(room, fiveMinutesAhead)
    expect(local.turnDeadlineAt).toBe(fiveMinutesAhead + 60_000)
  })

  it("mantém o tempo restante com o relógio do aparelho atrasado", () => {
    const room = {
      ...buildRoom(),
      serverNow: 1_000_000,
      turnDeadlineAt: 1_045_000,
    }
    const local = withLocalDeadline(room, 400_000)
    expect(local.turnDeadlineAt).toBe(445_000)
  })

  it("não inventa prazo quando não há turno correndo", () => {
    const room = { ...buildRoom(), turnDeadlineAt: null, matchStartsAt: null }
    const local = withLocalDeadline(room, 500)
    expect(local.turnDeadlineAt).toBeNull()
    expect(local.matchStartsAt).toBeNull()
  })

  it("leva a contagem regressiva para o relógio do aparelho", () => {
    const room = {
      ...buildRoom(),
      serverNow: 1_000_000,
      matchStartsAt: 1_003_000,
    }
    expect(withLocalDeadline(room, 7_000).matchStartsAt).toBe(10_000)
  })
})
