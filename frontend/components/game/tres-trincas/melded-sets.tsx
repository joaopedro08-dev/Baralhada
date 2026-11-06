import { m } from "framer-motion"

import { CardFace } from "@/components/game/cards/card-face"
import { cardName } from "@/lib/game/domain/cards"
import {
  setLabel,
  setRankOf,
  SETS_TO_WIN,
} from "@/lib/game/domain/tres-trincas/guide"
import type { CardSet } from "@/lib/game/domain/tres-trincas/types"
import type { Rank } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

export const trincaCardLayoutId = (card: string): string => `trinca-${card}`

const SIZES = {
  small: {
    card: "h-12 w-9 [&>span]:text-sm [&>svg]:size-3.5",
    overlap: "-ml-5",
    slot: "h-12 w-[4.25rem]",
  },
  large: {
    card: "h-16 w-12 [&>span]:text-lg [&>svg]:size-5",
    overlap: "-ml-6",
    slot: "h-16 w-24",
  },
} as const

export function MeldedSets({
  sets,
  wildRank,
  size = "small",
  showSlots = false,
}: {
  sets: readonly CardSet[]
  wildRank: Rank
  size?: keyof typeof SIZES
  showSlots?: boolean
}) {
  const style = SIZES[size]
  const slots = showSlots ? Math.max(0, SETS_TO_WIN - sets.length) : 0
  return (
    <ul className="flex flex-wrap items-end gap-2">
      {sets.map((set) => (
        <li
          key={set.join("-")}
          role="img"
          aria-label={`Trinca ${setLabel(setRankOf(set, wildRank))}: ${set.map(cardName).join(", ")}`}
          className="flex"
        >
          {set.map((card, position) => (
            <m.div
              key={card}
              layoutId={trincaCardLayoutId(card)}
              className={cn(position > 0 && style.overlap)}
            >
              <CardFace card={card} size="pile" className={style.card} />
            </m.div>
          ))}
        </li>
      ))}
      {Array.from({ length: slots }, (_, slot) => (
        <li
          key={`vaga-${slot}`}
          aria-hidden
          className={cn(
            "rounded-lg border-2 border-dashed border-felt-line/70",
            style.slot
          )}
        />
      ))}
    </ul>
  )
}
