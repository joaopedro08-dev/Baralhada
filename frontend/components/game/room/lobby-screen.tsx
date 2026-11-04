"use client"

import { m } from "framer-motion"
import { Play } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { RefusalMessage } from "@/components/game/refusal-message"
import { InviteLink } from "@/components/game/room/invite-link"
import { LeaveRoomButton } from "@/components/game/room/leave-button"
import { SeatList } from "@/components/game/room/seat-list"
import { useRoomCommands } from "@/components/game/room/use-room-commands"
import { Card, CardContent } from "@/components/ui/card"
import { MAX_PLAYERS, MIN_PLAYERS } from "@/lib/game/domain/room-entry"
import type { RoomState } from "@/lib/game/domain/types"

function RoomCodeTiles({ code }: { code: string }) {
  return (
    <h1 aria-label={code} className="flex justify-center gap-1.5">
      {[...code].map((letter, position) => (
        <m.span
          key={position}
          aria-hidden
          initial={{ y: 16, opacity: 0, rotate: -8 }}
          animate={{ y: 0, opacity: 1, rotate: 0 }}
          transition={{
            delay: position * 0.05,
            type: "spring",
            stiffness: 300,
          }}
          className="flex h-14 w-11 items-center justify-center rounded-lg bg-playing-card font-mono text-3xl font-bold text-suit-black shadow-md"
        >
          {letter}
        </m.span>
      ))}
    </h1>
  )
}

export function LobbyScreen({
  room,
  inviteUrl,
}: {
  room: RoomState
  inviteUrl: string | null
}) {
  const { refusal, busy, startMatch, kickPlayer } = useRoomCommands()
  const viewerIsHost = room.hostId === room.viewerId
  const host = room.players.find((player) => player.id === room.hostId)
  const missing = MIN_PLAYERS - room.players.length

  return (
    <main className="mx-auto flex min-h-svh w-full max-w-md flex-col justify-center gap-5 px-4 py-6">
      <header className="flex flex-col gap-2 text-center">
        <p className="text-sm text-felt-muted">Código da sala</p>
        <RoomCodeTiles code={room.code} />
      </header>

      <Card className="shadow-xl">
        <CardContent className="flex flex-col gap-4">
          {inviteUrl && (
            <div className="flex flex-col gap-2">
              <p className="text-sm font-medium">
                Mande o link no grupo dos amigos
              </p>
              <InviteLink url={inviteUrl} />
            </div>
          )}

          <SeatList room={room} onKick={kickPlayer} />

          {refusal && <RefusalMessage>{refusal}</RefusalMessage>}

          {viewerIsHost ? (
            <div className="flex flex-col gap-2">
              <GameButton
                tone="gold"
                disabled={!room.canStart || busy}
                onClick={startMatch}
                className="w-full"
              >
                <Play aria-hidden />
                Iniciar partida
              </GameButton>
              {!room.canStart && (
                <p className="text-center text-sm text-muted-foreground">
                  {missing > 0
                    ? `Falta ${missing} jogador para começar.`
                    : `A partida precisa de ${MIN_PLAYERS} a ${MAX_PLAYERS} jogadores.`}
                </p>
              )}
            </div>
          ) : (
            <p
              role="status"
              className="text-center text-sm text-muted-foreground"
            >
              Aguardando {host?.nickname ?? "o anfitrião"} iniciar a partida.
            </p>
          )}

          <LeaveRoomButton className="w-full" />
        </CardContent>
      </Card>
    </main>
  )
}
