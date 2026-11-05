import { Layers } from "lucide-react"

import { CardFace } from "@/components/game/cards/card-face"
import { cardName, plural } from "@/lib/game/domain/cards"
import type { HintLevel } from "@/lib/game/domain/hint-focus"
import type { Card } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const describePile = (top: Card | null, size: number): string =>
  top
    ? `Monte com ${plural(size, "carta", "cartas")}, topo ${cardName(top)}`
    : "Monte vazio"

export function PileStack({
  top,
  size,
  owner,
  selected = false,
  hint = null,
  onToggle,
}: {
  top: Card | null
  size: number
  owner?: string
  selected?: boolean
  hint?: HintLevel
  onToggle?: () => void
}) {
  const label = owner
    ? `${describePile(top, size)}, de ${owner}`
    : describePile(top, size)
  const face = cn(
    selected && "ring-[3px] ring-gold",
    !selected && hint === "best" && "hint-best",
    !selected && hint === "possible" && "hint-possible"
  )
  const content = (
    <>
      {top ? (
        <>
          {size > 1 && (
            <span className="absolute inset-0 translate-x-1 translate-y-1 rounded-lg bg-playing-card/70 ring-1 ring-black/25" />
          )}
          <CardFace
            card={top}
            size="pile"
            data-card-ids={top}
            className={face}
          />
        </>
      ) : (
        <span className="flex h-16 w-12 items-center justify-center rounded-lg border-2 border-dashed border-felt-line lg:h-20 lg:w-14">
          <Layers aria-hidden className="size-4 text-felt-muted" />
        </span>
      )}
      <span className="absolute -right-2 -bottom-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-felt-deep px-1 font-heading text-xs font-bold text-white tabular-nums ring-1 ring-felt-line">
        {size}
      </span>
    </>
  )
  const body = "relative inline-block w-fit"

  if (!onToggle) {
    return (
      <span
        role="img"
        aria-label={label}
        data-pile={size}
        data-landing
        className={body}
      >
        {content}
      </span>
    )
  }

  return (
    <button
      type="button"
      aria-pressed={selected}
      aria-label={label}
      data-pile={size}
      data-landing
      onClick={onToggle}
      className={cn(
        body,
        "rounded-lg transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-[3px] focus-visible:ring-sky-400 active:scale-95",
        selected && "-translate-y-0.5"
      )}
    >
      {content}
    </button>
  )
}
