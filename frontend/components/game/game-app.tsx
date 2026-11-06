"use client"

import { useEffect, useLayoutEffect } from "react"
import dynamic from "next/dynamic"

import { GameButton } from "@/components/game/game-button"
import { HomeScreen } from "@/components/game/home-screen"
import { Spinner } from "@/components/ui/spinner"
import { useGame } from "@/hooks/use-game"
import { gameSession } from "@/lib/game/session"

const loadRoomScreens = () => import("@/components/game/room/room-screens")

function WaitingScreen({
  message,
  children,
}: {
  message: string
  children?: React.ReactNode
}) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <p role="status" className="flex items-center gap-2 font-heading text-lg">
        <Spinner aria-hidden className="size-5" />
        {message}
      </p>
      {children}
    </main>
  )
}

const RoomScreens = dynamic(loadRoomScreens, {
  ssr: false,
  loading: () => <WaitingScreen message="Abrindo a sala..." />,
})

function RestoringScreen() {
  const { connection } = useGame()
  return (
    <WaitingScreen
      message={
        connection === "offline"
          ? "Sem conexão. Tentando voltar para a sala..."
          : "Voltando para a sala..."
      }
    >
      <GameButton onClick={gameSession.giveUpRestoring}>
        Voltar ao início
      </GameButton>
    </WaitingScreen>
  )
}

export function GameApp() {
  const { room, restoring, started } = useGame()

  useEffect(() => {
    gameSession.start()
    void loadRoomScreens()
  }, [])

  useLayoutEffect(() => {
    if (started) delete document.documentElement.dataset.seat
  }, [started])

  if (room) return <RoomScreens />
  if (restoring) return <RestoringScreen />
  return (
    <>
      {!started && (
        <div data-seat-boot>
          <WaitingScreen message="Voltando para a sala..." />
        </div>
      )}
      <div data-home>
        <HomeScreen />
      </div>
    </>
  )
}
