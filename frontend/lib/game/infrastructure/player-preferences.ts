import type { GameId } from "@/lib/game/domain/types"

const STORAGE_KEY = "naipe-real:preferencias"

export interface PlayerPreferences {
  readonly nickname: string
  readonly tutorialsSeen: Partial<Record<GameId, true>>
  readonly tutorialAutoOpen: boolean
  readonly showRoomCodeByDefault: boolean
  readonly soundsEnabled: boolean
  readonly reducedMotion: boolean
  readonly cardSize: "normal" | "large"
}

const defaultPreferences: PlayerPreferences = {
  nickname: "",
  tutorialsSeen: {},
  tutorialAutoOpen: true,
  showRoomCodeByDefault: false,
  soundsEnabled: false,
  reducedMotion: false,
  cardSize: "normal",
}

const isPreferences = (value: unknown): value is PlayerPreferences =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { nickname?: unknown }).nickname === "string"

export const loadPlayerPreferences = (): PlayerPreferences => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = stored ? JSON.parse(stored) : null
    if (!isPreferences(parsed)) return defaultPreferences
    const tutorialsSeen =
      typeof parsed.tutorialsSeen === "object" && parsed.tutorialsSeen !== null
        ? parsed.tutorialsSeen
        : {}
    return {
      ...defaultPreferences,
      nickname: parsed.nickname,
      tutorialsSeen,
      tutorialAutoOpen:
        typeof parsed.tutorialAutoOpen === "boolean"
          ? parsed.tutorialAutoOpen
          : defaultPreferences.tutorialAutoOpen,
      showRoomCodeByDefault:
        typeof parsed.showRoomCodeByDefault === "boolean"
          ? parsed.showRoomCodeByDefault
          : defaultPreferences.showRoomCodeByDefault,
      soundsEnabled:
        typeof parsed.soundsEnabled === "boolean"
          ? parsed.soundsEnabled
          : defaultPreferences.soundsEnabled,
      reducedMotion:
        typeof parsed.reducedMotion === "boolean"
          ? parsed.reducedMotion
          : defaultPreferences.reducedMotion,
      cardSize: parsed.cardSize === "large" ? "large" : defaultPreferences.cardSize,
    }
  } catch {
    return defaultPreferences
  }
}

export const savePlayerPreferences = (
  preferences: Pick<PlayerPreferences, "nickname"> &
    Partial<Omit<PlayerPreferences, "nickname">>
): void => {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...defaultPreferences, ...preferences })
    )
  } catch {
    return
  }
}

export const hasSeenTutorial = (gameId: GameId): boolean =>
  loadPlayerPreferences().tutorialsSeen[gameId] === true

export const markTutorialSeen = (gameId: GameId): void => {
  const preferences = loadPlayerPreferences()
  savePlayerPreferences({
    ...preferences,
    tutorialsSeen: { ...preferences.tutorialsSeen, [gameId]: true },
  })
}

export const markAllTutorialsSeen = (): void => {
  const preferences = loadPlayerPreferences()
  const gameIds: readonly GameId[] = [
    "rouba-monte",
    "truco-paulista",
    "tres-trincas",
    "poker-texas-holdem",
    "cacheta",
    "blackjack",
  ]
  savePlayerPreferences({
    ...preferences,
    tutorialsSeen: Object.fromEntries(
      gameIds.map((gameId) => [gameId, true])
    ) as Partial<Record<GameId, true>>,
  })
}

export const updatePlayerPreferences = (
  patch: Partial<Omit<PlayerPreferences, "nickname">>
): void => {
  savePlayerPreferences({ ...loadPlayerPreferences(), ...patch })
  window.dispatchEvent(new Event("naipe-real:preferences"))
}
