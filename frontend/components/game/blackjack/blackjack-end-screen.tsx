"use client"

import { m } from "framer-motion"
import { Trophy } from "lucide-react"

import { ChipCount } from "@/components/game/poker/chips"
import { MatchEnd, RematchControls } from "@/components/game/room/match-end"
import { PlayerAvatar } from "@/components/game/room/player-avatar"
import { SeatList } from "@/components/game/room/seat-list"
import { useRoomCommands } from "@/components/game/room/use-room-commands"
import {
  describeResult,
  explainEnd,
  formatNet,
  STARTING_CHIPS,
  standingsOf,
} from "@/lib/game/domain/blackjack/guide"
import type { BlackjackState } from "@/lib/game/domain/blackjack/types"
import type { RoomState } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

export function BlackjackEndScreen({
  room,
  game,
  inviteUrl,
}: {
  room: RoomState
  game: BlackjackState
  inviteUrl: string | null
}) {
  const commands = useRoomCommands()
  const standings = standingsOf(game)
  const solo = game.players.length === 1
  const won = solo
    ? (standings[0]?.chips ?? 0) > STARTING_CHIPS
    : game.winnerIds.includes(room.viewerId)

  return (
    <MatchEnd
      won={won}
      title={describeResult(game, room.viewerId)}
      subtitle={explainEnd(game, room.viewerId)}
    >
      <section aria-labelledby="titulo-fichas">
        <h2 id="titulo-fichas" className="font-heading text-lg font-semibold">
          Fichas finais
        </h2>
        <ol>
          {standings.map((seat, position) => {
            const balance = seat.chips - STARTING_CHIPS
            const winner =
              game.winnerIds.includes(seat.id) && (!solo || balance > 0)
            return (
              <m.li
                key={seat.id}
                data-score={seat.nickname}
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.25 + position * 0.12 }}
                className="flex min-w-0 items-center gap-2 border-b py-2.5 last:border-b-0"
              >
                <PlayerAvatar playerId={seat.id} nickname={seat.nickname} />
                <span className="min-w-0 truncate text-base font-semibold">
                  {seat.nickname}
                  {seat.id === room.viewerId && " (você)"}
                </span>
                {winner && (
                  <Trophy aria-label="Vencedor" className="size-4 shrink-0" />
                )}
                <span className="ml-auto flex shrink-0 flex-col items-end">
                  <ChipCount
                    value={seat.chips}
                    className="font-heading text-base font-bold"
                  />
                  <span
                    className={cn(
                      "text-xs font-semibold tabular-nums",
                      balance > 0 && "text-emerald-600 dark:text-emerald-300",
                      balance < 0 && "text-rose-600 dark:text-rose-300",
                      balance === 0 && "text-muted-foreground"
                    )}
                  >
                    {formatNet(balance)}
                  </span>
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
