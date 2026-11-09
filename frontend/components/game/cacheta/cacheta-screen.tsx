"use client"

import { m } from "framer-motion"

import { CachetaHand } from "@/components/game/cacheta/cacheta-hand"
import { CachetaMenu } from "@/components/game/cacheta/cacheta-menu"
import { CachetaTable } from "@/components/game/cacheta/cacheta-table"
import { KnockShowcase } from "@/components/game/cacheta/knock-showcase"
import { PointsMeter } from "@/components/game/cacheta/points-meter"
import { HistoryList } from "@/components/game/table/history-list"
import { MatchCountdown } from "@/components/game/table/match-countdown"
import { MatchHeader } from "@/components/game/table/match-header"
import { useSecondsLeft } from "@/components/game/table/turn-timer"
import { useActionCommands } from "@/components/game/table/use-action-commands"
import { useHints } from "@/components/game/table/use-hints"
import {
  describeTurn,
  nicknameOf,
  roundResultOf,
} from "@/lib/game/domain/cacheta/guide"
import type {
  CachetaAction,
  CachetaState,
} from "@/lib/game/domain/cacheta/types"
import type { RoomState } from "@/lib/game/domain/types"

export function CachetaScreen({
  room,
  game,
}: {
  room: RoomState
  game: CachetaState
}) {
  const result = roundResultOf(game)
  const isMyTurn =
    game.currentPlayerId === room.viewerId && game.pending === null
  const { allowed, enabled, setEnabled, hints } = useHints(
    room,
    isMyTurn,
    "cacheta"
  )
  const commands = useActionCommands<CachetaAction>(game.turnNumber)
  const secondsToStart = useSecondsLeft(room.matchStartsAt, room.pausedAt) ?? 0
  const mine = game.players.find((player) => player.id === room.viewerId)
  const actorId = result?.knockerId ?? game.currentPlayerId
  const [lastEvent] = game.history

  return (
    <div className="flex h-dvh flex-col">
      <MatchHeader
        room={room}
        actorId={actorId}
        actorName={nicknameOf(game, actorId)}
        title={describeTurn(game, room.viewerId)}
        highlight={isMyTurn}
        lastEvent={lastEvent}
        menu={
          <CachetaMenu
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
          <CachetaTable
            room={room}
            game={game}
            canDraw={isMyTurn && game.moves.draw && !commands.busy}
            canTake={isMyTurn && game.moves.take && !commands.busy}
            onDraw={() => commands.perform({ type: "draw" })}
            onTake={() => commands.perform({ type: "take" })}
          />
          {mine && (
            <p className="flex items-center justify-center gap-2 text-sm text-felt-muted">
              Seus pontos
              <PointsMeter points={mine.points} size="md" />
            </p>
          )}
        </m.main>

        <CachetaHand
          game={game}
          viewerId={room.viewerId}
          hints={hints}
          hintsOn={allowed && enabled}
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

      <KnockShowcase game={game} result={result} viewerId={room.viewerId} />
      {secondsToStart > 0 && <MatchCountdown seconds={secondsToStart} />}
    </div>
  )
}
