"use client"

import { useState } from "react"
import { m } from "framer-motion"
import { Check, EyeOff, Flag, Megaphone, Play } from "lucide-react"

import {
  CardBack,
  CardFace,
  CARD_SIZES,
} from "@/components/game/cards/card-face"
import { GameButton } from "@/components/game/game-button"
import { RefusalMessage } from "@/components/game/refusal-message"
import { FoldButton } from "@/components/game/truco/fold-button"
import { ShowHandPrompt } from "@/components/game/truco/show-hand-prompt"
import type { TablePace } from "@/components/game/truco/use-table-pace"
import { playedCardLayoutId } from "@/components/game/truco/truco-table"
import { Toggle } from "@/components/ui/toggle"
import { cardName } from "@/lib/game/domain/cards"
import { isManilha, sortByStrength } from "@/lib/game/domain/truco/cards"
import { describeNextStep, raiseLabel } from "@/lib/game/domain/truco/guide"
import type { TrucoAction, TrucoState } from "@/lib/game/domain/truco/types"
import type { Card } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const sameAction = (a: TrucoAction | null, b: TrucoAction): boolean =>
  a !== null && JSON.stringify(a) === JSON.stringify(b)

function HandCard({
  card,
  manilha,
  suggested,
  covering,
  disabled,
  onPlay,
}: {
  card: Card
  manilha: boolean
  suggested: boolean
  covering: boolean
  disabled: boolean
  onPlay?: () => void
}) {
  const label = `${cardName(card)}${manilha ? ", manilha" : ""}${suggested ? ", jogada sugerida" : ""}`
  const face = (
    <m.div layoutId={playedCardLayoutId(card)} className="relative">
      <CardFace
        card={card}
        size="hand"
        className={cn(
          suggested && "hint-best",
          manilha && "ring-2 ring-gold",
          covering && "opacity-70"
        )}
      />
      {covering && (
        <span className="absolute inset-x-1 bottom-1 flex items-center justify-center gap-1 rounded bg-black/75 py-0.5 text-[0.65rem] font-bold text-white">
          <EyeOff aria-hidden className="size-3" />
          escondida
        </span>
      )}
    </m.div>
  )
  if (!onPlay) {
    return (
      <div role="img" aria-label={label}>
        {face}
      </div>
    )
  }
  return (
    <button
      type="button"
      aria-label={covering ? `Jogar escondida: ${label}` : `Jogar ${label}`}
      disabled={disabled}
      onClick={onPlay}
      className={cn(
        "block rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-sky-400 active:scale-95 disabled:opacity-65",
        CARD_SIZES.hand.box
      )}
    >
      {face}
    </button>
  )
}

function DecisionButtons({
  game,
  busy,
  suggested,
  onAction,
}: {
  game: TrucoState
  busy: boolean
  suggested: TrucoAction | null
  onAction: (action: TrucoAction) => void
}) {
  const { moves } = game
  const tone = (action: TrucoAction) =>
    sameAction(suggested, action) ? "gold" : "felt"
  if (moves.decideEleven) {
    return (
      <div className="grid grid-cols-2 gap-2">
        <GameButton
          tone={tone({ type: "accept" })}
          disabled={busy}
          onClick={() => onAction({ type: "accept" })}
        >
          <Play aria-hidden />
          Jogar a mão
        </GameButton>
        <GameButton
          tone={tone({ type: "run" })}
          disabled={busy}
          onClick={() => onAction({ type: "run" })}
        >
          <Flag aria-hidden />
          Correr
        </GameButton>
      </div>
    )
  }
  return (
    <div
      className={cn(
        "grid gap-2",
        moves.raiseTo === null ? "grid-cols-2" : "grid-cols-3"
      )}
    >
      <GameButton
        tone={tone({ type: "accept" })}
        disabled={busy}
        onClick={() => onAction({ type: "accept" })}
      >
        <Check aria-hidden />
        Aceitar
      </GameButton>
      <GameButton
        tone={tone({ type: "run" })}
        disabled={busy}
        onClick={() => onAction({ type: "run" })}
      >
        <Flag aria-hidden />
        Correr
      </GameButton>
      {moves.raiseTo !== null && (
        <GameButton
          tone={tone({ type: "raise" })}
          disabled={busy}
          onClick={() => onAction({ type: "raise" })}
        >
          <Megaphone aria-hidden />
          {raiseLabel(moves.raiseTo)}
        </GameButton>
      )}
    </div>
  )
}

