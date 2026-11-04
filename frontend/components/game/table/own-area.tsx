import { ShieldAlert } from "lucide-react"

import { MeldChip } from "@/components/game/cards/meld-chip"
import { countCompleteMelds, plural, sortMelds } from "@/lib/game/domain/cards"
import { playerAnchor } from "@/lib/game/domain/table-changes"
import type { GamePlayer, Hints, PlayerId } from "@/lib/game/domain/types"

export function OwnArea({
  viewerId,
  player,
  hints,
}: {
  viewerId: PlayerId
  player: GamePlayer | undefined
  hints: Hints | null
}) {
  const melds = player?.melds ?? []
  return (
    <section
      aria-labelledby="titulo-area"
      data-anchor={playerAnchor(viewerId)}
      className="flex flex-col gap-2"
    >
      <h2 id="titulo-area" className="font-heading text-sm font-semibold">
        Sua área ({plural(countCompleteMelds(melds), "quadra", "quadras")})
      </h2>
      {melds.length > 0 ? (
        <div data-own-area className="flex flex-wrap gap-1.5">
          {sortMelds(melds).map((meld) => (
            <MeldChip key={meld.rank} meld={meld} />
          ))}
        </div>
      ) : (
        <p className="text-sm text-felt-muted">
          Baixe ao menos 2 cartas iguais para abrir uma quadra.
        </p>
      )}
      {hints?.risks.map((risk) => (
        <p
          key={risk.rank}
          className="flex items-start gap-1.5 text-sm text-felt-muted"
        >
          <ShieldAlert
            aria-hidden
            className="mt-0.5 size-4 shrink-0 text-gold"
          />
          {risk.sentence}
        </p>
      ))}
    </section>
  )
}
