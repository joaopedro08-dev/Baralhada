"use client"

import { useRef } from "react"
import { m } from "framer-motion"

import { CardBack, CardFace } from "@/components/game/cards/card-face"
import { gsap, prefersReducedMotion, useGSAP } from "@/lib/animation/gsap"
import { cardName } from "@/lib/game/domain/cards"
import type { Card } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"
import { useLargeCardsPreference } from "@/lib/game/infrastructure/visual-preferences"

export const CARD_SIZES = {
  small:
    "h-14 w-10 [&>span]:text-base [&>svg]:size-4 lg:h-14 lg:w-10 lg:[&>span]:text-base lg:[&>svg]:size-4",
  medium:
    "h-[4.5rem] w-[3.25rem] [&>span]:text-lg [&>svg]:size-5 lg:h-20 lg:w-14 lg:[&>span]:text-xl lg:[&>svg]:size-6",
  large:
    "h-24 w-[4.25rem] [&>span]:text-xl [&>svg]:size-7 lg:h-28 lg:w-20 lg:[&>span]:text-2xl lg:[&>svg]:size-8",
} as const

export type CardSize = keyof typeof CARD_SIZES

const OVERLAPS: Readonly<Record<CardSize, string>> = {
  small: "-ml-6",
  medium: "-ml-7 lg:-ml-8",
  large: "-ml-10 lg:-ml-12",
}

export function DealtCard({
  card,
  index,
  size,
  sideways = false,
}: {
  card: Card
  index: number
  size: CardSize
  sideways?: boolean
}) {
  const largeCards = useLargeCardsPreference()
  return (
    <m.li
      initial={{ y: -90, x: 60, rotate: -25, opacity: 0 }}
      animate={{
        y: 0,
        x: 0,
        rotate: sideways ? 90 : index % 2 === 0 ? -3 : 3,
        opacity: 1,
      }}
      transition={{
        type: "spring",
        stiffness: 260,
        damping: 22,
      }}
      className={cn(
        "relative",
        largeCards && "scale-110",
        sideways ? "mx-3 self-center" : index > 0 && OVERLAPS[size]
      )}
    >
      <CardFace
        card={card}
        size="pile"
        aria-label={cardName(card)}
        className={CARD_SIZES[size]}
      />
    </m.li>
  )
}

export function FlipCard({ card, size }: { card: Card; size: CardSize }) {
  const largeCards = useLargeCardsPreference()
  const flipper = useRef<HTMLDivElement>(null)
  useGSAP(() => {
    if (!flipper.current || prefersReducedMotion()) return
    gsap.fromTo(
      flipper.current,
      { rotateY: 180, scale: 1.08 },
      { rotateY: 0, scale: 1, duration: 0.7, ease: "back.out(1.5)" }
    )
  })
  return (
    <div className="[perspective:700px]">
      <div ref={flipper} className="relative [transform-style:preserve-3d]">
        <CardFace
          card={card}
          size="pile"
          aria-label={cardName(card)}
          className={cn(
            CARD_SIZES[size],
            largeCards && "scale-110",
            "[backface-visibility:hidden]"
          )}
        />
        <CardBack
          className={cn(
            CARD_SIZES[size],
            largeCards && "scale-110",
            "absolute inset-0 [transform:rotateY(180deg)] [backface-visibility:hidden]"
          )}
        />
      </div>
    </div>
  )
}

export function HiddenCard({ size }: { size: CardSize }) {
  const largeCards = useLargeCardsPreference()
  return (
    <m.span
      role="img"
      aria-label="Carta escondida da banca"
      initial={{ y: -90, x: 60, rotate: -25, opacity: 0 }}
      animate={{ y: 0, x: 0, rotate: 3, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22, delay: 0.24 }}
      className="block"
    >
      <CardBack className={cn(CARD_SIZES[size], largeCards && "scale-110")} />
    </m.span>
  )
}

export const overlapOf = (size: CardSize): string => OVERLAPS[size]
