"use client"

import { m } from "framer-motion"
import { Coins, TrendingUp } from "lucide-react"

import { ChipFlights } from "@/components/game/poker/chip-flights"
import { PokerDock } from "@/components/game/poker/poker-dock"
import { PokerMenu } from "@/components/game/poker/poker-menu"
import { PokerTable } from "@/components/game/poker/poker-table"
import { useHandHold } from "@/components/game/poker/use-hand-hold"
import { HistoryList } from "@/components/game/table/history-list"
import { LiveScore, useStateNotice } from "@/components/game/table/live-score"
import { MatchCountdown } from "@/components/game/table/match-countdown"
import { MatchHeader } from "@/components/game/table/match-header"
import { useSecondsLeft, useWaiting } from "@/components/game/table/turn-timer"
import { useActionCommands } from "@/components/game/table/use-action-commands"
import { useHints } from "@/components/game/table/use-hints"
import {
  describeBlinds,
  describeTurn,
  formatChips,
  isInHand,
  nicknameOf,
  playerOf,
} from "@/lib/game/domain/poker/guide"
import { pokerNotice } from "@/lib/game/domain/poker/notice"
import type { PokerAction, PokerState } from "@/lib/game/domain/poker/types"
import type { RoomState } from "@/lib/game/domain/types"

function BlindsStrip({ game }: { game: PokerState }) {
  return (
    <div className="flex h-8 shrink-0 items-center justify-center gap-3 border-b border-felt-line bg-felt-deep/70 px-3 text-xs text-felt-muted">
      <span className="inline-flex items-center gap-1">
        <Coins aria-hidden className="size-3.5 text-gold" />
        {describeBlinds(game)}
      </span>
      <m.span
        key={game.nextBlinds.big}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="hidden items-center gap-1 sm:inline-flex"
      >
        <TrendingUp aria-hidden className="size-3.5" />
        depois {formatChips(game.nextBlinds.small)}/
        {formatChips(game.nextBlinds.big)}
      </m.span>
    </div>
  )
}

export function PokerScreen({
  room,
  game,
}: {
  room: RoomState
  game: PokerState
}) {
  const paused = useWaiting(room.pausedUntil)
  const held = useHandHold(game, paused)
  const isMyTurn = game.currentPlayerId === room.viewerId
  const inHand = isInHand(playerOf(game, room.viewerId))
  const { enabled, setEnabled, hints } = useHints(
    room,
    inHand,
    "poker-texas-holdem"
  )
  const commands = useActionCommands<PokerAction>(game.turnNumber)
  const secondsToStart = useSecondsLeft(room.matchStartsAt) ?? 0
  const notice = useStateNotice(game, (previous, next) =>
    pokerNotice(previous, next, room.viewerId)
  )
  const [lastEvent] = game.history

  return (
    <div className="flex h-dvh flex-col">
      <MatchHeader
        room={room}
        actorId={game.currentPlayerId}
        actorName={nicknameOf(game, game.currentPlayerId)}
        title={held ? "Resultado da mão" : describeTurn(game, room.viewerId)}
        highlight={isMyTurn && !held}
        lastEvent={lastEvent}
        menu={
          <PokerMenu
            room={room}
            game={game}
            hints={hints}
            hintsEnabled={enabled}
            onHintsChange={setEnabled}
          />
        }
      />
      <BlindsStrip game={game} />

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_20rem]">
        <main
          tabIndex={0}
          className="flex min-h-0 items-center justify-center overflow-hidden px-3 py-5 sm:px-8 lg:col-start-1 lg:row-start-1"
        >
          <PokerTable room={room} game={game} held={held} />
        </main>

        <PokerDock
          game={game}
          viewerId={room.viewerId}
          hints={hints}
          held={held}
          busy={commands.busy}
          paused={paused}
          refusal={commands.refusal}
          onAction={commands.perform}
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

      <ChipFlights game={game} />
      <LiveScore notice={notice.notice} onDismiss={notice.dismiss} />
      {secondsToStart > 0 && <MatchCountdown seconds={secondsToStart} />}
    </div>
  )
}
