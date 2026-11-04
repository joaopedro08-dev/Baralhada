import { Hand, WifiOff } from "lucide-react"

import { MeldChip } from "@/components/game/cards/meld-chip"
import { PlayerAvatar } from "@/components/game/room/player-avatar"
import { Badge } from "@/components/ui/badge"
import {
  countCompleteMelds,
  isCompleteMeld,
  plural,
  sortMelds,
} from "@/lib/game/domain/cards"
import { meldHint } from "@/lib/game/domain/hint-focus"
import type { HintFocus } from "@/lib/game/domain/hint-focus"
import type { Selection } from "@/lib/game/domain/selection"
import { playerAnchor } from "@/lib/game/domain/table-changes"
import type {
  GamePlayer,
  GameState,
  MeldTarget,
  RoomState,
} from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

function OpponentPanel({
  player,
  isCurrent,
  connected,
  selection,
  focus,
  onToggleTarget,
}: {
  player: GamePlayer
  isCurrent: boolean
  connected: boolean
  selection: Selection
  focus: HintFocus
  onToggleTarget?: (target: MeldTarget) => void
}) {
  const isTarget = (rank: string) =>
    selection.meld?.playerId === player.id && selection.meld.rank === rank

  return (
    <li
      data-player={player.nickname}
      data-anchor={playerAnchor(player.id)}
      className={cn(
        "flex min-w-0 flex-col gap-1.5 rounded-xl bg-felt-deep/90 p-2 ring-1 ring-felt-line transition-shadow",
        isCurrent && "shadow-[0_0_0_2px_var(--gold)]"
      )}
    >
      <div className="flex min-w-0 items-center gap-1.5">
        <PlayerAvatar
          playerId={player.id}
          nickname={player.nickname}
          size="sm"
        />
        <span className="min-w-0 truncate text-sm font-semibold">
          {player.nickname}
        </span>
        {isCurrent && (
          <Badge className="h-5 bg-gold text-xs font-bold text-gold-foreground">
            Vez
          </Badge>
        )}
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-sm text-felt-muted">
        <span className="inline-flex items-center gap-1">
          <Hand aria-hidden className="size-3.5" />
          {plural(player.handSize, "carta", "cartas")}
        </span>
        <span>
          {plural(countCompleteMelds(player.melds), "quadra", "quadras")}
        </span>
        {!connected && (
          <span className="inline-flex items-center gap-1">
            <WifiOff aria-hidden className="size-3.5" />
            caiu
          </span>
        )}
      </div>
      {player.melds.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {sortMelds(player.melds).map((meld) => (
            <MeldChip
              key={meld.rank}
              meld={meld}
              owner={player.nickname}
              selected={isTarget(meld.rank)}
              hint={meldHint(focus, player.id, meld.rank)}
              onToggle={
                onToggleTarget && !isCompleteMeld(meld)
                  ? () =>
                      onToggleTarget({ playerId: player.id, rank: meld.rank })
                  : undefined
              }
            />
          ))}
        </div>
      )}
    </li>
  )
}

export function OpponentPanels({
  room,
  game,
  selection,
  focus,
  onToggleTarget,
}: {
  room: RoomState
  game: GameState
  selection: Selection
  focus: HintFocus
  onToggleTarget?: (target: MeldTarget) => void
}) {
  const opponents = game.players.filter((player) => player.id !== room.viewerId)
  return (
    <section aria-label="Adversários">
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2">
        {opponents.map((player) => (
          <OpponentPanel
            key={player.id}
            player={player}
            isCurrent={player.id === game.currentPlayerId}
            connected={
              room.players.find((seated) => seated.id === player.id)
                ?.connected ?? false
            }
            selection={selection}
            focus={focus}
            onToggleTarget={onToggleTarget}
          />
        ))}
      </ul>
    </section>
  )
}
