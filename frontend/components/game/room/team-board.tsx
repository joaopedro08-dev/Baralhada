"use client"

import { ArrowLeftRight, Shuffle } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { PlayerAvatar } from "@/components/game/room/player-avatar"
import { teamLabel } from "@/lib/game/domain/truco/teams"
import type { PlayerId, RoomState } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

export function TeamBoard({
  room,
  busy,
  onMove,
  onDraw,
}: {
  room: RoomState
  busy: boolean
  onMove: (playerId: PlayerId, team: number) => void
  onDraw: () => void
}) {
  const teams = room.teams ?? []
  const viewerIsHost = room.hostId === room.viewerId
  const nicknameOf = (id: PlayerId) =>
    room.players.find((player) => player.id === id)?.nickname ?? "Jogador"

  return (
    <section aria-labelledby="titulo-times" className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id="titulo-times" className="font-heading text-lg font-semibold">
          Times
        </h2>
        {viewerIsHost && (
          <GameButton
            tone="panel"
            variant="outline"
            disabled={busy || room.players.length < 2}
            onClick={onDraw}
          >
            <Shuffle aria-hidden />
            Sortear
          </GameButton>
        )}
      </div>
      <div className="grid grid-cols-2 gap-2" aria-live="polite">
        {teams.map((members, team) => (
          <div
            key={team}
            className={cn(
              "flex flex-col gap-1 rounded-lg border-2 p-2",
              team === 0 ? "border-sky-500/60" : "border-rose-500/60"
            )}
          >
            <h3 className="text-sm font-semibold">
              {teamLabel(team)} ({members.length})
            </h3>
            <ul className="flex flex-col gap-1">
              {members.map((id) => (
                <li key={id} className="flex min-h-11 items-center gap-1.5">
                  <PlayerAvatar
                    playerId={id}
                    nickname={nicknameOf(id)}
                    size="sm"
                  />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    {nicknameOf(id)}
                    {id === room.viewerId && " (você)"}
                  </span>
                  {viewerIsHost && (
                    <GameButton
                      tone="panel"
                      variant="ghost"
                      disabled={busy}
                      aria-label={`Mover ${nicknameOf(id)} para o ${teamLabel(1 - team)}`}
                      onClick={() => onMove(id, 1 - team)}
                      className="px-0"
                    >
                      <ArrowLeftRight aria-hidden />
                    </GameButton>
                  )}
                </li>
              ))}
              {members.length === 0 && (
                <li className="text-sm text-muted-foreground">Ninguém ainda</li>
              )}
            </ul>
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Os jogadores sentam alternados: cada um é seguido por um adversário.
      </p>
    </section>
  )
}
