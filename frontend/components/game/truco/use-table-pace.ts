"use client"

import { useState } from "react"

import { useWaiting } from "@/components/game/table/turn-timer"
import type { TrucoState } from "@/lib/game/domain/truco/types"
import type { RoomState } from "@/lib/game/domain/types"

export interface TablePace {
  readonly paused: boolean
  readonly dealing: boolean
  readonly until: number | null
}

export const useTablePace = (room: RoomState, game: TrucoState): TablePace => {
  const paused = useWaiting(room.pausedUntil)
  const [dealt, setDealt] = useState(game.handNumber)

  if (!paused && dealt !== game.handNumber) setDealt(game.handNumber)

  return {
    paused,
    dealing: dealt !== game.handNumber,
    until: room.pausedUntil,
  }
}
