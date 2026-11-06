"use client"

import { AnimatePresence, m } from "framer-motion"

import { ChipStack } from "@/components/game/poker/chips"
import { CommunityBoard } from "@/components/game/poker/community-board"
import { PokerSeat } from "@/components/game/poker/poker-seat"
import { PotDisplay } from "@/components/game/poker/pot-display"
import type { HeldHand } from "@/components/game/poker/use-hand-hold"
import { STREET_NAMES } from "@/lib/game/domain/poker/guide"
import { seatSpots } from "@/lib/game/domain/poker/seating"
import type { PokerPlayer, PokerState } from "@/lib/game/domain/poker/types"
import type { Card, RoomState } from "@/lib/game/domain/types"

const playersDuring = (
  game: PokerState,
  held: HeldHand | null
): readonly PokerPlayer[] => {
  if (!held) return game.players
  const { winnings } = held.summary
  return held.before.players.map((player) => ({
    ...player,
    chips: player.chips + (winnings[player.id] ?? 0),
    bet: 0,
  }))
}

const winningCardsOf = (held: HeldHand | null): readonly Card[] | null => {
  if (!held?.summary.showdown) return null
  const winnerId = held.summary.pots[0]?.winnerIds[0]
  return (
    held.summary.shown.find((hand) => hand.playerId === winnerId)?.cards ?? null
  )
}

const uncollectedTotal = (game: PokerState): number | null => {
  const collected = game.pots.reduce((sum, pot) => sum + pot.amount, 0)
  return game.potTotal > collected ? game.potTotal : null
}

const stageLabel = (game: PokerState, held: HeldHand | null): string => {
  if (held) {
    return held.summary.showdown
      ? `Mão ${held.summary.number} · Showdown`
      : `Mão ${held.summary.number} · encerrada`
  }
  return `Mão ${game.handNumber} · ${STREET_NAMES[game.street]}`
}

export function PokerTable({
  room,
  game,
  held,
}: {
  room: RoomState
  game: PokerState
  held: HeldHand | null
}) {
  const players = playersDuring(game, held)
  const spots = seatSpots(
    players.map((player) => player.id),
    room.viewerId
  )
  const highlight = winningCardsOf(held)
  const shownBy = new Map(
    (held?.summary.shown ?? []).map((hand) => [hand.playerId, hand])
  )

  return (
    <div className="relative mx-auto h-full max-h-[36rem] min-h-[15rem] w-full max-w-[52rem] lg:aspect-[16/10] lg:h-auto lg:max-h-full">
      <div className="poker-felt absolute inset-x-[8%] inset-y-[13%]">
        <div className="poker-felt-line absolute inset-[7%]" />
        <span
          aria-hidden
          className="absolute inset-x-0 top-[16%] text-center font-heading text-[0.65rem] font-bold tracking-[0.4em] text-white/15 uppercase sm:text-xs"
        >
          Baralhada
        </span>
      </div>

      <div className="absolute inset-x-[16%] inset-y-[24%] flex flex-col items-center justify-center gap-1.5 sm:gap-2">
        <AnimatePresence mode="wait">
          <m.p
            key={stageLabel(game, held)}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 4 }}
            className="text-[0.65rem] font-semibold tracking-wide text-felt-muted uppercase sm:text-xs"
          >
            {stageLabel(game, held)}
          </m.p>
        </AnimatePresence>
        <CommunityBoard
          board={held ? held.summary.board : game.board}
          highlight={highlight}
        />
        <PotDisplay
          game={game}
          pots={held ? held.summary.pots : game.pots}
          total={held ? null : uncollectedTotal(game)}
        />
      </div>

      {spots.map((spot) => {
        const player = players.find((seated) => seated.id === spot.playerId)
        return (
          <div
            key={`aposta-${spot.playerId}`}
            data-bet-spot={spot.playerId}
            className="absolute flex size-8 -translate-x-1/2 -translate-y-1/2 items-center justify-center"
            style={{ left: `${spot.bet.x}%`, top: `${spot.bet.y}%` }}
          >
            <AnimatePresence>
              {player && player.bet > 0 && (
                <m.span
                  key="aposta"
                  initial={{ opacity: 0, scale: 0.4 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.4 }}
                >
                  <ChipStack amount={player.bet} />
                </m.span>
              )}
            </AnimatePresence>
          </div>
        )
      })}

      {spots.map((spot) => {
        const player = players.find((seated) => seated.id === spot.playerId)
        if (!player) return null
        return (
          <PokerSeat
            key={spot.playerId}
            game={game}
            player={player}
            spot={spot}
            isViewer={spot.playerId === room.viewerId}
            connected={
              room.players.find((seated) => seated.id === player.id)
                ?.connected ?? false
            }
            shown={shownBy.get(player.id)}
            winnings={held?.summary.winnings[player.id] ?? 0}
            highlight={highlight}
            held={held !== null}
          />
        )
      })}
    </div>
  )
}
