"use client"

import { useState } from "react"
import { m } from "framer-motion"
import { Eye } from "lucide-react"

import { CardFace } from "@/components/game/cards/card-face"
import { GameButton } from "@/components/game/game-button"
import { cardName } from "@/lib/game/domain/cards"
import type { TrucoState } from "@/lib/game/domain/truco/types"

const msUntil = (until: number | null): number =>
  until === null ? 0 : Math.max(0, until - Date.now())

export function ShowHandPrompt({
  game,
  until,
  busy,
  onShow,
}: {
  game: TrucoState
  until: number | null
  busy: boolean
  onShow: () => void
}) {
  const [windowMs] = useState(() => msUntil(until))
  const cards = game.lastHand?.runner?.cards ?? []

  return (
    <m.div
      role="region"
      aria-label="Mostrar suas cartas"
      initial={{ opacity: 0, y: 12, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 24 }}
      className="mx-auto flex w-full max-w-md flex-col gap-2 overflow-hidden rounded-lg bg-felt p-2 ring-1 ring-gold/60"
    >
      <div className="flex items-center gap-3">
        <ul aria-label="Suas cartas da mão que acabou" className="flex gap-1">
          {cards.map((card, position) => (
            <m.li
              key={card}
              role="img"
              aria-label={cardName(card)}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              transition={{ delay: position * 0.08 }}
            >
              <CardFace card={card} size="pile" className="h-12 w-9" />
            </m.li>
          ))}
        </ul>
        <p className="min-w-0 flex-1 text-sm">
          Você correu. Mostrar suas cartas antes da próxima mão?
        </p>
        <GameButton
          tone="gold"
          disabled={busy}
          onClick={onShow}
          className="shrink-0"
        >
          <Eye aria-hidden />
          Mostrar
        </GameButton>
      </div>
      <m.div
        aria-hidden
        className="h-1 origin-left rounded-full bg-gold"
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: windowMs / 1000, ease: "linear" }}
      />
    </m.div>
  )
}
