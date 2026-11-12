"use client"

import { useState } from "react"
import { LayoutGroup, m } from "framer-motion"
import { Hand, Layers, Sparkles, Trash2 } from "lucide-react"

import { CardFace, SuitIcon } from "@/components/game/cards/card-face"
import { GameButton } from "@/components/game/game-button"
import { RefusalMessage } from "@/components/game/refusal-message"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cardName, suitOf } from "@/lib/game/domain/cards"
import {
  describeNextStep,
  isWildCard,
  meldTitle,
} from "@/lib/game/domain/cacheta/guide"
import { arrangeHand } from "@/lib/game/domain/cacheta/hand"
import type { HandGroup, HandOrder } from "@/lib/game/domain/cacheta/hand"
import type {
  CachetaAction,
  CachetaHints,
  CachetaState,
} from "@/lib/game/domain/cacheta/types"
import type { Card, PlayerId } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

interface Picked {
  readonly turn: number
  readonly key: string
}

const ORDERS: readonly { readonly value: HandOrder; readonly label: string }[] =
  [
    { value: "naipe", label: "Naipe" },
    { value: "valor", label: "Valor" },
    { value: "jogos", label: "Jogos" },
  ]

function HandCard({
  card,
  wild,
  fresh,
  picked,
  ready,
  suggested,
  disabled,
  onToggle,
}: {
  card: Card
  wild: boolean
  fresh: boolean
  picked: boolean
  ready: boolean
  suggested: boolean
  disabled: boolean
  onToggle: () => void
}) {
  const notes = [
    wild && "coringa",
    fresh && "carta nova",
    ready && "em jogo",
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
        "relative block rounded-lg transition-transform outline-none focus-visible:ring-[3px] focus-visible:ring-sky-400 disabled:cursor-default",
        picked && "-translate-y-4"
      )}
    >
      <CardFace
        card={card}
        size="hand"
        className={cn(
          "h-[4.25rem] w-12 sm:h-24 sm:w-[4.25rem] lg:h-28 lg:w-20",
          ready && "hint-best",
          suggested && "hint-possible",
          wild && "shadow-[0_0_14px_var(--gold)] ring-2 ring-gold/80",
          picked && "ring-[3px] ring-gold"
        )}
      />
      <SuitIcon
        suit={suitOf(card)}
        className="absolute top-6 left-1.5 size-3.5 sm:top-7 sm:size-4 lg:top-8"
      />
      {wild && (
        <span className="absolute inset-x-0.5 bottom-0.5 rounded bg-gold py-0.5 text-center text-[0.6rem] leading-none font-bold text-gold-foreground">
          coringa
        </span>
      )}
      {fresh && (
        <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-sky-400 px-1.5 py-0.5 text-[0.6rem] leading-none font-bold text-sky-950 shadow">
          nova
        </span>
      )}
    </button>
  )
}

const groupGap = (group: HandGroup, first: boolean) => {
  if (first) return ""
  return group.kind === "meld" ? "ml-0.5 sm:ml-4" : "-ml-3 sm:ml-2"
}

