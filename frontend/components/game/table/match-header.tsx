"use client"

import { PlayerAvatar } from "@/components/game/room/player-avatar"
import { TurnClock, TurnProgress } from "@/components/game/table/turn-timer"
import type { PlayerId, RoomState } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

export function MatchHeader({
  room,
  actorId,
  actorName,
  title,
  highlight,
  lastEvent,
  menu,
}: {
  room: RoomState
  actorId: PlayerId
  actorName: string
  title: string
  highlight: boolean
  lastEvent: string | undefined
  menu: React.ReactNode
}) {
  return (
    <header className="shrink-0 bg-felt-deep">
      <div className="flex h-13 items-center gap-2 px-3">
        <PlayerAvatar playerId={actorId} nickname={actorName} />
        <div className="min-w-0 flex-1">
          <p
            aria-live="polite"
            className={cn(
              "truncate font-heading text-base leading-tight font-bold",
              highlight && "text-gold"
            )}
          >
            {title}
          </p>
          <p className="truncate text-xs text-felt-muted">
            {lastEvent ?? "A partida começou"}
          </p>
        </div>
        <TurnClock
          deadlineAt={room.turnDeadlineAt}
          durationMs={room.turnDurationMs}
        />
        {menu}
      </div>
      <TurnProgress
        deadlineAt={room.turnDeadlineAt}
        durationMs={room.turnDurationMs}
      />
    </header>
  )
}
