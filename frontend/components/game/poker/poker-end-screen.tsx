"use client"

import { m } from "framer-motion"
import { Medal, Trophy } from "lucide-react"

import { ChipStack } from "@/components/game/poker/chips"
import { MatchEnd, RematchControls } from "@/components/game/room/match-end"
import { PlayerAvatar } from "@/components/game/room/player-avatar"
import { SeatList } from "@/components/game/room/seat-list"
import { useRoomCommands } from "@/components/game/room/use-room-commands"
import {
  describeResult,
  explainEnd,
  standingsOf,
} from "@/lib/game/domain/poker/guide"
import type { PokerState } from "@/lib/game/domain/poker/types"
import type { RoomState } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const PLACE_TONES = ["text-gold", "text-slate-300", "text-amber-600"] as const

export function PokerEndScreen({
  room,
  game,
  inviteUrl,
}: {
  room: RoomState
  game: PokerState
  inviteUrl: string | null
}) {
  const commands = useRoomCommands()

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
          Classificação
        </h2>
        <p className="text-sm text-muted-foreground">
          Do vencedor ao primeiro eliminado, em {game.handNumber}{" "}
          {game.handNumber === 1 ? "mão" : "mãos"}.
        </p>
        <ol className="mt-1">
          {standingsOf(game).map(({ player, place }, position) => (
            <m.li
              key={player.id}
              data-score={player.nickname}
              initial={{ opacity: 0, x: -16 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 + position * 0.12 }}
              className="flex items-center gap-2 border-b py-2.5 last:border-b-0"
            >
              <span
                className={cn(
                  "flex w-7 shrink-0 justify-center font-heading text-base font-bold tabular-nums",
                  PLACE_TONES[place - 1]
                )}
              >
                {place <= PLACE_TONES.length ? (
                  <Medal aria-label={`${place}º lugar`} className="size-5" />
                ) : (
                  `${place}º`
                )}
              </span>
              <PlayerAvatar playerId={player.id} nickname={player.nickname} />
              <span className="min-w-0 truncate text-base font-semibold">
                {player.nickname}
                {player.id === room.viewerId && " (você)"}
              </span>
              {player.id === game.winnerId && (
                <Trophy aria-label="Vencedor" className="size-4 shrink-0" />
              )}
              <span className="ml-auto shrink-0">
                {player.chips > 0 ? (
                  <ChipStack amount={player.chips} />
                ) : (
                  <span className="text-sm text-muted-foreground">
                    eliminado
                  </span>
                )}
              </span>
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
