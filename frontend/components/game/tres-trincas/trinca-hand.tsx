"use client"

import { useState } from "react"
import { m } from "framer-motion"
import { ArrowDownToLine, Layers, Sparkles, Trash2 } from "lucide-react"

import { CardFace } from "@/components/game/cards/card-face"
import { GameButton } from "@/components/game/game-button"
import { RefusalMessage } from "@/components/game/refusal-message"
import { trincaCardLayoutId } from "@/components/game/tres-trincas/melded-sets"
import { cardName, plural } from "@/lib/game/domain/cards"
import {
  describeNextStep,
  meldLabel,
  meldSizeFits,
} from "@/lib/game/domain/tres-trincas/guide"
import { groupHand } from "@/lib/game/domain/tres-trincas/hand"
import type {
  CardRole,
  TresTrincasHints,
  TresTrincasState,
  TrincaAction,
} from "@/lib/game/domain/tres-trincas/types"
import type { Card, PlayerId } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

interface Picked {
  readonly turn: number
  readonly cards: readonly Card[]
}

const ROLE_TAGS: Partial<Readonly<Record<CardRole, string>>> = {
  wild: "coringa",
  dead: "morta",
}

interface HandLayout {
  readonly organized: boolean
  readonly order: readonly Card[]
  readonly roles: ReadonlyMap<Card, CardRole>
  readonly groupStarts: ReadonlySet<Card>
  readonly ready: ReadonlySet<Card>
}

const layoutOf = (
  game: TresTrincasState,
  organize: boolean,
  hints: TresTrincasHints | null
): HandLayout => {
  const ready = new Set(hints?.ready.flat() ?? [])
  if (!organize) {
    return {
      organized: false,
      order: game.hand,
      roles: new Map(),
      groupStarts: new Set(),
      ready,
    }
  }
  const groups = groupHand(game.hand, game.wildRank, game.deadRank)
  return {
    organized: true,
    order: groups.flatMap((group) => group.cards),
    roles: new Map(
      groups.flatMap((group) =>
        group.cards.map((card) => [card, group.role] as const)
      )
    ),
    groupStarts: new Set(
      groups.slice(1).flatMap((group) => group.cards.slice(0, 1))
    ),
    ready,
  }
}

const spacingOf = (layout: HandLayout, card: Card): string => {
  if (!layout.organized) return "-ml-2 sm:ml-1.5"
  return layout.groupStarts.has(card) ? "-ml-2 sm:ml-4" : "-ml-6 sm:-ml-3"
}

function HandCard({
  card,
  role,
  picked,
  ready,
  suggested,
  disabled,
  onToggle,
}: {
  card: Card
  role: CardRole | undefined
  picked: boolean
  ready: boolean
  suggested: boolean
  disabled: boolean
  onToggle: () => void
}) {
  const tag = role ? ROLE_TAGS[role] : undefined
  const notes = [
    tag,
    ready && "trinca pronta",
    suggested && "descarte sugerido",
  ]
    .filter(Boolean)
    .join(", ")
  return (
    <button
      type="button"
      aria-pressed={picked}
      aria-label={notes ? `${cardName(card)}, ${notes}` : cardName(card)}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        "relative block rounded-lg transition-transform outline-none focus-visible:ring-[3px] focus-visible:ring-sky-400 disabled:opacity-65",
        picked && "-translate-y-3"
      )}
    >
      <m.div layoutId={trincaCardLayoutId(card)}>
        <CardFace
          card={card}
          size="hand"
          className={cn(
            "h-[4.25rem] w-12 sm:h-24 sm:w-[4.25rem] lg:h-28 lg:w-20",
            ready && "hint-best",
            suggested && "hint-possible",
            role === "dead" && "opacity-75 grayscale",
            picked && "ring-[3px] ring-gold"
          )}
        />
      </m.div>
      {tag && (
        <span className="absolute inset-x-0.5 bottom-0.5 rounded bg-black/75 py-0.5 text-center text-[0.6rem] leading-none font-bold text-white">
          {tag}
        </span>
      )}
    </button>
  )
}

const sameAction = (first: TrincaAction | undefined, type: string) =>
  first?.type === type

