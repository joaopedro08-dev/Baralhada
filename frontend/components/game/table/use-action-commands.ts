"use client"

import { useState } from "react"

import type { AnyAction } from "@/lib/game/domain/types"
import { gameSession } from "@/lib/game/session"

interface TurnRefusal {
  readonly turn: number
  readonly message: string
}

export const useActionCommands = <Action extends AnyAction>(
  turnNumber: number
) => {
  const [busy, setBusy] = useState(false)
  const [refusal, setRefusal] = useState<TurnRefusal | null>(null)

  const perform = async (action: Action) => {
    if (busy) return
    setBusy(true)
    const message = await gameSession.playAction(action)
    setBusy(false)
    setRefusal(message ? { turn: turnNumber, message } : null)
  }

  return {
    busy,
    refusal: refusal?.turn === turnNumber ? refusal.message : null,
    perform: (action: Action) => void perform(action),
  }
}