function PlayToolbar({
  game,
  busy,
  suggested,
  covering,
  onCoveringChange,
  onAction,
}: {
  game: TrucoState
  busy: boolean
  suggested: TrucoAction | null
  covering: boolean
  onCoveringChange: (covering: boolean) => void
  onAction: (action: TrucoAction) => void
}) {
  const { moves } = game
  const raiseTo = moves.play ? moves.raiseTo : null
  return (
    <div className="flex flex-wrap gap-2 sm:justify-center">
      {raiseTo !== null && (
        <GameButton
          tone={sameAction(suggested, { type: "raise" }) ? "gold" : "felt"}
          disabled={busy}
          onClick={() => onAction({ type: "raise" })}
          className="flex-1 sm:flex-none"
        >
          <Megaphone aria-hidden />
          {raiseLabel(raiseTo)}
        </GameButton>
      )}
      {!game.blind && (
        <>
          <Toggle
            variant="outline"
            pressed={covering}
            disabled={!moves.cover || busy}
            onPressedChange={onCoveringChange}
            aria-describedby="esconder-explicacao"
            className="h-11 flex-1 gap-2 border-felt-line bg-felt-deep px-3 text-sm text-felt-foreground hover:bg-felt-line/40 aria-pressed:bg-gold aria-pressed:text-gold-foreground aria-pressed:hover:bg-gold/85 sm:flex-none"
          >
            <EyeOff aria-hidden className="size-4" />
            Esconder carta
          </Toggle>
          <span id="esconder-explicacao" className="sr-only">
            A carta escondida vale menos que todas as outras. Disponível a
            partir da segunda rodada, na sua vez.
          </span>
        </>
      )}
      <FoldButton
        stake={game.stake}
        enabled={moves.fold}
        busy={busy}
        onFold={() => onAction({ type: "run" })}
      />
    </div>
  )
}

export function TrucoHand({
  game,
  busy,
  pace,
  refusal,
  suggested,
  onAction,
}: {
  game: TrucoState
  busy: boolean
  pace: TablePace
  refusal: string | null
  suggested: TrucoAction | null
  onAction: (action: TrucoAction) => void
}) {
  const [coverTurn, setCoverTurn] = useState<number | null>(null)
  const canPlay = game.moves.play
  const covering = game.moves.cover && coverTurn === game.turnNumber
  const cards = sortByStrength(game.hand, game.manilha)
  const deciding = game.moves.answer || game.moves.decideEleven
  const acting = canPlay || deciding
  const locked = busy || pace.paused
  const offering = pace.dealing && game.canShowHand

  const playCard = (card: Card) =>
    onAction(covering ? { type: "cover", card } : { type: "play", card })

  return (
    <section
      aria-label="Sua mão e ações"
      className={cn(
        "flex flex-col gap-2 border-t border-felt-line bg-felt-deep p-3 lg:col-start-1 lg:row-start-2",
        acting && "border-t-2 border-t-gold"
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
            {pace.dealing
              ? "Embaralhando a próxima mão..."
              : covering
                ? "Carta escondida: toque na carta que vai virada para baixo."
                : describeNextStep(game)}
          </p>
        )}
      </div>

      {offering ? (
        <ShowHandPrompt
          game={game}
          until={pace.until}
          busy={busy}
          onShow={() => onAction({ type: "show" })}
        />
      ) : (
        <ul
          aria-label="Sua mão"
          className="flex min-h-[4.75rem] max-w-full items-end justify-start gap-2 overflow-x-auto px-2 sm:justify-center"
        >
          {pace.dealing
            ? null
            : game.blind
              ? Array.from({ length: game.handSize }, (_, slot) => (
                  <li key={slot}>
                    <button
                      type="button"
                      aria-label={`Jogar a carta virada ${slot + 1}`}
                      disabled={!canPlay || locked}
                      onClick={() => onAction({ type: "playBlind", slot })}
                      className={cn(
                        "block rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-sky-400 disabled:opacity-65",
                        CARD_SIZES.hand.box
                      )}
                    >
                      <CardBack className="size-full" />
                    </button>
                  </li>
                ))
              : cards.map((card, position) => (
                  <m.li
                    key={card}
                    initial={{ y: 48, opacity: 0, rotate: -8 }}
                    animate={{
                      y: covering ? -6 : 0,
                      opacity: 1,
                      rotate: (position - (cards.length - 1) / 2) * 3,
                    }}
                    whileHover={
                      canPlay ? { y: -10, rotate: 0, scale: 1.06 } : undefined
                    }
                    transition={{
                      type: "spring",
                      stiffness: 320,
                      damping: 20,
                      delay: position * 0.07,
                    }}
                  >
                    <HandCard
                      card={card}
                      manilha={isManilha(card, game.manilha)}
                      suggested={sameAction(suggested, { type: "play", card })}
                      covering={covering}
                      disabled={locked}
                      onPlay={canPlay ? () => playCard(card) : undefined}
                    />
                  </m.li>
                ))}
          {!pace.dealing && !game.blind && cards.length === 0 && (
            <li className="self-center text-sm text-felt-muted">
              Sua mão está vazia.
            </li>
          )}
        </ul>
      )}

      {deciding ? (
        <DecisionButtons
          game={game}
          busy={locked}
          suggested={suggested}
          onAction={onAction}
        />
      ) : (
        <PlayToolbar
          game={game}
          busy={locked}
          suggested={suggested}
          covering={covering}
          onCoveringChange={(on) => setCoverTurn(on ? game.turnNumber : null)}
          onAction={onAction}
        />
      )}
    </section>
  )
}
