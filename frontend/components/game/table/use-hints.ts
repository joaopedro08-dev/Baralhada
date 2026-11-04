"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

import type { Hints, RoomState } from "@/lib/game/domain/types"
import {
  readHintsPreference,
  subscribeToHintsPreference,
  writeHintsPreference,
} from "@/lib/game/infrastructure/hints-preference"
import { gameSession } from "@/lib/game/session"

const defaultPreference = (): boolean => true

interface VersionedHints {
  readonly version: number
  readonly hints: Hints | null
}

export const useHints = (room: RoomState, isMyTurn: boolean) => {
  const enabled = useSyncExternalStore(
    subscribeToHintsPreference,
    readHintsPreference,
    defaultPreference
  )
  const [latest, setLatest] = useState<VersionedHints | null>(null)
  const wanted = enabled && isMyTurn

  useEffect(() => {
    if (!wanted) return
    let current = true
    void gameSession.fetchHints().then((hints) => {
      if (current) setLatest({ version: room.version, hints })
    })
    return () => {
      current = false
    }
  }, [wanted, room.version])

  return {
    enabled,
    setEnabled: writeHintsPreference,
    hints: wanted && latest?.version === room.version ? latest.hints : null,
  }
}
