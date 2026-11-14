"use client"

import { useEffect, useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { loadPlayerPreferences } from "@/lib/game/infrastructure/player-preferences"
import { cn } from "@/lib/utils"

const HIDE_AFTER_MS = 10_000
export const HIDDEN_ROOM_CODE = "••••••"

export const roomCodeAccessibleLabel = (
  code: string,
  visible: boolean
): string => (visible ? `Código da sala ${code}` : "Código da sala oculto")

export function RoomCodeVisibility({
  code,
  variant = "inline",
}: {
  code: string
  variant?: "inline" | "tiles"
}) {
  const [visible, setVisible] = useState(
    () => loadPlayerPreferences().showRoomCodeByDefault
  )

  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => setVisible(false), HIDE_AFTER_MS)
    return () => clearTimeout(timer)
  }, [visible])

  const label = visible ? "Esconder código da sala" : "Mostrar código da sala"
  const value = visible ? code : HIDDEN_ROOM_CODE

  return (
    <div className="flex items-center gap-2">
      <span
        role="status"
        aria-label={roomCodeAccessibleLabel(code, visible)}
        className={cn(
          "font-mono font-bold",
          variant === "tiles" ? "flex gap-1.5" : "min-w-[7ch] text-center"
        )}
      >
        {variant === "tiles"
          ? [...value].map((letter, position) => (
              <span
                key={position}
                aria-hidden
                className="flex h-14 w-11 items-center justify-center rounded-lg bg-playing-card text-3xl text-suit-black shadow-md ring-1 ring-black/20 sm:h-16 sm:w-12"
              >
                {letter}
              </span>
            ))
          : value}
      </span>
      <GameButton
        type="button"
        variant="outline"
        aria-label={label}
        aria-pressed={visible}
        onClick={() => setVisible((current) => !current)}
        className="size-11 shrink-0 px-0"
      >
        {visible ? <EyeOff aria-hidden /> : <Eye aria-hidden />}
      </GameButton>
    </div>
  )
}
