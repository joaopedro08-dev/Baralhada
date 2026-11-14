"use client"

import { useEffect, useState } from "react"

import { loadPlayerPreferences } from "./player-preferences"

export const useReducedMotionPreference = (): boolean => {
  const [reduced, setReduced] = useState(false)

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () =>
      setReduced(loadPlayerPreferences().reducedMotion || query.matches)
    update()
    query.addEventListener("change", update)
    window.addEventListener("storage", update)
    window.addEventListener("naipe-real:preferences", update)
    return () => {
      query.removeEventListener("change", update)
      window.removeEventListener("storage", update)
      window.removeEventListener("naipe-real:preferences", update)
    }
  }, [])

  return reduced
}

export const useLargeCardsPreference = (): boolean => {
  const [large, setLarge] = useState(false)

  useEffect(() => {
    const update = () => setLarge(loadPlayerPreferences().cardSize === "large")
    update()
    window.addEventListener("storage", update)
    window.addEventListener("naipe-real:preferences", update)
    return () => {
      window.removeEventListener("storage", update)
      window.removeEventListener("naipe-real:preferences", update)
    }
  }, [])

  return large
}
