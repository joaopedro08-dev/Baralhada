const STORAGE_KEY = "naipe-real:dicas"
const DISABLED = "desligadas"

const listeners = new Set<() => void>()

export const subscribeToHintsPreference = (listener: () => void) => {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export const readHintsPreference = (): boolean => {
  try {
    return window.localStorage.getItem(STORAGE_KEY) !== DISABLED
  } catch {
    return true
  }
}

export const writeHintsPreference = (enabled: boolean): void => {
  try {
    if (enabled) window.localStorage.removeItem(STORAGE_KEY)
    else window.localStorage.setItem(STORAGE_KEY, DISABLED)
  } finally {
    listeners.forEach((listener) => listener())
  }
}
