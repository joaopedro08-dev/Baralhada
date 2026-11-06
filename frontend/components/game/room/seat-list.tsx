"use client"

import { AnimatePresence, m } from "framer-motion"
import { Crown, WifiOff, X } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { PlayerAvatar } from "@/components/game/room/player-avatar"
import { Badge } from "@/components/ui/badge"
import { gameInfo, maxPlayersOf } from "@/lib/game/domain/catalog"
import type { PlayerId, RoomPlayer, RoomState } from "@/lib/game/domain/types"

const BADGE_TEXT = "h-6 text-xs"

function SeatRow({
  player,
  isHost,
  isViewer,
  onKick,
}: {
  player: RoomPlayer
  isHost: boolean
  isViewer: boolean
  onKick?: () => void
}) {
  return (
    <m.li
      layout
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="flex min-h-11 flex-wrap items-center gap-2 border-b py-1 last:border-b-0"
    >
      <PlayerAvatar playerId={player.id} nickname={player.nickname} />
      <span className="min-w-0 truncate text-base font-medium">
        {player.nickname}
      </span>
      {isViewer && (
        <Badge variant="secondary" className={BADGE_TEXT}>
          você
        </Badge>
      )}
      {isHost && (
        <Badge variant="outline" className={BADGE_TEXT}>
          <Crown aria-hidden />
          anfitrião
        </Badge>
      )}
      {!player.connected && (
        <Badge variant="outline" className={BADGE_TEXT}>
          <WifiOff aria-hidden />
          sem conexão
        </Badge>
      )}
      {onKick && (
        <GameButton
          tone="panel"
          variant="ghost"
          aria-label={`Remover ${player.nickname} da sala`}
          onClick={onKick}
          className="ml-auto px-0"
        >
          <X aria-hidden />
        </GameButton>
      )}
    </m.li>
  )
}

export function SeatList({
  room,
  onKick,
}: {
  room: RoomState
  onKick: (playerId: PlayerId) => void
}) {
  const viewerIsHost = room.hostId === room.viewerId
  return (
    <section aria-labelledby="titulo-jogadores">
      <h2 id="titulo-jogadores" className="font-heading text-lg font-semibold">
        Na sala ({room.players.length} de {maxPlayersOf(gameInfo(room.gameId))})
      </h2>
      <ul aria-live="polite">
        <AnimatePresence initial={false}>
          {room.players.map((player) => (
            <SeatRow
              key={player.id}
              player={player}
              isHost={player.id === room.hostId}
              isViewer={player.id === room.viewerId}
              onKick={
                viewerIsHost && player.id !== room.viewerId
                  ? () => onKick(player.id)
                  : undefined
              }
            />
          ))}
        </AnimatePresence>
      </ul>
    </section>
  )
}
