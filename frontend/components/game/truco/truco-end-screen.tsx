"use client"

import { Trophy } from "lucide-react"

import { MatchEnd, RematchControls } from "@/components/game/room/match-end"
import { TeamBoard } from "@/components/game/room/team-board"
import { useRoomCommands } from "@/components/game/room/use-room-commands"
import {
  describeTrucoResult,
  explainTrucoEnd,
} from "@/lib/game/domain/truco/guide"
import { sideLabel } from "@/lib/game/domain/truco/teams"
import type { TeamIndex, TrucoState } from "@/lib/game/domain/truco/types"
import type { RoomState } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const TEAMS: readonly TeamIndex[] = [0, 1]

export function TrucoEndScreen({
  room,
  game,
  inviteUrl,
}: {
  room: RoomState
  game: TrucoState
  inviteUrl: string | null
}) {
  const commands = useRoomCommands()

  return (
    <MatchEnd
      won={game.winnerTeam !== null && game.winnerTeam === game.viewerTeam}
      title={describeTrucoResult(game)}
      subtitle={explainTrucoEnd(game)}
    >
      <section aria-labelledby="titulo-placar-final">
        <h2
          id="titulo-placar-final"
          className="font-heading text-lg font-semibold"
        >
          Placar final
        </h2>
        <ol className="grid grid-cols-2 gap-2 pt-2">
          {TEAMS.map((team) => (
            <li
              key={team}
              className={cn(
                "flex flex-col items-center gap-1 rounded-lg border-2 p-3",
                team === game.winnerTeam ? "border-gold" : "border-border"
              )}
            >
              <span className="text-sm font-semibold">
                {sideLabel(game, team)}
              </span>
              <span className="font-heading text-3xl font-bold tabular-nums">
                {game.scores[team]}
              </span>
              {team === game.winnerTeam && (
                <Trophy aria-label="Time vencedor" className="size-4" />
              )}
            </li>
          ))}
        </ol>
      </section>

      <RematchControls
        room={room}
        inviteUrl={inviteUrl}
        commands={commands}
        roster={
          room.teams && (
            <TeamBoard
              room={room}
              busy={commands.busy}
              onMove={commands.moveToTeam}
              onDraw={commands.drawTeams}
            />
          )
        }
      />
    </MatchEnd>
  )
}
