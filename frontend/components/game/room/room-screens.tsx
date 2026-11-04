"use client"

import { domMax, LazyMotion, MotionConfig } from "framer-motion"

import { ConnectionBanner } from "@/components/game/room/connection-banner"
import { EndScreen } from "@/components/game/room/end-screen"
import { LobbyScreen } from "@/components/game/room/lobby-screen"
import { GameScreen } from "@/components/game/table/game-screen"
import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useGame } from "@/hooks/use-game"

function CurrentScreen() {
  const { room, seat } = useGame()
  if (!room) return null
  if (room.game && room.status === "playing") {
    return <GameScreen room={room} game={room.game} />
  }
  if (room.game && room.status === "finished") {
    return (
      <EndScreen
        room={room}
        game={room.game}
        inviteUrl={seat?.inviteUrl ?? null}
      />
    )
  }
  return <LobbyScreen room={room} inviteUrl={seat?.inviteUrl ?? null} />
}

export default function RoomScreens() {
  const { room } = useGame()
  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={300}>
          <ConnectionBanner />
          <div key={room?.status} className="animate-in duration-200 fade-in">
            <CurrentScreen />
          </div>
          <Toaster
            position="top-center"
            visibleToasts={2}
            duration={2500}
            containerAriaLabel="Notificações"
          />
        </TooltipProvider>
      </MotionConfig>
    </LazyMotion>
  )
}