export function CachetaHand({
  game,
  viewerId,
  hints,
  hintsOn,
  busy,
  refusal,
  onAction,
}: {
  game: CachetaState
  viewerId: PlayerId
  hints: CachetaHints | null
  hintsOn: boolean
  busy: boolean
  refusal: string | null
  onAction: (action: CachetaAction) => void
}) {
  const [order, setOrder] = useState<HandOrder>("naipe")
  const [picked, setPicked] = useState<Picked | null>(null)
  const { moves } = game
  const myTurn =
    game.currentPlayerId === viewerId &&
    game.pending === null &&
    game.endReason === null
  const ready = hints?.ready ?? []
  const shownOrder = order === "jogos" && !hintsOn ? "naipe" : order
  const groups = arrangeHand(game.hand, shownOrder, game.wildRank, ready)
  const slots = groups.flatMap((group) => group.slots)
  const readyKeys = new Set(
    groups
      .filter((group) => group.kind === "meld")
      .flatMap((group) => group.slots.map((slot) => slot.key))
  )
  const freshKey =
    myTurn && game.drawnCard
      ? slots.findLast((slot) => slot.card === game.drawnCard)?.key
      : undefined
  const selected =
    picked?.turn === game.turnNumber
      ? slots.find((slot) => slot.key === picked.key)
      : undefined
  const knock = hints?.knock ?? null
  const discardHint = hints?.suggestions.find(
    (suggestion) => suggestion.action.type === "discard"
  )?.action
  const pickHint = hints?.suggestions.find(
    (suggestion) =>
      suggestion.action.type === "draw" || suggestion.action.type === "take"
  )
  const knockingWith = selected?.card ?? knock?.discard ?? null

  const toggle = (key: string) =>
    setPicked(selected?.key === key ? null : { turn: game.turnNumber, key })

  const status =
    selected && myTurn
      ? `${cardName(selected.card)} escolhida.`
      : describeNextStep(game, viewerId)

  return (
    <section
      aria-label="Sua mão e ações"
      className={cn(
        "flex min-w-0 flex-col gap-2 overflow-hidden border-t border-felt-line bg-felt-deep p-3 lg:col-start-1 lg:row-start-2",
        myTurn && "border-t-2 border-t-gold"
      )}
    >
      <div className="flex min-h-10 flex-wrap items-center justify-between gap-2">
        {refusal ? (
          <RefusalMessage>{refusal}</RefusalMessage>
        ) : (
          <p
            aria-live="polite"
            className="min-w-0 flex-1 text-sm font-medium text-balance lg:text-base"
          >
            {status}
          </p>
        )}
        {game.hand.length > 0 && (
          <ToggleGroup
            type="single"
            size="sm"
            variant="outline"
            spacing={0}
            value={shownOrder}
            onValueChange={(value) => value && setOrder(value as HandOrder)}
            aria-label="Organizar a mão"
            className="shrink-0"
          >
            {ORDERS.map((option) => (
              <ToggleGroupItem
                key={option.value}
                value={option.value}
                disabled={option.value === "jogos" && !hintsOn}
                className="h-8 border-felt-line px-2.5 text-xs data-[state=on]:bg-gold data-[state=on]:text-gold-foreground"
              >
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}
      </div>

      <LayoutGroup>
        <ul
          aria-label="Sua mão"
          className="flex min-h-[5.25rem] flex-wrap items-end justify-center gap-y-5 pt-4"
        >
          {groups.map((group, groupIndex) => (
            <li
              key={group.key}
              className={cn(
                "relative flex items-end",
                groupGap(group, groupIndex === 0)
              )}
            >
              {group.meld && (
                <span className="absolute -bottom-4 left-0 w-full truncate text-center text-[0.65rem] font-semibold text-gold">
                  {meldTitle(group.meld)}
                </span>
              )}
              <ul className="flex items-end">
                {group.slots.map((slot, index) => (
                  <m.li
                    key={slot.key}
                    layout
                    layoutId={`cacheta-${slot.key}`}
                    initial={{ y: 40, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    className={cn(index > 0 && "-ml-6 sm:-ml-7 lg:-ml-9")}
                  >
                    <HandCard
                      card={slot.card}
                      wild={isWildCard(slot.card, game.wildRank)}
                      fresh={slot.key === freshKey}
                      picked={slot.key === selected?.key}
                      ready={readyKeys.has(slot.key)}
                      suggested={
                        discardHint?.type === "discard" &&
                        discardHint.card === slot.card
                      }
                      disabled={!myTurn || !moves.discard || busy}
                      onToggle={() => toggle(slot.key)}
                    />
                  </m.li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </LayoutGroup>

      {myTurn && moves.draw && (
        <div className="flex flex-wrap gap-2 sm:justify-center">
          <GameButton
            tone={pickHint?.action.type === "draw" ? "gold" : "felt"}
            disabled={busy}
            onClick={() => onAction({ type: "draw" })}
            className="flex-1 sm:flex-none"
          >
            <Layers aria-hidden />
            Comprar do monte
          </GameButton>
          <GameButton
            tone={pickHint?.action.type === "take" ? "gold" : "felt"}
            disabled={busy || !moves.take}
            onClick={() => onAction({ type: "take" })}
            className="flex-1 sm:flex-none"
          >
            <Hand aria-hidden />
            {game.discardTop ? `Pegar ${cardName(game.discardTop)}` : "Pegar"}
          </GameButton>
        </div>
      )}

      {myTurn && moves.discard && (
        <div className="flex flex-wrap gap-2 sm:justify-center">
          <GameButton
            disabled={busy || !selected}
            onClick={() =>
              selected && onAction({ type: "discard", card: selected.card })
            }
            className="flex-1 sm:flex-none"
          >
            <Trash2 aria-hidden />
            Descartar
          </GameButton>
          <GameButton
            tone={knock ? "gold" : "felt"}
            disabled={busy || !knockingWith}
            onClick={() =>
              knockingWith && onAction({ type: "knock", card: knockingWith })
            }
            className={cn(
              "flex-1 sm:flex-none",
              knock && "animate-[suggest-pulse_1.6s_ease-in-out_infinite]"
            )}
          >
            <Sparkles aria-hidden />
            {knockingWith
              ? `Bater ${knock?.clean && knockingWith === knock.discard ? "limpo " : ""}descartando ${cardName(knockingWith)}`
              : "Bater"}
          </GameButton>
        </div>
      )}
    </section>
  )
}
