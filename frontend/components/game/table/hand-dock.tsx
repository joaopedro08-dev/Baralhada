"use client"

import { AnimatePresence, m } from "framer-motion"

import { RefusalMessage } from "@/components/game/refusal-message"
import { ActionBar } from "@/components/game/table/action-bar"
import { SelectableCard } from "@/components/game/table/selectable-card"
import { sortCards } from "@/lib/game/domain/cards"
import { handCardHint } from "@/lib/game/domain/hint-focus"
import type { HintFocus } from "@/lib/game/domain/hint-focus"
import type { Selection } from "@/lib/game/domain/selection"
import { HAND_ANCHOR } from "@/lib/game/domain/table-changes"
import type {
  Card,
  GameState,
  PlayerId,
  TurnActionKind,
} from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const FAN_DEGREES = 3

const fanTilt = (position: number, total: number): number =>
  (position - (total - 1) / 2) * FAN_DEGREES

export function HandDock({
  game,
  viewerId,
  selection,
  focus,
  isMyTurn,
  busy,
  guide,
  refusal,
  suggested,
  onToggleCard,
  onAction,
}: {
  game: GameState
  viewerId: PlayerId
  selection: Selection
  focus: HintFocus
  isMyTurn: boolean
  busy: boolean
  guide: string
  refusal: { readonly id: number; readonly message: string } | null
  suggested: TurnActionKind | null
  onToggleCard: (card: Card) => void
  onAction: (kind: TurnActionKind) => void
}) {
  const cards = sortCards(game.hand)

  return (
    <section
      aria-label="Sua mão e ações"
      className={cn(
        "flex min-w-0 flex-col gap-2 overflow-hidden border-t border-felt-line bg-felt-deep p-3 transition-colors lg:col-start-1 lg:row-start-2 short:col-start-2 short:row-start-1 short:overflow-y-auto short:border-t-0 short:border-l",
        isMyTurn &&
          "border-t-2 border-t-gold short:border-t-0 short:border-l-2 short:border-l-gold"
      )}
    >
      <div className="min-h-10">
        {refusal ? (
          <m.div
            key={refusal.id}
            animate={{ x: [0, -7, 7, -5, 5, 0] }}
            transition={{ duration: 0.35 }}
          >
            <RefusalMessage>{refusal.message}</RefusalMessage>
          </m.div>
        ) : (
          <AnimatePresence mode="wait" initial={false}>
            <m.p
              key={guide}
              aria-live="polite"
              initial={{ opacity: 0, y: 4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.12 }}
              className="text-sm font-medium text-balance lg:text-center lg:text-base"
            >
              {guide}
            </m.p>
          </AnimatePresence>
        )}
      </div>

      <ul
        aria-label="Sua mão"
        data-anchor={HAND_ANCHOR}
        className="flex min-h-[4.75rem] max-w-full flex-wrap items-end justify-center gap-1.5 overflow-x-auto px-1 pt-1 sm:gap-2"
      >
        {cards.map((card, position) => (
          <m.li key={card} layout="position">
            <div data-deal>
              <SelectableCard
                card={card}
                size="hand"
                selected={selection.card === card}
                hint={handCardHint(focus, card)}
                tilt={fanTilt(position, cards.length)}
                onToggle={isMyTurn ? () => onToggleCard(card) : undefined}
              />
            </div>
          </m.li>
        ))}
        {cards.length === 0 && (
          <li className="self-center text-sm text-felt-muted">
            Sua mão está vazia.
          </li>
        )}
      </ul>

      <ActionBar
        game={game}
        viewerId={viewerId}
        isMyTurn={isMyTurn}
        busy={busy}
        suggested={suggested}
        onAction={onAction}
      />
    </section>
  )
}
