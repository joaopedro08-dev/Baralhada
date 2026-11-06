"use client"

import { m } from "framer-motion"
import { RotateCcw, Trophy } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { GamePicker } from "@/components/game/game-picker"
import { RefusalMessage } from "@/components/game/refusal-message"
import { HintsSetting } from "@/components/game/room/hints-setting"
import { InviteLink } from "@/components/game/room/invite-link"
import { LeaveRoomButton } from "@/components/game/room/leave-button"
import { useRoomCommands } from "@/components/game/room/use-room-commands"
import { useVictoryShow } from "@/components/game/room/use-victory-show"
import { Card, CardContent } from "@/components/ui/card"
import { describeStartProblem } from "@/lib/game/domain/catalog"
import type { RoomState } from "@/lib/game/domain/types"

type RoomCommands = ReturnType<typeof useRoomCommands>

export function MatchEnd({
  won,
  title,
  subtitle,
  children,
}: {
  won: boolean
  title: string
  subtitle: string | null
  children: React.ReactNode
}) {
  const { stage, title: titleRef } = useVictoryShow(won)
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
            ref={titleRef}
            className="font-heading text-3xl font-bold text-balance"
          >
            {title}
          </h1>
          {subtitle && <p className="text-felt-muted">{subtitle}</p>}
        </header>

        <Card className="shadow-xl">
          <CardContent className="flex flex-col gap-4">{children}</CardContent>
        </Card>
      </main>
    </div>
  )
}

export function RematchControls({
  room,
  inviteUrl,
  commands,
  roster,
}: {
  room: RoomState
  inviteUrl: string | null
  commands: RoomCommands
  roster?: React.ReactNode
}) {
  const { refusal, busy, startMatch } = commands
  const viewerIsHost = room.hostId === room.viewerId
  const host = room.players.find((player) => player.id === room.hostId)
  const problem = describeStartProblem(room)

  return (
    <>
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

      {roster}

      {room.startProblem === "NOT_ENOUGH_PLAYERS" && inviteUrl && (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">Chame alguém para jogar de novo</p>
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
        <p role="status" className="text-center text-sm text-muted-foreground">
          Aguardando {host?.nickname ?? "o anfitrião"} começar outra partida.
        </p>
      )}

      <LeaveRoomButton className="w-full" />
    </>
  )
}
