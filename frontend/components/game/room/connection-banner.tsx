"use client"

import { AnimatePresence, m } from "framer-motion"
import { WifiOff } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { useGame } from "@/hooks/use-game"
import { gameSession } from "@/lib/game/session"

export function ConnectionBanner() {
  const { connection, restoring } = useGame()
  const visible = connection !== "online" || restoring
  const replaced = connection === "replaced"

  return (
    <AnimatePresence>
      {visible && (
        <m.div
          role="status"
          initial={{ y: "-100%" }}
          animate={{ y: 0 }}
          exit={{ y: "-100%" }}
          className="pointer-events-none fixed inset-x-0 top-0 z-40 flex min-h-11 items-center justify-center gap-3 bg-refusal px-4 py-1.5 text-sm font-medium text-refusal-foreground"
        >
          <WifiOff aria-hidden className="size-4 shrink-0" />
          <span>
            {replaced
              ? "Esta sala foi aberta em outra aba ou aparelho."
              : "Sem conexão. Tentando voltar para a sala..."}
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
