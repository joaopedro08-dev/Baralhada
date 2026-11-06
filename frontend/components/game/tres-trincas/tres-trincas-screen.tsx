"use client"

import { m } from "framer-motion"

import { HistoryList } from "@/components/game/table/history-list"
import { LiveScore, useStateNotice } from "@/components/game/table/live-score"
import { MatchCountdown } from "@/components/game/table/match-countdown"
import { MatchHeader } from "@/components/game/table/match-header"
import { useSecondsLeft } from "@/components/game/table/turn-timer"
import { useActionCommands } from "@/components/game/table/use-action-commands"
import { useHints } from "@/components/game/table/use-hints"
import { TrincaHand } from "@/components/game/tres-trincas/trinca-hand"
import { TrincaMenu } from "@/components/game/tres-trincas/trinca-menu"
import { TrincaTable } from "@/components/game/tres-trincas/trinca-table"
import { describeTurn, nicknameOf } from "@/lib/game/domain/tres-trincas/guide"
import { trincaNotice } from "@/lib/game/domain/tres-trincas/notice"
import type {
  TresTrincasState,
  TrincaAction,
} from "@/lib/game/domain/tres-trincas/types"
import type { RoomState } from "@/lib/game/domain/types"

export function TresTrincasScreen({
  room,
  game,
}: {
  room: RoomState
  game: TresTrincasState
}) {
  const isMyTurn = game.currentPlayerId === room.viewerId
  const { allowed, enabled, setEnabled, hints } = useHints(
    room,
    isMyTurn,
    "tres-trincas"
  )
  const commands = useActionCommands<TrincaAction>(game.turnNumber)
  const secondsToStart = useSecondsLeft(room.matchStartsAt) ?? 0
  const notice = useStateNotice(game, (previous, next) =>
    trincaNotice(previous, next, room.viewerId)
  )
  const [lastEvent] = game.history

  return (
    <div className="flex h-dvh flex-col">
      <MatchHeader
        room={room}
        actorId={game.currentPlayerId}
        actorName={nicknameOf(game, game.currentPlayerId)}
        title={describeTurn(game, room.viewerId)}
        highlight={isMyTurn}
        lastEvent={lastEvent}
        menu={
          <TrincaMenu
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
          className="flex min-h-0 flex-col gap-3 overflow-y-auto p-3 lg:col-start-1 lg:row-start-1"
        >
          <TrincaTable
            room={room}
            game={game}
            canDraw={game.moves.draw && !commands.busy}
            onDraw={() => commands.perform({ type: "draw" })}
          />
        </m.main>

        <TrincaHand
          game={game}
          viewerId={room.viewerId}
          organize={allowed && enabled}
          hints={hints}
          busy={commands.busy}
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

      <LiveScore notice={notice.notice} onDismiss={notice.dismiss} />
      {secondsToStart > 0 && <MatchCountdown seconds={secondsToStart} />}
    </div>
  )
}
