import { describe, expect, it } from "vitest"

import { buildRoom } from "@/lib/game/domain/test-fixtures"
import { keepLocalClock, withLocalDeadline } from "@/lib/game/domain/turn-clock"

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

  it("leva a pausa da mesa para o relógio do aparelho", () => {
    const room = {
      ...buildRoom(),
      serverNow: 1_000_000,
      pausedUntil: 1_002_500,
    }
    expect(withLocalDeadline(room, 7_000).pausedUntil).toBe(9_500)
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

describe("relógio estável entre atualizações", () => {
  it("mantém o prazo local quando o servidor manda o mesmo prazo", () => {
    const first = { ...buildRoom(), serverNow: 1_000, turnDeadlineAt: 31_000 }
    const firstLocal = withLocalDeadline(first, 5_000)
    const second = { ...first, version: 2, serverNow: 1_400 }
    const secondLocal = withLocalDeadline(second, 5_100)
    const kept = keepLocalClock(first, firstLocal, second, secondLocal)
    expect(secondLocal.turnDeadlineAt).toBe(34_700)
    expect(kept.turnDeadlineAt).toBe(firstLocal.turnDeadlineAt)
    expect(kept.version).toBe(2)
  })

  it("usa o prazo novo quando o turno muda", () => {
    const first = { ...buildRoom(), serverNow: 1_000, turnDeadlineAt: 31_000 }
    const second = { ...first, serverNow: 2_000, turnDeadlineAt: 32_000 }
    const kept = keepLocalClock(
      first,
      withLocalDeadline(first, 5_000),
      second,
      withLocalDeadline(second, 6_000)
    )
    expect(kept.turnDeadlineAt).toBe(36_000)
  })
})
