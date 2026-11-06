"use client"

import { useState } from "react"

import type { TrucoAction } from "@/lib/game/domain/truco/types"
import { gameSession } from "@/lib/game/session"

interface TurnRefusal {
  readonly turn: number
  readonly message: string
}

export const useTrucoCommands = (turnNumber: number) => {
  const [busy, setBusy] = useState(false)
  const [refusal, setRefusal] = useState<TurnRefusal | null>(null)

  const perform = async (action: TrucoAction) => {
    if (busy) return
    setBusy(true)
    const message = await gameSession.playAction(action)
    setBusy(false)
    setRefusal(message ? { turn: turnNumber, message } : null)
  }

  return {
    busy,
    refusal: refusal?.turn === turnNumber ? refusal.message : null,
    perform: (action: TrucoAction) => void perform(action),
  }
}
