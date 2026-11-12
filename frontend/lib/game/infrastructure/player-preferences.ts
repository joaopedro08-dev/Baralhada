const STORAGE_KEY = "naipe-real:preferencias"

export interface PlayerPreferences {
  readonly nickname: string
}

const isPreferences = (value: unknown): value is PlayerPreferences =>
  typeof value === "object" &&
  value !== null &&
  typeof (value as { nickname?: unknown }).nickname === "string"

export const loadPlayerPreferences = (): PlayerPreferences => {
  try {
    const stored = window.localStorage.getItem(STORAGE_KEY)
    const parsed: unknown = stored ? JSON.parse(stored) : null
    return isPreferences(parsed) ? parsed : { nickname: "" }
  } catch {
    return { nickname: "" }
  }
}

export const savePlayerPreferences = (preferences: PlayerPreferences): void => {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences))
  } catch {
    return
  }
}
