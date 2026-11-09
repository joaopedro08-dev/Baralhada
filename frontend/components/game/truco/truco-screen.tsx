"use client"

import { m } from "framer-motion"

import { HistoryList } from "@/components/game/table/history-list"
import { LiveScore, useTrucoNotice } from "@/components/game/table/live-score"
import { MatchHeader } from "@/components/game/table/match-header"
import { MatchCountdown } from "@/components/game/table/match-countdown"
import { useSecondsLeft } from "@/components/game/table/turn-timer"
import { useHints } from "@/components/game/table/use-hints"
import { CallBanner, useTrucoCall } from "@/components/game/truco/call-banner"
import { TrucoHand } from "@/components/game/truco/truco-hand"
import { TrucoMenu } from "@/components/game/truco/truco-menu"
import { TrucoScoreboard } from "@/components/game/truco/truco-scoreboard"
import { TrucoTable } from "@/components/game/truco/truco-table"
import { useRoundHold } from "@/components/game/truco/use-round-hold"
import { useTablePace } from "@/components/game/truco/use-table-pace"
import { useTrucoCommands } from "@/components/game/truco/use-truco-commands"
import { describeTurn } from "@/lib/game/domain/truco/guide"
import { nicknameOf } from "@/lib/game/domain/truco/teams"
import type { TrucoState } from "@/lib/game/domain/truco/types"
import type { RoomState } from "@/lib/game/domain/types"

export function TrucoScreen({
  room,
  game,
}: {
  room: RoomState
  game: TrucoState
}) {
  const isMyTurn = game.actorId === room.viewerId
  const { enabled, setEnabled, hints } = useHints(
    room,
    isMyTurn,
    "truco-paulista"
  )
  const commands = useTrucoCommands(game.turnNumber)
  const secondsToStart = useSecondsLeft(room.matchStartsAt, room.pausedAt) ?? 0
  const [lastEvent] = game.history
  const call = useTrucoCall(game)
  const scoreNotice = useTrucoNotice(game)
  const pace = useTablePace(room, game)
  const held = useRoundHold(game, pace.paused)

  return (
    <div className="flex h-dvh flex-col">
      <MatchHeader
        room={room}
        actorId={game.actorId}
        actorName={nicknameOf(game, game.actorId)}
        title={describeTurn(game, room.viewerId)}
        highlight={isMyTurn}
        lastEvent={lastEvent}
        menu={
          <TrucoMenu
            room={room}
            game={game}
            hints={hints}
            hintsEnabled={enabled}
            onHintsChange={setEnabled}
          />
        }
      />

      <TrucoScoreboard game={game} />

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_20rem]">
        <m.main
          layoutScroll
          tabIndex={0}
          className="flex min-h-0 flex-col gap-3 overflow-y-auto p-3 lg:col-start-1 lg:row-start-1"
        >
          <TrucoTable
            game={game}
            viewerId={room.viewerId}
            held={held}
            dealing={pace.dealing}
          />
        </m.main>

        <TrucoHand
          game={game}
          busy={commands.busy}
          pace={pace}
          refusal={commands.refusal}
          suggested={hints?.suggestions[0]?.action ?? null}
          onAction={commands.perform}
        />

        <aside
          aria-label="Histórico da mão"
          className="hidden min-h-0 overflow-y-auto border-l border-felt-line bg-felt-deep p-3 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block [&_.text-muted-foreground]:text-felt-muted"
        >
          <h2 className="mb-2 font-heading text-sm font-semibold">
            Histórico da mão
          </h2>
          <HistoryList history={game.history} />
        </aside>
      </div>

      <LiveScore notice={scoreNotice.notice} onDismiss={scoreNotice.dismiss} />
      <CallBanner call={call} />
      {secondsToStart > 0 && <MatchCountdown seconds={secondsToStart} />}
    </div>
  )
}
