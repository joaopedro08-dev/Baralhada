"use client"

import { WifiOff } from "lucide-react"

import { SeatHands } from "@/components/game/blackjack/seat-hands"
import { ChipCount, ChipStack } from "@/components/game/poker/chips"
import { PlayerAvatar } from "@/components/game/room/player-avatar"
import { Badge } from "@/components/ui/badge"
import { resultsFor } from "@/lib/game/domain/blackjack/guide"
import type {
  BlackjackSeat,
  BlackjackState,
} from "@/lib/game/domain/blackjack/types"
import { cn } from "@/lib/utils"

const statusOf = (seat: BlackjackSeat, game: BlackjackState): string | null => {
  if (seat.status === "broke") return "sem fichas"
  if (game.phase !== "betting") return null
  return seat.bet === null ? "apostando..." : "apostou"
}

export function BlackjackSeatPanel({
  seat,
  game,
  connected,
}: {
  seat: BlackjackSeat
  game: BlackjackState
  connected: boolean
}) {
  const current = game.currentPlayerId === seat.id
  const status = statusOf(seat, game)
  return (
    <li
      data-player={seat.nickname}
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-xl bg-felt-deep/90 p-2 ring-1 ring-felt-line transition-shadow",
        current && "shadow-[0_0_0_2px_var(--gold)]",
        seat.status === "broke" && "opacity-55 grayscale"
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <PlayerAvatar playerId={seat.id} nickname={seat.nickname} size="sm" />
        <span className="min-w-0 truncate text-sm font-semibold">
          {seat.nickname}
        </span>
        {current && (
          <Badge className="h-5 bg-gold text-xs font-bold text-gold-foreground">
            Vez
          </Badge>
        )}
        {!connected && (
          <WifiOff aria-label="caiu" className="size-3.5 text-felt-muted" />
        )}
        <ChipCount
          value={seat.chips}
          className="ml-auto text-sm font-bold text-gold"
        />
      </div>
      {seat.hands.length > 0 ? (
        <SeatHands
          hands={seat.hands}
          round={game.round}
          results={resultsFor(game, seat.id)}
          activeIndex={current ? game.handIndex : null}
          size="small"
        />
      ) : (
        <div className="flex h-10 items-center justify-center gap-2 text-xs text-felt-muted">
          {seat.bet !== null && <ChipStack amount={seat.bet} />}
          {status}
        </div>
      )}
    </li>
  )
}
