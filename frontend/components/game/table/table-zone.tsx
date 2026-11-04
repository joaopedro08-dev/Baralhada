"use client"

import { m } from "framer-motion"

import { CardBack } from "@/components/game/cards/card-face"
import { SelectableCard } from "@/components/game/table/selectable-card"
import { plural, sortCards } from "@/lib/game/domain/cards"
import { tableCardHint } from "@/lib/game/domain/hint-focus"
import type { HintFocus } from "@/lib/game/domain/hint-focus"
import type { Selection } from "@/lib/game/domain/selection"
import { DECK_ANCHOR, TABLE_ANCHOR } from "@/lib/game/domain/table-changes"
import type { Card, GameState } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

function DeckPile({
  size,
  suggested,
  onDraw,
}: {
  size: number
  suggested: boolean
  onDraw?: () => void
}) {
  const label = `Monte: ${plural(size, "carta", "cartas")}`
  const pile = (
    <>
      {size === 0 && (
        <span className="absolute inset-0 rounded-lg border-2 border-dashed border-felt-line" />
      )}
      {size > 0 && (
        <CardBack className="absolute inset-0 translate-x-1 translate-y-1" />
      )}
      {size > 0 && (
        <CardBack className="absolute inset-0 translate-x-0.5 translate-y-0.5" />
      )}
      {size > 0 && <CardBack className="absolute inset-0" />}
      <span className="absolute inset-x-0 bottom-1 text-center font-heading text-sm font-bold text-white tabular-nums lg:text-lg">
        {size}
      </span>
    </>
  )
  const body = cn(
    "relative block aspect-[5/7] w-full rounded-lg",
    suggested && "hint-best"
  )

  return (
    <div data-anchor={DECK_ANCHOR} data-deck={size}>
      {onDraw ? (
        <button
          type="button"
          aria-label={`${label}. Toque para comprar.`}
          onClick={onDraw}
          className={cn(
            body,
            "transition-transform outline-none hover:-translate-y-0.5 focus-visible:ring-[3px] focus-visible:ring-sky-400 active:scale-95"
          )}
        >
          {pile}
        </button>
      ) : (
        <div role="img" aria-label={label} className={body}>
          {pile}
        </div>
      )}
    </div>
  )
}

export function TableZone({
  game,
  selection,
  focus,
  isMyTurn,
  onDraw,
  onToggleCard,
}: {
  game: GameState
  selection: Selection
  focus: HintFocus
  isMyTurn: boolean
  onDraw: () => void
  onToggleCard: (card: Card) => void
}) {
  const canDraw = isMyTurn && game.usedActions.length === 0 && game.deckSize > 0

  return (
    <section
      aria-labelledby="titulo-mesa"
      data-anchor={TABLE_ANCHOR}
      className="felt-table flex flex-col gap-3 rounded-2xl p-2.5 ring-1 ring-felt-line"
    >
      <h2 id="titulo-mesa" className="font-heading text-sm font-semibold">
        Mesa ({game.table.length})
      </h2>
      <ul
        data-zone="table"
        className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5 lg:grid-cols-[repeat(auto-fill,minmax(4.25rem,5.25rem))] lg:gap-2"
      >
        <li>
          <DeckPile
            size={game.deckSize}
            suggested={focus.best.draw}
            onDraw={canDraw ? onDraw : undefined}
          />
        </li>
        {sortCards(game.table).map((card) => (
          <m.li key={card} layout="position">
            <div data-deal>
              <SelectableCard
                card={card}
                size="table"
                selected={selection.tableCards.includes(card)}
                hint={tableCardHint(focus, card)}
                onToggle={isMyTurn ? () => onToggleCard(card) : undefined}
              />
            </div>
          </m.li>
        ))}
      </ul>
    </section>
  )
}
