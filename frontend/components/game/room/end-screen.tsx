"use client"

import { m } from "framer-motion"
import { RotateCcw, Trophy } from "lucide-react"

import { PileStack } from "@/components/game/cards/pile-stack"
import { GameButton } from "@/components/game/game-button"
import { GamePicker } from "@/components/game/game-picker"
import { RefusalMessage } from "@/components/game/refusal-message"
import { InviteLink } from "@/components/game/room/invite-link"
import { LeaveRoomButton } from "@/components/game/room/leave-button"
import { PlayerAvatar } from "@/components/game/room/player-avatar"
import { SeatList } from "@/components/game/room/seat-list"
import { HintsSetting } from "@/components/game/room/hints-setting"
import { useRoomCommands } from "@/components/game/room/use-room-commands"
import { useVictoryShow } from "@/components/game/room/use-victory-show"
import { Card, CardContent } from "@/components/ui/card"
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
  const { refusal, busy, startMatch, kickPlayer } = commands
  const viewerWon = game.winnerIds.includes(room.viewerId)
  const { stage, title } = useVictoryShow(viewerWon)
  const viewerIsHost = room.hostId === room.viewerId
  const host = room.players.find((player) => player.id === room.hostId)
  const needsPlayers = room.startProblem === "NOT_ENOUGH_PLAYERS"

  return (
    <div ref={stage} className="relative overflow-hidden">
      <main className="relative mx-auto flex min-h-svh w-full max-w-lg flex-col justify-center gap-5 px-4 py-6">
        <header className="flex flex-col items-center gap-2 text-center">
          <m.span
            initial={{ scale: 0, rotate: -30 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 260, damping: 12 }}
          >
            <Trophy aria-hidden className="size-12 text-gold" />
          </m.span>
          <h1
            ref={title}
            className="font-heading text-3xl font-bold text-balance"
          >
            {describeResult(game, room.viewerId)}
          </h1>
          <p className="text-felt-muted">{explainEnd(game)}</p>
        </header>

        <Card className="shadow-xl">
          <CardContent className="flex flex-col gap-4">
            <section aria-labelledby="titulo-placar">
              <h2
                id="titulo-placar"
                className="font-heading text-lg font-semibold"
              >
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

            <SeatList room={room} onKick={kickPlayer} />

            {viewerIsHost && (
              <GamePicker
                value={room.gameId}
                onChange={commands.chooseGame}
                disabled={busy}
                label="Jogo da próxima partida"
              />
            )}

            <HintsSetting
              allowed={room.hintsAllowed}
              editable={viewerIsHost}
              busy={busy}
              onChange={commands.allowHints}
            />

            {needsPlayers && inviteUrl && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">
                  Chame alguém para jogar de novo
                </p>
                <InviteLink url={inviteUrl} />
              </div>
            )}

            {refusal && <RefusalMessage>{refusal}</RefusalMessage>}

            {viewerIsHost ? (
              <GameButton
                tone="gold"
                disabled={!room.canStart || busy}
                onClick={startMatch}
                className="w-full"
              >
                <RotateCcw aria-hidden />
                Jogar de novo
              </GameButton>
            ) : (
              <p
                role="status"
                className="text-center text-sm text-muted-foreground"
              >
                Aguardando {host?.nickname ?? "o anfitrião"} começar outra
                partida.
              </p>
            )}

            <LeaveRoomButton className="w-full" />
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
