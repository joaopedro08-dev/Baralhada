"use client"

import { AnimatePresence, m } from "framer-motion"
import { Sparkles } from "lucide-react"

import { CardBack, CardFace } from "@/components/game/cards/card-face"
import { BetControls } from "@/components/game/poker/bet-controls"
import { ChipCount } from "@/components/game/poker/chips"
import { cardName } from "@/lib/game/domain/cards"
import { playerOf } from "@/lib/game/domain/poker/guide"
import type {
  HandSummary,
  PokerAction,
  PokerHints,
  PokerState,
} from "@/lib/game/domain/poker/types"
import type { Card, PlayerId } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

function HoleCards({
  cards,
  dealKey,
  folded,
  highlight,
}: {
  cards: readonly Card[]
  dealKey: number
  folded: boolean
  highlight: readonly Card[] | null
}) {
  if (cards.length === 0) {
    return (
      <span className="flex -space-x-5 opacity-40">
        <CardBack className="h-[4.75rem] w-14" />
        <CardBack className="h-[4.75rem] w-14" />
      </span>
    )
  }
  return (
    <ul
      aria-label={`Suas cartas: ${cards.map(cardName).join(" e ")}`}
      className="flex -space-x-4"
    >
      {cards.map((card, index) => (
        <m.li
          key={`${dealKey}-${card}`}
          initial={{ y: -90, x: 40, rotate: -25, opacity: 0 }}
          animate={{
            y: highlight?.includes(card) ? -6 : 0,
            x: 0,
            rotate: index === 0 ? -5 : 5,
            opacity: 1,
          }}
          transition={{
            delay: 0.15 + index * 0.15,
            type: "spring",
            stiffness: 260,
            damping: 20,
          }}
        >
          <CardFace
            card={card}
            size="hand"
            className={cn(
              "shadow-lg transition-opacity",
              folded && "opacity-40 grayscale",
              highlight?.includes(card) && "hint-best"
            )}
          />
        </m.li>
      ))}
    </ul>
  )
}

export function PokerDock({
  game,
  viewerId,
  hints,
  held,
  busy,
  paused,
  refusal,
  onAction,
}: {
  game: PokerState
  viewerId: PlayerId
  hints: PokerHints | null
  held: HandSummary | null
  busy: boolean
  paused: boolean
  refusal: string | null
  onAction: (action: PokerAction) => void
}) {
  const me = playerOf(game, viewerId)
  const shown = held?.shown.find((hand) => hand.playerId === viewerId)
  const myTurn =
    !held &&
    game.pending === null &&
    game.currentPlayerId === viewerId &&
    game.endReason === null
  const [current, outs] = hints?.sentences ?? []
  const folded = me?.status === "folded"

  return (
    <section
      aria-label="Suas cartas e ações"
      className={cn(
        "flex flex-col gap-2 border-t border-felt-line bg-felt-deep px-3 pt-2 pb-3 lg:col-start-1 lg:row-start-2",
        myTurn && "border-t-2 border-t-gold"
      )}
    >
      <div className="flex items-center gap-3">
        <HoleCards
          cards={game.hole}
          dealKey={game.handNumber}
          folded={folded}
          highlight={shown?.cards ?? null}
        />
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-xs text-felt-muted">
            Suas fichas{" "}
            <ChipCount
              value={me?.chips ?? 0}
              className="font-heading text-base font-extrabold text-gold"
            />
          </p>
          <AnimatePresence mode="wait">
            {current && !held && (
              <m.p
                key={current}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 8 }}
                className="flex items-center gap-1 text-sm font-semibold"
              >
                <Sparkles aria-hidden className="size-4 shrink-0 text-gold" />
                <span className="min-w-0">{current}</span>
              </m.p>
            )}
          </AnimatePresence>
          {outs && !held && (
            <p className="text-xs leading-snug text-felt-muted">{outs}</p>
          )}
        </div>
      </div>
      {!held && (
        <BetControls
          game={game}
          viewerId={viewerId}
          busy={busy}
          paused={paused}
          refusal={refusal}
          onAction={onAction}
        />
      )}
      {held && (
        <p role="status" className="py-3 text-center text-sm text-felt-muted">
          Próxima mão em instantes...
        </p>
      )}
    </section>
  )
}
