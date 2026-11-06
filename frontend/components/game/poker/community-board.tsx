"use client"

import { useRef } from "react"

import { CardFace } from "@/components/game/cards/card-face"
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/animation/gsap"
import { cardName } from "@/lib/game/domain/cards"
import type { Card } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const BOARD_SLOTS = 5
const FLOP_SIZE = 3
const CARD_STAGGER_S = 0.14
const STREET_GAP_S = 0.95

const streetOf = (index: number): number =>
  index < FLOP_SIZE ? 0 : index - FLOP_SIZE + 1

const BOARD_CARD =
  "h-[3.4rem] w-[2.45rem] sm:h-16 sm:w-[2.85rem] lg:h-20 lg:w-14"

export function CommunityBoard({
  board,
  highlight,
}: {
  board: readonly Card[]
  highlight: readonly Card[] | null
}) {
  const scope = useRef<HTMLOListElement>(null)
  const revealed = useRef(0)

  useGSAP(
    () => {
      if (board.length < revealed.current) revealed.current = 0
      const fresh = gsap.utils
        .toArray<HTMLElement>("[data-board-card]", scope.current)
        .slice(revealed.current)
      const firstStreet = streetOf(revealed.current)
      revealed.current = board.length
      if (fresh.length === 0 || prefersReducedMotion()) return
      const timeline = gsap.timeline()
      fresh.forEach((element, offset) => {
        const index = board.length - fresh.length + offset
        const street = streetOf(index) - firstStreet
        const within = index < FLOP_SIZE ? index : 0
        timeline.fromTo(
          element,
          { rotationY: 90, y: -24, scale: 0.7, opacity: 0 },
          {
            rotationY: 0,
            y: 0,
            scale: 1,
            opacity: 1,
            duration: 0.45,
            ease: "back.out(1.7)",
          },
          street * STREET_GAP_S + within * CARD_STAGGER_S
        )
      })
    },
    { scope, dependencies: [board.join(",")] }
  )

  return (
    <ol
      ref={scope}
      aria-label={
        board.length > 0
          ? `Mesa: ${board.map(cardName).join(", ")}`
          : "Mesa ainda fechada"
      }
      className="flex items-center justify-center gap-1 [perspective:600px] sm:gap-1.5"
    >
      {Array.from({ length: BOARD_SLOTS }, (_, index) => {
        const card = board[index]
        const winning = card !== undefined && highlight?.includes(card)
        return (
          <li key={index} className={cn("relative", BOARD_CARD)}>
            <span className="absolute inset-0 rounded-lg border border-dashed border-white/20" />
            {card && (
              <span data-board-card className="absolute inset-0 block">
                <CardFace
                  card={card}
                  size="pile"
                  className={cn(
                    "size-full transition-all duration-300 [&>span:first-child]:text-sm sm:[&>span:first-child]:text-base",
                    highlight && !winning && "opacity-45 saturate-50",
                    winning && "hint-best -translate-y-1"
                  )}
                />
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}
