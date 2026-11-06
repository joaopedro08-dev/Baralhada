"use client"

import { m } from "framer-motion"
import { RotateCcw, Trophy } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { GamePicker } from "@/components/game/game-picker"
import { RefusalMessage } from "@/components/game/refusal-message"
import { InviteLink } from "@/components/game/room/invite-link"
import { LeaveRoomButton } from "@/components/game/room/leave-button"
import { TeamBoard } from "@/components/game/room/team-board"
import { HintsSetting } from "@/components/game/room/hints-setting"
import { useRoomCommands } from "@/components/game/room/use-room-commands"
import { useVictoryShow } from "@/components/game/room/use-victory-show"
import { Card, CardContent } from "@/components/ui/card"
import { describeStartProblem } from "@/lib/game/domain/catalog"
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
  const { refusal, busy, startMatch } = commands
  const viewerWon =
    game.winnerTeam !== null && game.winnerTeam === game.viewerTeam
  const { stage, title } = useVictoryShow(viewerWon)
  const viewerIsHost = room.hostId === room.viewerId
  const host = room.players.find((player) => player.id === room.hostId)
  const problem = describeStartProblem(room)

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
            {describeTrucoResult(game)}
          </h1>
          <p className="text-felt-muted">{explainTrucoEnd(game)}</p>
        </header>

        <Card className="shadow-xl">
          <CardContent className="flex flex-col gap-4">
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

            {room.teams && (
              <TeamBoard
                room={room}
                busy={busy}
                onMove={commands.moveToTeam}
                onDraw={commands.drawTeams}
              />
            )}

            {room.startProblem === "NOT_ENOUGH_PLAYERS" && inviteUrl && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium">
                  Chame alguém para jogar de novo
                </p>
                <InviteLink url={inviteUrl} />
              </div>
            )}

            {refusal && <RefusalMessage>{refusal}</RefusalMessage>}

            {viewerIsHost ? (
              <div className="flex flex-col gap-2">
                <GameButton
                  tone="gold"
                  disabled={!room.canStart || busy}
                  onClick={startMatch}
                  className="w-full"
                >
                  <RotateCcw aria-hidden />
                  Jogar de novo
                </GameButton>
                {problem && (
                  <p className="text-center text-sm text-muted-foreground">
                    {problem}
                  </p>
                )}
              </div>
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
