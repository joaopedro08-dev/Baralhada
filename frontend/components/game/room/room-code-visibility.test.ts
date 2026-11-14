import { describe, expect, it } from "vitest"
import {
  HIDDEN_ROOM_CODE,
  HIDDEN_ROOM_LINK,
  roomCodeAccessibleLabel,
} from "./room-code-visibility"

describe("código da sala", () => {
  it("não expõe o código quando oculto", () => {
    expect(HIDDEN_ROOM_CODE).toBe("••••••")
    expect(HIDDEN_ROOM_LINK).toBe("••••••••••••••••")
    expect(roomCodeAccessibleLabel("ABC234", false)).toBe(
      "Código da sala oculto"
    )
  })

  it("expõe o código somente quando visível", () => {
    expect(roomCodeAccessibleLabel("ABC234", true)).toBe(
      "Código da sala ABC234"
    )
  })
})
