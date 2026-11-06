"use client"

import { m } from "framer-motion"
import { Trophy } from "lucide-react"

import { PileStack } from "@/components/game/cards/pile-stack"
import { MatchEnd, RematchControls } from "@/components/game/room/match-end"
import { PlayerAvatar } from "@/components/game/room/player-avatar"
import { SeatList } from "@/components/game/room/seat-list"
import { useRoomCommands } from "@/components/game/room/use-room-commands"
import { plural } from "@/lib/game/domain/cards"
import {
  describeResult,
  explainEnd,
  rankPlayers,
} from "@/lib/game/domain/scoreboard"
import type { GamePlayer, GameState, RoomState } from "@/lib/game/domain/types"

function ScoreRow({
  player,
  won,
  isViewer,
  position,
}: {
  player: GamePlayer
  won: boolean
  isViewer: boolean
  position: number
}) {
  return (
    <m.li
      data-score={player.nickname}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.25 + position * 0.1 }}
      className="flex items-center gap-3 border-b py-2.5 last:border-b-0"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <PlayerAvatar playerId={player.id} nickname={player.nickname} />
        <span className="min-w-0 truncate text-base font-semibold">
          {player.nickname}
          {isViewer && " (você)"}
        </span>
        {won && <Trophy aria-label="Vencedor" className="size-4 shrink-0" />}
        <span className="ml-auto shrink-0 text-base font-semibold tabular-nums">
          {plural(player.pileSize, "carta", "cartas")}
        </span>
      </div>
      <PileStack top={player.pileTop} size={player.pileSize} />
    </m.li>
  )
}

export function EndScreen({
  room,
  game,
  inviteUrl,
}: {
  room: RoomState
  game: GameState
  inviteUrl: string | null
}) {
  const commands = useRoomCommands()

  return (
    <MatchEnd
      won={game.winnerIds.includes(room.viewerId)}
      title={describeResult(game, room.viewerId)}
      subtitle={explainEnd(game)}
    >
      <section aria-labelledby="titulo-placar">
        <h2 id="titulo-placar" className="font-heading text-lg font-semibold">
          Placar
        </h2>
        <ol>
          {rankPlayers(game.players).map((player, position) => (
            <ScoreRow
              key={player.id}
              player={player}
              position={position}
              won={game.winnerIds.includes(player.id)}
              isViewer={player.id === room.viewerId}
            />
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
