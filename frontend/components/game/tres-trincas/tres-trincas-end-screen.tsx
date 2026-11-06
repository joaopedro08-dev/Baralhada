"use client"

import { m } from "framer-motion"
import { Trophy } from "lucide-react"

import { MatchEnd, RematchControls } from "@/components/game/room/match-end"
import { PlayerAvatar } from "@/components/game/room/player-avatar"
import { SeatList } from "@/components/game/room/seat-list"
import { useRoomCommands } from "@/components/game/room/use-room-commands"
import { MeldedSets } from "@/components/game/tres-trincas/melded-sets"
import {
  describeResult,
  explainEnd,
  SETS_TO_WIN,
} from "@/lib/game/domain/tres-trincas/guide"
import type { TresTrincasState } from "@/lib/game/domain/tres-trincas/types"
import type { RoomState } from "@/lib/game/domain/types"

export function TresTrincasEndScreen({
  room,
  game,
  inviteUrl,
}: {
  room: RoomState
  game: TresTrincasState
  inviteUrl: string | null
}) {
  const commands = useRoomCommands()
  const standings = [...game.players].sort(
    (first, second) =>
      Number(second.id === game.winnerId) -
        Number(first.id === game.winnerId) ||
      second.sets.length - first.sets.length
  )

  return (
    <MatchEnd
      won={game.winnerId === room.viewerId}
      title={describeResult(game, room.viewerId)}
      subtitle={explainEnd(game)}
    >
      <section aria-labelledby="titulo-trincas">
        <h2 id="titulo-trincas" className="font-heading text-lg font-semibold">
          Trincas da partida
        </h2>
        <ol>
          {standings.map((player, position) => (
            <m.li
              key={player.id}
              data-score={player.nickname}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 + position * 0.1 }}
              className="flex flex-col gap-2 border-b py-2.5 last:border-b-0"
            >
              <div className="flex min-w-0 items-center gap-2">
                <PlayerAvatar playerId={player.id} nickname={player.nickname} />
                <span className="min-w-0 truncate text-base font-semibold">
                  {player.nickname}
                  {player.id === room.viewerId && " (você)"}
                </span>
                {player.id === game.winnerId && (
                  <Trophy aria-label="Vencedor" className="size-4 shrink-0" />
                )}
                <span className="ml-auto shrink-0 text-base font-semibold tabular-nums">
                  {player.sets.length}/{SETS_TO_WIN}
                </span>
              </div>
              {player.sets.length > 0 && (
                <MeldedSets sets={player.sets} wildRank={game.wildRank} />
              )}
            </m.li>
          ))}
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
