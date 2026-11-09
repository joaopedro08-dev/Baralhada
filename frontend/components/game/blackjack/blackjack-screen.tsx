"use client"

import { useState } from "react"
import { m } from "framer-motion"

import { BlackjackDock } from "@/components/game/blackjack/blackjack-dock"
import { BlackjackMenu } from "@/components/game/blackjack/blackjack-menu"
import { BlackjackSeatPanel } from "@/components/game/blackjack/blackjack-seat"
import { DealerZone } from "@/components/game/blackjack/dealer-zone"
import { RoundBanner } from "@/components/game/blackjack/round-banner"
import { HistoryList } from "@/components/game/table/history-list"
import { MatchCountdown } from "@/components/game/table/match-countdown"
import { MatchHeader } from "@/components/game/table/match-header"
import { useSecondsLeft } from "@/components/game/table/turn-timer"
import { useActionCommands } from "@/components/game/table/use-action-commands"
import { useHints } from "@/components/game/table/use-hints"
import {
  describeTurn,
  nicknameOf,
  resultOf,
} from "@/lib/game/domain/blackjack/guide"
import type {
  BlackjackAction,
  BlackjackState,
} from "@/lib/game/domain/blackjack/types"
import type { RoomState } from "@/lib/game/domain/types"

export function BlackjackScreen({
  room,
  game,
}: {
  room: RoomState
  game: BlackjackState
}) {
  const myTurn =
    game.currentPlayerId === room.viewerId &&
    (game.moves.hit || !!game.moves.insurance)
  const { enabled, setEnabled, hints } = useHints(room, myTurn, "blackjack")
  const commands = useActionCommands<BlackjackAction>(game.turnNumber)
  const secondsToStart = useSecondsLeft(room.matchStartsAt, room.pausedAt) ?? 0
  const [lastBet, setLastBet] = useState<number | null>(null)
  const others = game.players.filter((seat) => seat.id !== room.viewerId)
  const actorId = game.currentPlayerId ?? room.viewerId
  const [lastEvent] = game.history

  const perform = (action: BlackjackAction) => {
    if (action.type === "bet") setLastBet(action.amount)
    commands.perform(action)
  }

  return (
    <div className="flex h-dvh flex-col">
      <MatchHeader
        room={room}
        actorId={actorId}
        actorName={nicknameOf(game, actorId)}
        title={describeTurn(game, room.viewerId)}
        highlight={myTurn || game.moves.bet !== null}
        lastEvent={lastEvent}
        menu={
          <BlackjackMenu
            room={room}
            game={game}
            hints={hints}
            hintsEnabled={enabled}
            onHintsChange={setEnabled}
          />
        }
      />

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_20rem]">
        <m.main
          layoutScroll
          tabIndex={0}
          className="flex min-h-0 flex-col gap-3 overflow-x-hidden overflow-y-auto p-3 lg:col-start-1 lg:row-start-1"
        >
          <DealerZone game={game} />
          <RoundBanner
            result={resultOf(game)}
            viewerId={room.viewerId}
            finalChips={
              game.endReason === null
                ? null
                : (game.players.find((seat) => seat.id === room.viewerId)
                    ?.chips ?? 0)
            }
          />
          {others.length > 0 && (
            <section aria-label="Outros jogadores" className="shrink-0">
              <ul className="grid grid-cols-[repeat(auto-fit,minmax(11rem,1fr))] gap-2">
                {others.map((seat) => (
                  <BlackjackSeatPanel
                    key={seat.id}
                    seat={seat}
                    game={game}
                    connected={
                      room.players.find((player) => player.id === seat.id)
                        ?.connected ?? false
                    }
                  />
                ))}
              </ul>
            </section>
          )}
        </m.main>

        <BlackjackDock
          game={game}
          viewerId={room.viewerId}
          hints={hints}
          busy={commands.busy}
          refusal={commands.refusal}
          lastBet={lastBet}
          onAction={perform}
        />

        <aside
          aria-label="Histórico da partida"
          className="hidden min-h-0 overflow-y-auto border-l border-felt-line bg-felt-deep p-3 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block [&_.text-muted-foreground]:text-felt-muted"
        >
          <h2 className="mb-2 font-heading text-sm font-semibold">
            Histórico da partida
          </h2>
          <HistoryList history={game.history} />
        </aside>
      </div>

      {secondsToStart > 0 && <MatchCountdown seconds={secondsToStart} />}
    </div>
  )
}
