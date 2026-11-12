"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, m } from "framer-motion"
import { WifiOff } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { useGame } from "@/hooks/use-game"
import { gameSession } from "@/lib/game/session"

const secondsUntil = (deadline: number | null): number | null => {
  if (deadline === null) return null
  return Math.max(0, Math.ceil((deadline - Date.now()) / 1000))
}

export const connectionMessage = (
  connection: string,
  restoring: boolean
): string =>
  connection === "replaced"
    ? "Esta sala foi aberta em outra aba ou aparelho."
    : restoring
      ? "Reconectando..."
      : "Sem conexão. Tentando voltar para a sala..."

export function ConnectionBanner() {
  const { connection, restoring, room } = useGame()
  const [, refresh] = useState(0)
  const disconnected = room?.players.filter((player) => !player.connected) ?? []
  const visible = connection !== "online" || restoring || disconnected.length > 0
  const replaced = connection === "replaced"

  useEffect(() => {
    if (disconnected.length === 0) return
    const timer = window.setInterval(() => refresh((value) => value + 1), 1000)
    return () => window.clearInterval(timer)
  }, [disconnected.length])

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          role="status"
          initial={{ y: "-100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          className="pointer-events-none fixed inset-x-0 top-0 z-40 flex min-h-11 flex-wrap items-center justify-center gap-x-3 gap-y-1 bg-refusal px-3 py-1.5 text-sm font-medium text-refusal-foreground sm:px-4"
        >
          <WifiOff aria-hidden className="size-4 shrink-0" />
          <span className="min-w-0 max-w-full text-center break-words">
            {connectionMessage(connection, restoring)}
            {disconnected.length > 0 &&
              ` ${disconnected.map((player) => player.nickname).join(", ")} aguardando reconexão.`}
            {disconnected.length > 0 &&
              (() => {
                const deadlines = disconnected
                  .map((player) => secondsUntil(player.reconnectDeadlineAt ?? null))
                  .filter((seconds): seconds is number => seconds !== null)
                const seconds = deadlines.length > 0 ? Math.min(...deadlines) : null
                return seconds === null
                  ? ""
                  : ` Restam ${seconds} s para remover.`
              })()}
          </span>
          {replaced && (
            <GameButton
              tone="gold"
              onClick={gameSession.resumeHere}
              className="pointer-events-auto shrink-0"
            >
              Usar aqui
            </GameButton>
          )}
        </m.div>
      )}
    </AnimatePresence>
  )
}
