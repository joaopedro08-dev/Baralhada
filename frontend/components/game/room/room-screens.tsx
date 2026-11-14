"use client"

import { useEffect, useRef } from "react"
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
import type { GameId, RoomStatus } from "@/lib/game/domain/types"
import { playGameSound } from "@/lib/game/infrastructure/game-sounds"
import { useReducedMotionPreference } from "@/lib/game/infrastructure/visual-preferences"

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

const loadTrincasScreen = () =>
  import("@/components/game/tres-trincas/tres-trincas-screen")
const loadTrincasEndScreen = () =>
  import("@/components/game/tres-trincas/tres-trincas-end-screen")

const TresTrincasScreen = dynamic(
  () => loadTrincasScreen().then((mod) => mod.TresTrincasScreen),
  { ssr: false, loading: LoadingTable }
)

const TresTrincasEndScreen = dynamic(
  () => loadTrincasEndScreen().then((mod) => mod.TresTrincasEndScreen),
  { ssr: false, loading: LoadingTable }
)

const loadPokerScreen = () => import("@/components/game/poker/poker-screen")
const loadPokerEndScreen = () =>
  import("@/components/game/poker/poker-end-screen")

const PokerScreen = dynamic(
  () => loadPokerScreen().then((mod) => mod.PokerScreen),
  { ssr: false, loading: LoadingTable }
)

const PokerEndScreen = dynamic(
  () => loadPokerEndScreen().then((mod) => mod.PokerEndScreen),
  { ssr: false, loading: LoadingTable }
)

const loadCachetaScreen = () =>
  import("@/components/game/cacheta/cacheta-screen")
const loadCachetaEndScreen = () =>
  import("@/components/game/cacheta/cacheta-end-screen")

const CachetaScreen = dynamic(
  () => loadCachetaScreen().then((mod) => mod.CachetaScreen),
  { ssr: false, loading: LoadingTable }
)

const CachetaEndScreen = dynamic(
  () => loadCachetaEndScreen().then((mod) => mod.CachetaEndScreen),
  { ssr: false, loading: LoadingTable }
)

const loadBlackjackScreen = () =>
  import("@/components/game/blackjack/blackjack-screen")
const loadBlackjackEndScreen = () =>
  import("@/components/game/blackjack/blackjack-end-screen")

const BlackjackScreen = dynamic(
  () => loadBlackjackScreen().then((mod) => mod.BlackjackScreen),
  { ssr: false, loading: LoadingTable }
)

const BlackjackEndScreen = dynamic(
  () => loadBlackjackEndScreen().then((mod) => mod.BlackjackEndScreen),
  { ssr: false, loading: LoadingTable }
)

const PRELOADS: Partial<Record<GameId, readonly (() => Promise<unknown>)[]>> = {
  "truco-paulista": [loadTrucoScreen, loadTrucoEndScreen],
  "tres-trincas": [loadTrincasScreen, loadTrincasEndScreen],
  "poker-texas-holdem": [loadPokerScreen, loadPokerEndScreen],
  cacheta: [loadCachetaScreen, loadCachetaEndScreen],
  blackjack: [loadBlackjackScreen, loadBlackjackEndScreen],
}

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
  if (game.kind === "tres-trincas") {
    return playing ? (
      <TresTrincasScreen room={room} game={game} />
    ) : (
      <TresTrincasEndScreen room={room} game={game} inviteUrl={inviteUrl} />
    )
  }
  if (game.kind === "poker-texas-holdem") {
    return playing ? (
      <PokerScreen room={room} game={game} />
    ) : (
      <PokerEndScreen room={room} game={game} inviteUrl={inviteUrl} />
    )
  }
  if (game.kind === "blackjack") {
    return playing ? (
      <BlackjackScreen room={room} game={game} />
    ) : (
      <BlackjackEndScreen room={room} game={game} inviteUrl={inviteUrl} />
    )
  }
  if (game.kind === "cacheta") {
    return playing ? (
      <CachetaScreen room={room} game={game} />
    ) : (
      <CachetaEndScreen room={room} game={game} inviteUrl={inviteUrl} />
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
  const reducedMotion = useReducedMotionPreference()
  const previousTurn = useRef<number | null>(null)
  const previousStatus = useRef<RoomStatus | null>(null)
  const gameId = room?.gameId ?? null
  const settling = useWaiting(room?.pausedUntil ?? null)
  const status =
    room?.status === "finished" && settling ? "playing" : (room?.status ?? null)

  useEffect(() => {
    if (!gameId) return
    for (const load of PRELOADS[gameId] ?? []) void load()
  }, [gameId])

  useEffect(() => {
    if (!room) return
    if (
      previousTurn.current !== null &&
      room.game?.turnNumber !== previousTurn.current &&
      room.game?.currentPlayerId === room.viewerId
    ) {
      playGameSound("turn")
    }
    if (previousStatus.current !== "finished" && room.status === "finished") {
      playGameSound("finish")
    }
    previousTurn.current = room.game?.turnNumber ?? null
    previousStatus.current = room.status
  }, [room])

  return (
    <LazyMotion features={domMax} strict>
      <MotionConfig reducedMotion={reducedMotion ? "always" : "user"}>
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
