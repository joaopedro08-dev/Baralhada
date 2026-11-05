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

function DeckPile({ size }: { size: number }) {
  return (
    <div
      role="img"
      aria-label={`Baralho de compra: ${plural(size, "carta", "cartas")}`}
      data-anchor={DECK_ANCHOR}
      data-deck={size}
      className="relative block aspect-[5/7] w-full rounded-lg"
    >
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
    </div>
  )
}

export function TableZone({
  game,
  selection,
  focus,
  isMyTurn,
  onToggleCard,
}: {
  game: GameState
  selection: Selection
  focus: HintFocus
  isMyTurn: boolean
  onToggleCard: (card: Card) => void
}) {
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
          <DeckPile size={game.deckSize} />
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
