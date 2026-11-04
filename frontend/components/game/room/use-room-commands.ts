"use client"

import { useState } from "react"

import type { Refusal } from "@/lib/game/application/game-session"
import type { PlayerId } from "@/lib/game/domain/types"
import { gameSession } from "@/lib/game/session"

export const useRoomCommands = () => {
  const [refusal, setRefusal] = useState<Refusal>(null)
  const [busy, setBusy] = useState(false)

  const run = async (command: () => Promise<Refusal>) => {
    setBusy(true)
    setRefusal(await command())
    setBusy(false)
  }

  return {
    refusal,
    busy,
    startMatch: () => void run(gameSession.startMatch),
    kickPlayer: (playerId: PlayerId) =>
      void run(() => gameSession.kickPlayer(playerId)),
  }
}
