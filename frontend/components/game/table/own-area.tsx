import { ShieldAlert } from "lucide-react"

import { PileStack } from "@/components/game/cards/pile-stack"
import { plural } from "@/lib/game/domain/cards"
import { pileHint } from "@/lib/game/domain/hint-focus"
import type { HintFocus } from "@/lib/game/domain/hint-focus"
import type { Selection } from "@/lib/game/domain/selection"
import { playerAnchor } from "@/lib/game/domain/table-changes"
import type { GamePlayer, Hints, PlayerId } from "@/lib/game/domain/types"

export function OwnArea({
  viewerId,
  player,
  hints,
  selection,
  focus,
  onTogglePile,
}: {
  viewerId: PlayerId
  player: GamePlayer | undefined
  hints: Hints | null
  selection: Selection
  focus: HintFocus
  onTogglePile?: (ownerId: PlayerId) => void
}) {
  const size = player?.pileSize ?? 0
  const top = player?.pileTop ?? null
  return (
    <section
      aria-labelledby="titulo-area"
      data-anchor={playerAnchor(viewerId)}
      className="flex flex-col gap-2"
    >
      <h2 id="titulo-area" className="font-heading text-sm font-semibold">
        Seu monte ({plural(size, "carta", "cartas")})
      </h2>
      <div className="flex items-center gap-3">
        <PileStack
          top={top}
          size={size}
          selected={selection.pile === viewerId}
          hint={pileHint(focus, viewerId)}
          onToggle={
            onTogglePile && top ? () => onTogglePile(viewerId) : undefined
          }
        />
        {!top && (
          <p className="text-sm text-felt-muted">
            Capture uma carta da mesa ou roube um monte para começar o seu.
          </p>
        )}
      </div>
      {hints?.risk && (
        <p className="flex items-start gap-1.5 text-sm text-felt-muted">
          <ShieldAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-gold"
          />
          {hints.risk.sentence}
        </p>
      )}
    </section>
  )
}
