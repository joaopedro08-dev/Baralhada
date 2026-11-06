"use client"

import { Flag } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { pointsLabel } from "@/lib/game/domain/truco/guide"
import type { Stake } from "@/lib/game/domain/truco/types"

export function FoldButton({
  stake,
  enabled,
  busy,
  onFold,
}: {
  stake: Stake
  enabled: boolean
  busy: boolean
  onFold: () => void
}) {
  return (
    <>
      <span id="correr-explicacao" className="sr-only">
        {enabled
          ? `O outro time marca ${pointsLabel(stake)}.`
          : "Disponível na sua vez."}
      </span>
      <GameButton
        disabled={!enabled || busy}
        aria-describedby="correr-explicacao"
        onClick={onFold}
        className="flex-1 border-rose-400/60 text-rose-200 hover:bg-rose-500/20 hover:text-rose-100"
      >
        <Flag aria-hidden />
        Correr
      </GameButton>
    </>
  )
}