export function TrincaHand({
  game,
  viewerId,
  organize,
  hints,
  busy,
  refusal,
  onAction,
}: {
  game: TresTrincasState
  viewerId: PlayerId
  organize: boolean
  hints: TresTrincasHints | null
  busy: boolean
  refusal: string | null
  onAction: (action: TrincaAction) => void
}) {
  const [picked, setPicked] = useState<Picked | null>(null)
  const { moves } = game
  const myTurn = game.currentPlayerId === viewerId && game.endReason === null
  const layout = layoutOf(game, organize, hints)
  const selected =
    picked?.turn === game.turnNumber
      ? picked.cards.filter((card) => game.hand.includes(card))
      : []
  const best = hints?.suggestions[0]?.action
  const suggestedMeld = hints?.suggestions.find(
    (suggestion) => suggestion.action.type === "meld"
  )
  const suggestedDiscard = hints?.suggestions.find(
    (suggestion) => suggestion.action.type === "discard"
  )?.action

  const toggle = (card: Card) =>
    setPicked({
      turn: game.turnNumber,
      cards: selected.includes(card)
        ? selected.filter((held) => held !== card)
        : [...selected, card],
    })

  const status =
    selected.length > 0 && myTurn
      ? `${plural(selected.length, "carta escolhida", "cartas escolhidas")}.`
      : describeNextStep(game, viewerId)

  return (
    <section
      aria-label="Sua mão e ações"
      className={cn(
        "flex flex-col gap-2 border-t border-felt-line bg-felt-deep p-3 lg:col-start-1 lg:row-start-2",
        myTurn && "border-t-2 border-t-gold"
      )}
    >
      <div className="min-h-10">
        {refusal ? (
          <RefusalMessage>{refusal}</RefusalMessage>
        ) : (
          <p
            aria-live="polite"
            className="text-sm font-medium text-balance lg:text-center lg:text-base"
          >
            {status}
          </p>
        )}
      </div>

      <ul
        aria-label="Sua mão"
        className="flex min-h-[4.75rem] flex-wrap items-end justify-center pt-3"
      >
        {layout.order.map((card, position) => (
          <m.li
            key={card}
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{
              type: "spring",
              stiffness: 320,
              damping: 22,
              delay: position * 0.04,
            }}
            className={cn(position > 0 && spacingOf(layout, card))}
          >
            <HandCard
              card={card}
              role={layout.roles.get(card)}
              picked={selected.includes(card)}
              ready={layout.ready.has(card)}
              suggested={
                suggestedDiscard?.type === "discard" &&
                suggestedDiscard.card === card
              }
              disabled={!myTurn || busy}
              onToggle={() => toggle(card)}
            />
          </m.li>
        ))}
        {game.hand.length === 0 && (
          <li className="self-center text-sm text-felt-muted">
            Sua mão está vazia.
          </li>
        )}
      </ul>

      {myTurn && (
        <div className="flex flex-wrap gap-2 sm:justify-center">
          {suggestedMeld && (
            <GameButton
              tone="gold"
              disabled={busy}
              onClick={() => onAction(suggestedMeld.action)}
              className="w-full sm:w-auto"
            >
              <Sparkles aria-hidden />
              {suggestedMeld.sentence.replace(/\.$/, "")}
            </GameButton>
          )}
          {moves.draw && (
            <GameButton
              tone={sameAction(best, "draw") ? "gold" : "felt"}
              disabled={busy}
              onClick={() => onAction({ type: "draw" })}
              className="flex-1 sm:flex-none"
            >
              <Layers aria-hidden />
              Comprar
            </GameButton>
          )}
          {moves.meldLimit > 0 && (
            <GameButton
              disabled={busy || !meldSizeFits(selected.length, moves.meldLimit)}
              onClick={() => onAction({ type: "meld", cards: selected })}
              className="flex-1 sm:flex-none"
            >
              <ArrowDownToLine aria-hidden />
              {meldLabel(selected.length)}
            </GameButton>
          )}
          {moves.discard && (
            <GameButton
              disabled={busy || selected.length !== 1}
              onClick={() =>
                onAction({ type: "discard", card: selected[0] as Card })
              }
              className="flex-1 sm:flex-none"
            >
              <Trash2 aria-hidden />
              Descartar
            </GameButton>
          )}
        </div>
      )}
    </section>
  )
}
