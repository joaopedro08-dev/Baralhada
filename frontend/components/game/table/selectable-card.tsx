"use client"

import { m } from "framer-motion"
import { Check, Sparkles } from "lucide-react"

import { CardFace, CARD_SIZES } from "@/components/game/cards/card-face"
import { cardName } from "@/lib/game/domain/cards"
import type { HintLevel } from "@/lib/game/domain/hint-focus"
import type { Card } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"
import { useLargeCardsPreference } from "@/lib/game/infrastructure/visual-preferences"

const CARD_SPRING = { type: "spring", stiffness: 420, damping: 26 } as const

export function SelectableCard({
  card,
  size,
  selected,
  hint,
  tilt = 0,
  onToggle,
}: {
  card: Card
  size: "table" | "hand"
  selected: boolean
  hint: HintLevel
  tilt?: number
  onToggle?: () => void
}) {
  const largeCards = useLargeCardsPreference()
  const faceStyle = cn(
    selected && "ring-[3px] ring-gold",
    !selected && hint === "best" && "hint-best",
    !selected && hint === "possible" && "hint-possible"
  )

  if (!onToggle) {
    return (
      <m.div
        role="img"
        aria-label={cardName(card)}
        data-card-ids={card}
        animate={{ rotate: tilt }}
        transition={CARD_SPRING}
        className={size === "table" ? "w-full" : "w-fit"}
      >
        <CardFace card={card} size={size} className={faceStyle} />
      </m.div>
    )
  }

  return (
    <m.button
      type="button"
      aria-pressed={selected}
      aria-label={
        hint === "best" ? `${cardName(card)}, jogada sugerida` : cardName(card)
      }
      data-card-ids={card}
      onClick={onToggle}
      animate={{ y: selected ? -10 : 0, rotate: selected ? 0 : tilt }}
      whileHover={{ y: selected ? -10 : -4 }}
      whileTap={{ scale: 0.95 }}
      transition={CARD_SPRING}
      className={cn(
        "relative block rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-sky-400",
        size === "table"
          ? "w-full"
          : largeCards
            ? "h-24 w-16 sm:h-28 sm:w-20 lg:h-32 lg:w-24"
            : CARD_SIZES.hand.box
      )}
    >
      <CardFace card={card} size={size} className={faceStyle} />
      {selected && (
        <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-gold text-gold-foreground">
          <Check aria-hidden strokeWidth={3} className="size-3" />
        </span>
      )}
      {!selected && hint === "best" && (
        <span className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-gold text-gold-foreground">
          <Sparkles aria-hidden className="size-3" />
        </span>
      )}
    </m.button>
  )
}
