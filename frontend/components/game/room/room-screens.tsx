"use client"

import { useEffect } from "react"
import dynamic from "next/dynamic"
import { domMax, LazyMotion, MotionConfig } from "framer-motion"

import { ConnectionBanner } from "@/components/game/room/connection-banner"
import { EndScreen } from "@/components/game/room/end-screen"
import { LobbyScreen } from "@/components/game/room/lobby-screen"
import { GameScreen } from "@/components/game/table/game-screen"
import { useWaiting } from "@/components/game/table/turn-timer"
import { Spinner } from "@/components/ui/spinner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { useGame } from "@/hooks/use-game"
import type { RoomStatus } from "@/lib/game/domain/types"

function LoadingTable() {
  return (
    <main className="flex min-h-svh items-center justify-center gap-2 p-6">
      <Spinner aria-hidden className="size-5" />
      <p role="status">Preparando a mesa...</p>
    </main>
  )
}

const loadTrucoScreen = () => import("@/components/game/truco/truco-screen")
const loadTrucoEndScreen = () =>
  import("@/components/game/truco/truco-end-screen")

const TrucoScreen = dynamic(
  () => loadTrucoScreen().then((mod) => mod.TrucoScreen),
  { ssr: false, loading: LoadingTable }
)

const TrucoEndScreen = dynamic(
  () => loadTrucoEndScreen().then((mod) => mod.TrucoEndScreen),
  { ssr: false, loading: LoadingTable }
)

const TRUCO_ID = "truco-paulista"

function CurrentScreen({ status }: { status: RoomStatus | null }) {
  const { room, seat } = useGame()
  if (!room) return null
  const inviteUrl = seat?.inviteUrl ?? null
  const { game } = room
  if (!game || status === "lobby") {
    return <LobbyScreen room={room} inviteUrl={inviteUrl} />
  }
  const playing = status === "playing"
  if (game.kind === "truco-paulista") {
    return playing ? (
      <TrucoScreen room={room} game={game} />
    ) : (
      <TrucoEndScreen room={room} game={game} inviteUrl={inviteUrl} />
    )
  }
  return playing ? (
    <GameScreen room={room} game={game} />
  ) : (
    <EndScreen room={room} game={game} inviteUrl={inviteUrl} />
  )
}

export default function RoomScreens() {
  const { room } = useGame()
  const playsTruco = room?.gameId === TRUCO_ID
  const settling = useWaiting(room?.pausedUntil ?? null)
  const status =
    room?.status === "finished" && settling ? "playing" : (room?.status ?? null)

  useEffect(() => {
    if (!playsTruco) return
    void loadTrucoScreen()
    void loadTrucoEndScreen()
  }, [playsTruco])

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion="user">
        <TooltipProvider delayDuration={300}>
          <ConnectionBanner />
          <div key={status} className="animate-in duration-200 fade-in">
            <CurrentScreen status={status} />
          </div>
        </TooltipProvider>
      </MotionConfig>
    </LazyMotion>
  )
}
