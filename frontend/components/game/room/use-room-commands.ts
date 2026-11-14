"use client"

import { useState } from "react"

import type { Refusal } from "@/lib/game/application/game-session"
import type { GameId, PlayerId } from "@/lib/game/domain/types"
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
    chooseGame: (gameId: GameId) =>
      void run(() => gameSession.chooseGame(gameId)),
    randomGame: () => void run(gameSession.randomGame),
    setTurnDuration: (seconds: 15 | 30 | 60) =>
      void run(() => gameSession.setTurnDuration(seconds)),
    moveToTeam: (playerId: PlayerId, team: number) =>
      void run(() => gameSession.moveToTeam(playerId, team)),
    drawTeams: () => void run(gameSession.drawTeams),
    allowHints: (allowed: boolean) =>
      void run(() => gameSession.allowHints(allowed)),
  }
}
