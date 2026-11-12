import { describe, expect, it } from "vitest"
import { describeConnection, shouldShowWakeNotice } from "./entry-panel"

describe("aviso de servidor acordando", () => {
  it("aparece após oito segundos sem conexão", () => {
    expect(shouldShowWakeNotice("connecting", 7999)).toBe(false)
    expect(shouldShowWakeNotice("connecting", 8000)).toBe(true)
    expect(describeConnection("connecting", true)).toContain("Servidor acordando")
  })
})
