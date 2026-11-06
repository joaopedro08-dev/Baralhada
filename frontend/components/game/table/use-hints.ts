"use client"

import { useEffect, useState, useSyncExternalStore } from "react"

import type { AnyHints, RoomState } from "@/lib/game/domain/types"
import {
  readHintsPreference,
  subscribeToHintsPreference,
  writeHintsPreference,
} from "@/lib/game/infrastructure/hints-preference"
import { gameSession } from "@/lib/game/session"

type HintsKind = AnyHints["kind"]

const defaultPreference = (): boolean => true

interface VersionedHints {
  readonly version: number
  readonly hints: AnyHints | null
}

export const useHints = <Kind extends HintsKind = "rouba-monte">(
  room: RoomState,
  isMyTurn: boolean,
  kind: Kind = "rouba-monte" as Kind
) => {
  const enabled = useSyncExternalStore(
    subscribeToHintsPreference,
    readHintsPreference,
    defaultPreference
  )
  const [latest, setLatest] = useState<VersionedHints | null>(null)
  const allowed = room.hintsAllowed
  const wanted = allowed && enabled && isMyTurn

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

  const fresh = wanted && latest?.version === room.version ? latest.hints : null
  return {
    allowed,
    enabled,
    setEnabled: writeHintsPreference,
    hints:
      fresh?.kind === kind
        ? (fresh as Extract<AnyHints, { kind: Kind }>)
        : null,
  }
}
