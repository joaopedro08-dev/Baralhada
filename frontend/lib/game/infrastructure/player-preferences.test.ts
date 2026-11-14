import { beforeEach, describe, expect, it } from "vitest"
import {
  hasSeenTutorial,
  loadPlayerPreferences,
  markAllTutorialsSeen,
  markTutorialSeen,
  savePlayerPreferences,
  updatePlayerPreferences,
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
      dispatchEvent: () => true,
    },
  })
})

describe("preferências do jogador", () => {
  it("persiste e restaura o apelido", () => {
    savePlayerPreferences({ nickname: "Ana" })
    expect(loadPlayerPreferences()).toEqual({
      nickname: "Ana",
      tutorialsSeen: {},
      tutorialAutoOpen: true,
      showRoomCodeByDefault: false,
      soundsEnabled: false,
      reducedMotion: false,
      cardSize: "normal",
    })
  })

  it("ignora dados inválidos", () => {
    storage.set("naipe-real:preferencias", JSON.stringify({ nickname: 42 }))
    expect(loadPlayerPreferences()).toEqual({
      nickname: "",
      tutorialsSeen: {},
      tutorialAutoOpen: true,
      showRoomCodeByDefault: false,
      soundsEnabled: false,
      reducedMotion: false,
      cardSize: "normal",
    })
  })

  it("persists tutorials independently by game", () => {
    markTutorialSeen("cacheta")

    expect(hasSeenTutorial("cacheta")).toBe(true)
    expect(hasSeenTutorial("blackjack")).toBe(false)
  })

  it("desliga a abertura automática e marca todos os tutoriais", () => {
    updatePlayerPreferences({ tutorialAutoOpen: false })
    expect(loadPlayerPreferences().tutorialAutoOpen).toBe(false)

    markAllTutorialsSeen()
    expect(hasSeenTutorial("rouba-monte")).toBe(true)
    expect(hasSeenTutorial("blackjack")).toBe(true)
  })

  it("persiste a preferência de mostrar o código", () => {
    updatePlayerPreferences({ showRoomCodeByDefault: true })
    expect(loadPlayerPreferences().showRoomCodeByDefault).toBe(true)
  })
})
