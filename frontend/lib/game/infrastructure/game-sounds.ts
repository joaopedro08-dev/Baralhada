import { loadPlayerPreferences } from "./player-preferences"

export type GameSound = "card" | "turn" | "finish"

const FREQUENCIES: Record<GameSound, number> = {
  card: 220,
  turn: 440,
  finish: 660,
}

export const playGameSound = (sound: GameSound): void => {
  if (loadPlayerPreferences().soundsEnabled !== true) return
  const AudioContextConstructor =
    window.AudioContext ??
    (window as typeof window & { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext
  if (!AudioContextConstructor) return
  const context = new AudioContextConstructor()
  if (context.state === "suspended") void context.resume()
  const oscillator = context.createOscillator()
  const gain = context.createGain()
  oscillator.frequency.value = FREQUENCIES[sound]
  gain.gain.setValueAtTime(0.08, context.currentTime)
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + 0.08)
  oscillator.connect(gain)
  gain.connect(context.destination)
  oscillator.start()
  oscillator.stop(context.currentTime + 0.08)
}
