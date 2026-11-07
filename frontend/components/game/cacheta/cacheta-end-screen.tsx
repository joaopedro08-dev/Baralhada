"use client"

import { m } from "framer-motion"
import { Trophy } from "lucide-react"

import { PointsMeter } from "@/components/game/cacheta/points-meter"
import { MatchEnd, RematchControls } from "@/components/game/room/match-end"
import { PlayerAvatar } from "@/components/game/room/player-avatar"
import { SeatList } from "@/components/game/room/seat-list"
import { useRoomCommands } from "@/components/game/room/use-room-commands"
import {
  describeResult,
  describeStatus,
  explainEnd,
  standingsOf,
} from "@/lib/game/domain/cacheta/guide"
import type { CachetaState } from "@/lib/game/domain/cacheta/types"
import type { RoomState } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

export function CachetaEndScreen({
  room,
  game,
  inviteUrl,
}: {
  room: RoomState
  game: CachetaState
  inviteUrl: string | null
}) {
  const commands = useRoomCommands()
  const standings = standingsOf(game)

  return (
    <MatchEnd
      won={game.winnerId === room.viewerId}
      title={describeResult(game, room.viewerId)}
      subtitle={explainEnd(game)}
    >
      <section aria-labelledby="titulo-classificacao">
        <h2
          id="titulo-classificacao"
          className="font-heading text-lg font-semibold"
        >
          Ordem de eliminação
        </h2>
        <ol>
          {standings.map((player, position) => {
            const winner = player.id === game.winnerId
            const status = describeStatus(player)
            return (
              <m.li
                key={player.id}
                data-score={player.nickname}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + position * 0.12 }}
                className="flex min-w-0 items-center gap-2 border-b py-2.5 last:border-b-0"
              >
                <span
                  className={cn(
                    "w-6 shrink-0 text-center font-heading text-base font-bold tabular-nums",
                    winner ? "text-gold" : "text-muted-foreground"
                  )}
                >
                  {position + 1}º
                </span>
                <PlayerAvatar playerId={player.id} nickname={player.nickname} />
                <span className="min-w-0 truncate text-base font-semibold">
                  {player.nickname}
                  {player.id === room.viewerId && " (você)"}
                </span>
                {winner && (
                  <Trophy aria-label="Vencedor" className="size-4 shrink-0" />
                )}
                <span className="ml-auto flex shrink-0 flex-col items-end gap-0.5">
                  <PointsMeter points={player.points} />
                  {status && (
                    <span className="text-xs text-muted-foreground">
                      {status}
                    </span>
                  )}
                </span>
              </m.li>
            )
          })}
        </ol>
      </section>

      <RematchControls
        room={room}
        inviteUrl={inviteUrl}
        commands={commands}
        roster={<SeatList room={room} onKick={commands.kickPlayer} />}
      />
    </MatchEnd>
  )
}
