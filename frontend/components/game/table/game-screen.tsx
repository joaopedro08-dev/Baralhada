"use client"

import { m } from "framer-motion"

import { CardFlights } from "@/components/game/table/card-flights"
import { GameHeader } from "@/components/game/table/game-header"
import { HandDock } from "@/components/game/table/hand-dock"
import { HistoryList } from "@/components/game/table/history-list"
import { LiveScore, useScoreNotice } from "@/components/game/table/live-score"
import { MatchCountdown } from "@/components/game/table/match-countdown"
import { OpponentPanels } from "@/components/game/table/opponent-panels"
import { OwnArea } from "@/components/game/table/own-area"
import { TableZone } from "@/components/game/table/table-zone"
import { TurnBanner } from "@/components/game/table/turn-banner"
import { useSecondsLeft } from "@/components/game/table/turn-timer"
import { useHints } from "@/components/game/table/use-hints"
import { useTableEffects } from "@/components/game/table/use-table-effects"
import { useTurnControls } from "@/components/game/table/use-turn-controls"
import { focusOfHints } from "@/lib/game/domain/hint-focus"
import { isActionAvailable } from "@/lib/game/domain/selection"
import { describeNextStep } from "@/lib/game/domain/turn-guide"
import type { GameState, RoomState } from "@/lib/game/domain/types"

export function GameScreen({
  room,
  game,
}: {
  room: RoomState
  game: GameState
}) {
  const isMyTurn = game.currentPlayerId === room.viewerId
  const currentName =
    game.players.find((player) => player.id === game.currentPlayerId)
      ?.nickname ?? "outro jogador"
  const { enabled, setEnabled, hints } = useHints(room, isMyTurn)
  const controls = useTurnControls(
    game,
    room.viewerId,
    hints?.plays[0]?.action.type ?? null
  )
  const scoreNotice = useScoreNotice()
  useTableEffects(game, room.viewerId, room.matchStartsAt, scoreNotice.show)
  const secondsToStart = useSecondsLeft(room.matchStartsAt) ?? 0

  const { selection } = controls
  const focus = focusOfHints(hints, room.viewerId)
  const guide = describeNextStep({
    game,
    selection,
    isMyTurn,
    currentName,
    topHint: hints?.plays[0]?.sentence ?? null,
  })

  return (
    <div className="flex h-dvh flex-col">
      <GameHeader
        room={room}
        game={game}
        isMyTurn={isMyTurn}
        currentName={currentName}
        hints={hints}
        hintsEnabled={enabled}
        onHintsChange={setEnabled}
      />

      <div className="grid min-h-0 flex-1 grid-rows-[minmax(0,1fr)_auto] lg:grid-cols-[minmax(0,1fr)_20rem] short:grid-cols-[minmax(0,1fr)_22rem] short:grid-rows-1">
        <m.main
          layoutScroll
          tabIndex={0}
          className="flex min-h-0 flex-col gap-3 overflow-y-auto p-3 lg:col-start-1 lg:row-start-1"
        >
          <OpponentPanels
            room={room}
            game={game}
            selection={selection}
            focus={focus}
            onTogglePile={isMyTurn ? controls.togglePile : undefined}
          />
          <TableZone
            game={game}
            selection={selection}
            focus={focus}
            isMyTurn={isMyTurn}
            canDraw={isActionAvailable(game, room.viewerId, "draw")}
            onDraw={() => controls.perform("draw")}
            onToggleCard={controls.toggleTable}
          />
          <OwnArea
            viewerId={room.viewerId}
            player={game.players.find((player) => player.id === room.viewerId)}
            hints={hints}
            selection={selection}
            focus={focus}
            onTogglePile={isMyTurn ? controls.togglePile : undefined}
          />
        </m.main>

        <HandDock
          game={game}
          viewerId={room.viewerId}
          selection={selection}
          focus={focus}
          isMyTurn={isMyTurn}
          busy={controls.busy}
          guide={guide}
          refusal={controls.refusal}
          suggested={controls.suggested}
          onToggleCard={controls.toggleHand}
          onAction={controls.perform}
        />

        <aside
          aria-label="Histórico de jogadas"
          className="hidden min-h-0 overflow-y-auto border-l border-felt-line bg-felt-deep p-3 lg:col-start-2 lg:row-span-2 lg:row-start-1 lg:block [&_.text-muted-foreground]:text-felt-muted"
        >
          <h2 className="mb-2 font-heading text-sm font-semibold">
            Histórico de jogadas
          </h2>
          <HistoryList history={game.history} />
        </aside>
      </div>

      {isMyTurn && secondsToStart === 0 && (
        <TurnBanner turnNumber={game.turnNumber} />
      )}
      <CardFlights />
      <LiveScore notice={scoreNotice.notice} onDismiss={scoreNotice.dismiss} />
      {secondsToStart > 0 && <MatchCountdown seconds={secondsToStart} />}
    </div>
  )
}
