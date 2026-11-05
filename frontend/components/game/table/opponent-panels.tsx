import { Hand, WifiOff } from "lucide-react"

import { PileStack } from "@/components/game/cards/pile-stack"
import { PlayerAvatar } from "@/components/game/room/player-avatar"
import { Badge } from "@/components/ui/badge"
import { plural } from "@/lib/game/domain/cards"
import { pileHint } from "@/lib/game/domain/hint-focus"
import type { HintFocus } from "@/lib/game/domain/hint-focus"
import type { Selection } from "@/lib/game/domain/selection"
import { playerAnchor } from "@/lib/game/domain/table-changes"
import type {
  GamePlayer,
  GameState,
  PlayerId,
  RoomState,
} from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

function OpponentPanel({
  player,
  isCurrent,
  connected,
  selection,
  focus,
  onTogglePile,
}: {
  player: GamePlayer
  isCurrent: boolean
  connected: boolean
  selection: Selection
  focus: HintFocus
  onTogglePile?: (ownerId: PlayerId) => void
}) {
  return (
    <li
      data-player={player.nickname}
      data-anchor={playerAnchor(player.id)}
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-xl bg-felt-deep/90 p-2 pr-3 ring-1 ring-felt-line transition-shadow",
        isCurrent && "shadow-[0_0_0_2px_var(--gold)]"
      )}
    >
      <div className="flex min-w-0 flex-1 flex-col gap-1">
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
          {!connected && (
            <span className="inline-flex items-center gap-1">
              <WifiOff aria-hidden className="size-3.5" />
              caiu
            </span>
          )}
        </div>
      </div>
      <PileStack
        top={player.pileTop}
        size={player.pileSize}
        owner={player.nickname}
        selected={selection.pile === player.id}
        hint={pileHint(focus, player.id)}
        onToggle={
          onTogglePile && player.pileTop
            ? () => onTogglePile(player.id)
            : undefined
        }
      />
    </li>
  )
}

export function OpponentPanels({
  room,
  game,
  selection,
  focus,
  onTogglePile,
}: {
  room: RoomState
  game: GameState
  selection: Selection
  focus: HintFocus
  onTogglePile?: (ownerId: PlayerId) => void
}) {
  const opponents = game.players.filter((player) => player.id !== room.viewerId)
  return (
    <section aria-label="Adversários">
      <ul className="grid grid-cols-[repeat(auto-fit,minmax(9.5rem,1fr))] gap-2 pb-2">
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
            onTogglePile={onTogglePile}
          />
        ))}
      </ul>
    </section>
  )
}
