import { beforeEach, describe, expect, it, vi } from "vitest"
import { playGameSound } from "./game-sounds"
import { savePlayerPreferences } from "./player-preferences"

const storage = new Map<string, string>()

beforeEach(() => {
  storage.clear()
  const start = vi.fn()
  const stop = vi.fn()
  const oscillator = { frequency: { value: 0 }, connect: vi.fn(), start, stop }
  const gain = {
    gain: { setValueAtTime: vi.fn(), exponentialRampToValueAtTime: vi.fn() },
    connect: vi.fn(),
  }
  const AudioContext = vi.fn(function () {
    return {
      currentTime: 0,
      destination: {},
      createOscillator: () => oscillator,
      createGain: () => gain,
    }
  })
  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: {
      AudioContext,
      localStorage: {
        getItem: (key: string) => storage.get(key) ?? null,
        setItem: (key: string, value: string) => storage.set(key, value),
      },
    },
  })
})

describe("sons da partida", () => {
  it("não cria áudio quando os sons estão desligados", () => {
    playGameSound("card")
    expect(window.AudioContext).not.toHaveBeenCalled()
  })

  it.each(["card", "turn", "finish"] as const)(
    "cria áudio para o evento %s quando ligado",
    (sound) => {
      savePlayerPreferences({ nickname: "Ana", soundsEnabled: true })
      playGameSound(sound)
      expect(window.AudioContext).toHaveBeenCalledOnce()
    }
  )
})
