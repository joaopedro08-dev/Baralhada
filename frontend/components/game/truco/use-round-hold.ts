"use client"

import { useEffect, useState } from "react"

import type { RoundSummary, TrucoState } from "@/lib/game/domain/truco/types"

const HOLD_MS = 2000
const LINGER_MS = 500

const roundKey = (round: RoundSummary | null): string =>
  round ? `${round.handNumber}:${round.round}` : ""

export const useRoundHold = (
  game: TrucoState,
  paused: boolean
): RoundSummary | null => {
  const [seenKey, setSeenKey] = useState(roundKey(game.lastRound))
  const [held, setHeld] = useState<RoundSummary | null>(null)
  const [waited, setWaited] = useState(false)
  const key = roundKey(game.lastRound)

  if (key !== seenKey) {
    setSeenKey(key)
    setHeld(game.lastRound)
    setWaited(false)
  }
  if (paused && held && !waited) setWaited(true)

  useEffect(() => {
    if (!held || paused) return
    const timer = setTimeout(() => setHeld(null), waited ? LINGER_MS : HOLD_MS)
    return () => clearTimeout(timer)
  }, [held, paused, waited])

  return game.table.length === 0 ? held : null
}
