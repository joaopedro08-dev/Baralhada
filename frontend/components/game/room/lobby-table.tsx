"use client"

import { AnimatePresence, m } from "framer-motion"
import { Crown, UserPlus, UserX, WifiOff } from "lucide-react"

import { CardFace } from "@/components/game/cards/card-face"
import { GAME_IDENTITY } from "@/components/game/game-identity"
import { PlayerAvatar } from "@/components/game/room/player-avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { gameInfo } from "@/lib/game/domain/catalog"
import { lobbySeats, seatPosition, teamOf } from "@/lib/game/domain/lobby"
import type { PlayerId, RoomPlayer, RoomState } from "@/lib/game/domain/types"
import { teamLabel } from "@/lib/game/domain/truco/teams"
import { cn } from "@/lib/utils"

const TEAM_RINGS = ["ring-sky-400", "ring-rose-400"] as const

const describePlayer = (
  player: RoomPlayer,
  room: RoomState,
  team: number | null
): string => {
  const notes = [
    player.id === room.viewerId && "você",
    player.id === room.hostId && "anfitrião",
    team !== null && teamLabel(team),
    !player.connected && "sem conexão",
  ].filter(Boolean)
  return notes.length
    ? `${player.nickname} (${notes.join(", ")})`
    : player.nickname
}

function SeatBody({
  player,
  room,
  team,
}: {
  player: RoomPlayer
  room: RoomState
  team: number | null
}) {
  const isHost = player.id === room.hostId
  const isViewer = player.id === room.viewerId
  return (
    <>
      <span
        className={cn(
          "relative rounded-full ring-3 ring-offset-2 ring-offset-felt-deep",
          team === null
            ? isViewer
              ? "ring-gold"
              : "ring-transparent"
            : TEAM_RINGS[team % 2],
          !player.connected && "opacity-60 grayscale"
        )}
      >
        <PlayerAvatar
          playerId={player.id}
          nickname={player.nickname}
          size="lg"
        />
        {isHost && (
          <Crown
            aria-hidden
            className="absolute -top-3 left-1/2 size-4 -translate-x-1/2 fill-gold text-gold drop-shadow"
          />
        )}
        {!player.connected && (
          <WifiOff
            aria-hidden
            className="absolute -right-1 -bottom-1 size-4 rounded-full bg-refusal p-0.5 text-refusal-foreground"
          />
        )}
      </span>
      <span
        aria-hidden
        className={cn(
          "max-w-[5.5rem] truncate rounded-full px-2 py-0.5 text-xs font-semibold sm:max-w-[7rem] sm:text-sm",
          isViewer
            ? "bg-gold text-gold-foreground"
            : "bg-felt-deep/90 text-felt-foreground"
        )}
      >
        {isViewer ? "Você" : player.nickname}
      </span>
    </>
  )
}

function PlayerSeat({
  player,
  room,
  onKick,
}: {
  player: RoomPlayer
  room: RoomState
  onKick: (playerId: PlayerId) => void
}) {
  const team = teamOf(room, player.id)
  const label = describePlayer(player, room, team)
  const canKick = room.hostId === room.viewerId && player.id !== room.viewerId
  const seatClass =
    "flex min-h-11 min-w-11 flex-col items-center gap-1.5 rounded-xl p-1 outline-none"

  if (!canKick) {
    return (
      <div className={seatClass}>
        <span className="sr-only">{label}</span>
        <SeatBody player={player} room={room} team={team} />
      </div>
    )
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label={`${label}: opções`}
        className={cn(
          seatClass,
          "transition-transform hover:scale-105 focus-visible:ring-3 focus-visible:ring-sky-400"
        )}
      >
        <SeatBody player={player} room={room} team={team} />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="center" className="min-w-48">
        <DropdownMenuLabel className="text-sm">
          {player.nickname}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          variant="destructive"
          className="min-h-11 text-sm"
          onSelect={() => onKick(player.id)}
        >
          <UserX aria-hidden />
          Remover da sala
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

function EmptySeat() {
  return (
    <div
      aria-hidden
      className="seat-waiting flex flex-col items-center gap-1.5 p-1"
    >
      <span className="flex size-10 items-center justify-center rounded-full border-2 border-dashed border-felt-muted/70 text-felt-muted">
        <UserPlus aria-hidden className="size-4" />
      </span>
      <span className="rounded-full px-2 py-0.5 text-xs font-medium text-felt-muted">
        Livre
      </span>
    </div>
  )
}

function TableCenter({ room }: { room: RoomState }) {
  const game = gameInfo(room.gameId)
  const { accent, short } = GAME_IDENTITY[room.gameId]
  return (
    <div className="flex flex-col items-center gap-2 text-center">
      <AnimatePresence mode="wait" initial={false}>
        <m.div
          key={room.gameId}
          initial={{ opacity: 0, scale: 0.85 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.85 }}
          transition={{ duration: 0.2 }}
          className="flex flex-col items-center gap-1.5"
        >
          <span aria-hidden className="flex -space-x-5">
            {game.sample.map((card, index) => (
              <CardFace
                key={card}
                card={card}
                size="flying"
                className={cn(
                  "h-12 w-9 sm:h-16 sm:w-12",
                  index === 0 && "-rotate-8",
                  index === 1 && "z-10 -translate-y-1",
                  index === 2 && "rotate-8"
                )}
              />
            ))}
          </span>
          <span
            className={cn(
              "font-heading text-base leading-tight font-bold sm:text-xl",
              accent
            )}
          >
            {short}
          </span>
        </m.div>
      </AnimatePresence>
    </div>
  )
}

export function LobbyTable({
  room,
  onKick,
}: {
  room: RoomState
  onKick: (playerId: PlayerId) => void
}) {
  const seats = lobbySeats(room)
  const capacity = seats.length

  return (
    <section aria-labelledby="titulo-mesa" className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 id="titulo-mesa" className="font-heading text-xl font-bold">
          Na mesa
        </h2>
        <p className="text-sm font-medium text-felt-muted">
          <span className="font-heading text-lg font-bold text-gold">
            {room.players.length}
          </span>{" "}
          de {capacity} lugares
        </p>
      </div>
      <div className="relative mx-auto aspect-[1/0.95] w-full max-w-xl sm:aspect-[16/11]">
        <div className="lobby-table absolute inset-[15%] flex items-center justify-center sm:inset-x-[14%] sm:inset-y-[16%]">
          <TableCenter room={room} />
        </div>
        <ul aria-live="polite" aria-label="Lugares na mesa">
          <AnimatePresence initial={false}>
            {seats.map((seat, index) => {
              const position = seatPosition(index, capacity, 40, 40)
              return (
                <m.li
                  key={
                    seat.kind === "player"
                      ? seat.player.id
                      : `livre-${seat.index}`
                  }
                  initial={{ opacity: 0, scale: 0.6 }}
                  animate={{
                    opacity: 1,
                    scale: 1,
                    left: position.left,
                    top: position.top,
                  }}
                  exit={{ opacity: 0, scale: 0.6 }}
                  transition={{ type: "spring", stiffness: 220, damping: 22 }}
                  style={position}
                  className="absolute -translate-x-1/2 -translate-y-1/2"
                >
                  {seat.kind === "player" ? (
                    <PlayerSeat
                      player={seat.player}
                      room={room}
                      onKick={onKick}
                    />
                  ) : (
                    <>
                      <span className="sr-only">Lugar livre</span>
                      <EmptySeat />
                    </>
                  )}
                </m.li>
              )
            })}
          </AnimatePresence>
        </ul>
      </div>
    </section>
  )
}
