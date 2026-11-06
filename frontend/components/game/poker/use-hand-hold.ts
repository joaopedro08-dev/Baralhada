"use client"

import { useEffect, useState } from "react"

import type { HandSummary, PokerState } from "@/lib/game/domain/poker/types"

const HOLD_MS = 3200
const LINGER_MS = 400

export interface HeldHand {
  readonly summary: HandSummary
  readonly before: PokerState
}

export const useHandHold = (
  game: PokerState,
  paused: boolean
): HeldHand | null => {
  const [seen, setSeen] = useState(game)
  const [held, setHeld] = useState<HeldHand | null>(null)
  const [waited, setWaited] = useState(false)

  if (seen !== game) {
    setSeen(game)
    const summary = game.lastHand
    if (summary && summary.number !== seen.lastHand?.number) {
      setHeld({ summary, before: seen })
      setWaited(false)
    }
  }
  if (paused && held && !waited) setWaited(true)

  useEffect(() => {
    if (!held || paused) return
    const timer = setTimeout(() => setHeld(null), waited ? LINGER_MS : HOLD_MS)
    return () => clearTimeout(timer)
  }, [held, paused, waited])

  return held
}
