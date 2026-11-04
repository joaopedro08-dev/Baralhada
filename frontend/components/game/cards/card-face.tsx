import { Club, Diamond, Heart, Spade } from "lucide-react"

import { isRedSuit, rankOf, suitOf } from "@/lib/game/domain/cards"
import type { Card, Suit } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const SUIT_ICONS = { C: Club, D: Diamond, H: Heart, S: Spade } as const

export function SuitIcon({
  suit,
  className,
}: {
  suit: Suit
  className?: string
}) {
  const Icon = SUIT_ICONS[suit]
  return (
    <Icon
      aria-hidden
      fill="currentColor"
      strokeWidth={1.5}
      className={cn(
        isRedSuit(suit) ? "text-suit-red" : "text-suit-black",
        className
      )}
    />
  )
}

export const CARD_SIZES = {
  table: {
    box: "aspect-[5/7] w-full",
    rank: "text-base lg:text-xl",
    suit: "size-5 lg:size-8",
  },
  hand: {
    box: "h-[4.75rem] w-14 sm:h-24 sm:w-[4.25rem] lg:h-28 lg:w-20 short:h-[4.25rem] short:w-12",
    rank: "text-xl lg:text-2xl short:text-lg",
    suit: "size-7 lg:size-9 short:size-5",
  },
  flying: {
    box: "h-[4.75rem] w-14",
    rank: "text-xl",
    suit: "size-7",
  },
} as const

export function CardFace({
  card,
  size,
  className,
  ...props
}: React.ComponentProps<"div"> & {
  card: Card
  size: keyof typeof CARD_SIZES
}) {
  const suit = suitOf(card)
  const style = CARD_SIZES[size]
  return (
    <div
      className={cn(
        "relative rounded-lg bg-playing-card shadow-md ring-1 ring-black/25",
        style.box,
        isRedSuit(suit) ? "text-suit-red" : "text-suit-black",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "absolute top-1 left-1.5 font-heading leading-none font-bold",
          style.rank
        )}
      >
        {rankOf(card)}
      </span>
      <SuitIcon
        suit={suit}
        className={cn("absolute right-1 bottom-1", style.suit)}
      />
    </div>
  )
}

export function CardBack({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "card-back rounded-lg shadow-md ring-1 ring-black/40",
        className
      )}
    />
  )
}
