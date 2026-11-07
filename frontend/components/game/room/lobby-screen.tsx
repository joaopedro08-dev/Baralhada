"use client"

import { BookOpen, CheckCircle2, Hourglass, Play, Spade } from "lucide-react"

import { SuitIcon } from "@/components/game/cards/card-face"
import { GAME_IDENTITY } from "@/components/game/game-identity"
import { GameButton } from "@/components/game/game-button"
import { GamePicker } from "@/components/game/game-picker"
import { RefusalMessage } from "@/components/game/refusal-message"
import { HintsSetting } from "@/components/game/room/hints-setting"
import { LeaveRoomButton } from "@/components/game/room/leave-button"
import { LobbyTable } from "@/components/game/room/lobby-table"
import { RoomTicket } from "@/components/game/room/room-ticket"
import { TeamBoard } from "@/components/game/room/team-board"
import { useRoomCommands } from "@/components/game/room/use-room-commands"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { Separator } from "@/components/ui/separator"
import { Spinner } from "@/components/ui/spinner"
import {
  describePlayerCounts,
  describeStartProblem,
  gameInfo,
} from "@/lib/game/domain/catalog"
import { minimumPlayers, readiness } from "@/lib/game/domain/lobby"
import type { RoomState } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

function LobbyHeader() {
  return (
    <header className="flex items-center gap-2">
      <p className="mr-auto inline-flex items-center gap-2 font-heading text-lg font-extrabold text-gold">
        <span
          aria-hidden
          className="flex h-7 w-5 -rotate-8 items-center justify-center rounded-[0.3rem] bg-playing-card shadow ring-1 ring-black/25"
        >
          <Spade fill="currentColor" className="size-3 text-suit-black" />
        </span>
        Baralhada
      </p>
      <Badge
        variant="outline"
        className="h-7 gap-1.5 border-felt-line px-2.5 text-xs text-felt-foreground"
      >
        <span
          aria-hidden
          className="size-2 rounded-full bg-emerald-300 motion-safe:animate-pulse"
        />
        Saguão
      </Badge>
      <LeaveRoomButton className="text-felt-foreground hover:bg-felt-deep hover:text-felt-foreground" />
    </header>
  )
}

function GameSection({
  room,
  editable,
  busy,
  onChoose,
}: {
  room: RoomState
  editable: boolean
  busy: boolean
  onChoose: (gameId: RoomState["gameId"]) => void
}) {
  const game = gameInfo(room.gameId)
  const { suit, accent } = GAME_IDENTITY[room.gameId]
  return (
    <section aria-labelledby="titulo-jogo" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <h2 id="titulo-jogo" className="font-heading text-lg font-semibold">
          {editable ? "Escolha o jogo" : "Jogo da sala"}
        </h2>
        <a
          href={`/informacoes#${game.rulesAnchor}`}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex min-h-11 items-center gap-1.5 rounded-md px-1 text-sm font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-2 focus-visible:ring-gold"
        >
          <BookOpen aria-hidden className="size-4" />
          Regras
          <span className="sr-only">de {game.name} (abre em nova aba)</span>
        </a>
      </div>
      {editable ? (
        <GamePicker
          value={room.gameId}
          onChange={onChoose}
          disabled={busy}
          label="Jogo da sala"
        />
      ) : (
        <div className="flex items-center gap-3 rounded-xl bg-felt-deep p-3 text-felt-foreground">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-playing-card shadow">
            <SuitIcon suit={suit} className="size-6" />
          </span>
          <span className="flex min-w-0 flex-col">
            <strong className={cn("font-heading text-lg", accent)}>
              {game.name}
            </strong>
            <span className="text-sm text-felt-muted">
              {describePlayerCounts(game)} · {game.mode}
            </span>
          </span>
        </div>
      )}
    </section>
  )
}

function StartDock({
  room,
  busy,
  onStart,
}: {
  room: RoomState
  busy: boolean
  onStart: () => void
}) {
  const viewerIsHost = room.hostId === room.viewerId
  const host = room.players.find((player) => player.id === room.hostId)
  const game = gameInfo(room.gameId)
  const problem = describeStartProblem(room)
  const ready = room.canStart
  const minimum = minimumPlayers(room)

  return (
    <div className="sticky bottom-3 z-20 flex flex-col gap-3 rounded-2xl bg-felt-deep/95 p-3 text-felt-foreground shadow-2xl ring-1 ring-gold/40 backdrop-blur sm:p-4 lg:col-start-2">
      <div className="flex items-center gap-3">
        {ready ? (
          <CheckCircle2
            aria-hidden
            className="size-5 shrink-0 text-emerald-300"
          />
        ) : (
          <Hourglass aria-hidden className="size-5 shrink-0 text-gold" />
        )}
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <p role="status" className="text-sm font-medium">
            {ready
              ? `Tudo pronto: ${room.players.length} na mesa.`
              : (problem ?? `Mínimo de ${minimum} jogadores.`)}
          </p>
          <Progress
            value={readiness(room)}
            aria-label="Jogadores para começar"
            className="h-1.5 bg-felt-line/40 [&>[data-slot=progress-indicator]]:bg-gold"
          />
        </div>
      </div>
      {viewerIsHost ? (
        <GameButton
          tone="gold"
          disabled={!ready || busy}
          onClick={onStart}
          className="h-12 w-full text-base"
        >
          {busy ? <Spinner aria-hidden /> : <Play aria-hidden />}
          Iniciar {game.name}
        </GameButton>
      ) : (
        <p className="flex min-h-11 items-center justify-center gap-2 rounded-xl bg-felt px-3 text-center text-sm text-felt-muted">
          <Spinner aria-hidden className="size-4" />
          Aguardando {host?.nickname ?? "o anfitrião"} iniciar a partida.
        </p>
      )}
    </div>
  )
}

export function LobbyScreen({
  room,
  inviteUrl,
}: {
  room: RoomState
  inviteUrl: string | null
}) {
  const commands = useRoomCommands()
  const { refusal, busy, startMatch, kickPlayer } = commands
  const viewerIsHost = room.hostId === room.viewerId

  return (
    <main className="hero-glow min-h-svh">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 pt-4 pb-6 sm:pt-6">
        <LobbyHeader />
        <RoomTicket code={room.code} inviteUrl={inviteUrl} />

        <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.2fr_1fr] lg:items-start">
          <div className="rounded-3xl bg-felt-deep/50 p-4 ring-1 ring-felt-line sm:p-5 lg:row-span-2">
            <LobbyTable room={room} onKick={kickPlayer} />
          </div>

          <Card className="shadow-xl">
            <CardContent className="flex flex-col gap-5">
              <GameSection
                room={room}
                editable={viewerIsHost}
                busy={busy}
                onChoose={commands.chooseGame}
              />
              <Separator />
              <HintsSetting
                allowed={room.hintsAllowed}
                editable={viewerIsHost}
                busy={busy}
                onChange={commands.allowHints}
              />
              {room.teams && (
                <>
                  <Separator />
                  <TeamBoard
                    room={room}
                    busy={busy}
                    onMove={commands.moveToTeam}
                    onDraw={commands.drawTeams}
                  />
                </>
              )}
              {refusal && <RefusalMessage>{refusal}</RefusalMessage>}
            </CardContent>
          </Card>

          <StartDock room={room} busy={busy} onStart={startMatch} />
        </div>
      </div>
    </main>
  )
}
