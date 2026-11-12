import { describe, expect, it } from "vitest"
import { connectionMessage } from "./connection-banner"

describe("indicador de conexão", () => {
  it.each([
    ["replaced", false, "outra aba"],
    ["offline", true, "Reconectando"],
    ["offline", false, "Sem conexão"],
  ] as const)("descreve %s", (connection, restoring, expected) => {
    expect(connectionMessage(connection, restoring)).toContain(expected)
  })
})
