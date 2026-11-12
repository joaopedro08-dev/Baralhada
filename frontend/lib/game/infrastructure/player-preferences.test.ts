import { beforeEach, describe, expect, it } from "vitest"
import {
  loadPlayerPreferences,
  savePlayerPreferences,
} from "./player-preferences"

const storage = new Map<string, string>()

beforeEach(() => {
  storage.clear()
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  })
})

describe("preferências do jogador", () => {
  it("persiste e restaura o apelido", () => {
    savePlayerPreferences({ nickname: "Ana" })
    expect(loadPlayerPreferences()).toEqual({ nickname: "Ana" })
  })

  it("ignora dados inválidos", () => {
    storage.set("naipe-real:preferencias", JSON.stringify({ nickname: 42 }))
    expect(loadPlayerPreferences()).toEqual({ nickname: "" })
  })
})
