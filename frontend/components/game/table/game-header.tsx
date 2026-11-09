"use client"

import { AnimatePresence, m } from "framer-motion"

import { PlayerAvatar } from "@/components/game/room/player-avatar"
import { GameMenu } from "@/components/game/table/game-menu"
import { TurnClock, TurnProgress } from "@/components/game/table/turn-timer"
import type { GameState, Hints, RoomState } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

export function GameHeader({
  room,
  game,
  isMyTurn,
  currentName,
  hints,
  hintsEnabled,
  onHintsChange,
}: {
  room: RoomState
  game: GameState
  isMyTurn: boolean
  currentName: string
  hints: Hints | null
  hintsEnabled: boolean
  onHintsChange: (enabled: boolean) => void
}) {
  const [lastEvent] = game.history
  return (
    <header data-turn={game.turnNumber} className="shrink-0 bg-felt-deep">
      <div className="flex h-13 items-center gap-2 px-3">
        <PlayerAvatar playerId={game.currentPlayerId} nickname={currentName} />
        <div className="min-w-0 flex-1">
          <p
            aria-live="polite"
            className={cn(
              "truncate font-heading text-base leading-tight font-bold",
              isMyTurn && "text-gold"
            )}
          >
            {isMyTurn ? "Sua vez" : `Vez de ${currentName}`}
          </p>
          <div className="relative h-4 overflow-hidden">
            <AnimatePresence initial={false}>
              <m.p
                key={lastEvent ?? "inicio"}
                aria-live="polite"
                initial={{ y: 14, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: -14, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="absolute inset-x-0 truncate text-xs text-felt-muted"
              >
                {lastEvent ?? "A partida começou"}
              </m.p>
            </AnimatePresence>
          </div>
        </div>
        <TurnClock deadlineAt={room.turnDeadlineAt} pausedAt={room.pausedAt} />
        <GameMenu
          room={room}
          game={game}
          hints={hints}
          hintsEnabled={hintsEnabled}
          onHintsChange={onHintsChange}
        />
      </div>
      <TurnProgress
        deadlineAt={room.turnDeadlineAt}
        pausedAt={room.pausedAt}
        durationMs={room.turnDurationMs}
      />
    </header>
  )
}
