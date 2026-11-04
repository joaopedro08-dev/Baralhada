import { Check } from "lucide-react"

import { SuitIcon } from "@/components/game/cards/card-face"
import { isCompleteMeld, rankName, suitOf } from "@/lib/game/domain/cards"
import type { HintLevel } from "@/lib/game/domain/hint-focus"
import type { Meld } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const describeMeld = (meld: Meld): string =>
  isCompleteMeld(meld)
    ? `Quadra completa de ${rankName(meld.rank)}`
    : `Quadra incompleta de ${rankName(meld.rank)}, com ${meld.cards.length} cartas`

export function MeldChip({
  meld,
  owner,
  selected = false,
  hint = null,
  onToggle,
}: {
  meld: Meld
  owner?: string
  selected?: boolean
  hint?: HintLevel
  onToggle?: () => void
}) {
  const complete = isCompleteMeld(meld)
  const face = cn(
    "relative inline-flex items-center gap-1 rounded-md bg-playing-card px-2 font-heading font-bold text-suit-black shadow-sm ring-1 ring-black/25",
    onToggle ? "h-11 min-w-11" : "h-8",
    complete && "ring-2 ring-gold",
    !selected && hint === "best" && "hint-best",
    !selected && hint === "possible" && "hint-possible"
  )
  const content = (
    <>
      <span className="text-base leading-none">{meld.rank}</span>
      {complete ? (
        <Check
          aria-hidden
          strokeWidth={3}
          className="size-3.5 text-suit-black"
        />
      ) : (
        <span className="flex gap-0.5">
          {meld.cards.map((card) => (
            <SuitIcon key={card} suit={suitOf(card)} className="size-3.5" />
          ))}
        </span>
      )}
    </>
  )
  const anchors = {
    "data-card-ids": meld.cards.join(" "),
    "data-meld": meld.rank,
  }

  if (!onToggle) {
    return (
      <span
        role="img"
        aria-label={describeMeld(meld)}
        className={face}
        {...anchors}
      >
        {content}
      </span>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={`${describeMeld(meld)}, de ${owner}`}
      onClick={onToggle}
      className={cn(
        face,
        "transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-[3px] focus-visible:ring-sky-400 active:scale-95",
        selected && "-translate-y-0.5 ring-[3px] ring-gold"
      )}
      {...anchors}
    >
      {content}
    </button>
  )
}
