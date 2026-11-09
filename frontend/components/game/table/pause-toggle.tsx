"use client"

import { Pause, Play } from "lucide-react"

import { Button } from "@/components/ui/button"
import { gameSession } from "@/lib/game/session"
import type { RoomState } from "@/lib/game/domain/types"

export function PauseToggle({ room }: { room: RoomState }) {
  if (room.hostId !== room.viewerId) return null

  const paused = room.pausedAt !== null
  const changePause = async () => {
    await gameSession.changePause(!paused)
  }

  return (
    <Button
      variant="outline"
      className="h-11 justify-start gap-2 px-3 text-sm"
      onClick={() => void changePause()}
      aria-label={paused ? "Continuar partida" : "Pausar partida"}
    >
      {paused ? (
        <Play aria-hidden className="size-4" />
      ) : (
        <Pause aria-hidden className="size-4" />
      )}
      {paused ? "Continuar partida" : "Pausar partida"}
    </Button>
  )
}
