"use client"

import { BetPanel } from "@/components/game/blackjack/bet-panel"
import { PlayActions } from "@/components/game/blackjack/play-actions"
import { SeatHands } from "@/components/game/blackjack/seat-hands"
import { ChipCount, ChipStack } from "@/components/game/poker/chips"
import { RefusalMessage } from "@/components/game/refusal-message"
import {
  describeNextStep,
  resultsFor,
  seatOf,
} from "@/lib/game/domain/blackjack/guide"
import type {
  BlackjackAction,
  BlackjackHints,
  BlackjackState,
} from "@/lib/game/domain/blackjack/types"
import type { PlayerId } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

export function BlackjackDock({
  game,
  viewerId,
  hints,
  busy,
  refusal,
  lastBet,
  onAction,
}: {
  game: BlackjackState
  viewerId: PlayerId
  hints: BlackjackHints | null
  busy: boolean
  refusal: string | null
  lastBet: number | null
  onAction: (action: BlackjackAction) => void
}) {
  const seat = seatOf(game, viewerId)
  const myTurn = game.currentPlayerId === viewerId
  const acting = game.moves.bet !== null || myTurn
  return (
    <section
      aria-label="Sua mão e ações"
      className={cn(
        "flex flex-col gap-3 overflow-x-clip border-t border-felt-line bg-felt-deep p-3 lg:col-start-1 lg:row-start-2",
        acting && "border-t-2 border-t-gold"
      )}
    >
      <div className="flex min-h-8 flex-wrap items-center justify-between gap-2">
        {refusal ? (
          <RefusalMessage>{refusal}</RefusalMessage>
        ) : (
          <p
            aria-live="polite"
            className="min-w-0 flex-1 text-sm font-medium text-balance lg:text-base"
          >
            {describeNextStep(game, viewerId)}
          </p>
        )}
        {seat && (
          <span className="flex items-center gap-1.5 text-sm text-felt-muted">
            Suas fichas
            <ChipCount
              value={seat.chips}
              className="font-heading text-base font-bold text-gold"
            />
          </span>
        )}
      </div>

      {seat && seat.hands.length > 0 && (
        <SeatHands
          hands={seat.hands}
          round={game.round}
          results={resultsFor(game, viewerId)}
          activeIndex={myTurn ? game.handIndex : null}
          size="large"
        />
      )}

      {seat && seat.hands.length === 0 && seat.bet !== null && (
        <div className="flex justify-center">
          <ChipStack amount={seat.bet} className="scale-125" />
        </div>
      )}

      {game.moves.bet && seat && (
        <BetPanel
          key={game.round}
          range={game.moves.bet}
          chips={seat.chips}
          lastBet={lastBet}
          busy={busy}
          onBet={(amount) => onAction({ type: "bet", amount })}
        />
      )}

      {myTurn && game.moves.hit && (
        <PlayActions
          moves={game.moves}
          hints={hints}
          busy={busy}
          onAction={onAction}
        />
      )}
    </section>
  )
}
