import { m } from "framer-motion"

import { Badge } from "@/components/ui/badge"
import {
  modeLabel,
  pointsLabel,
  roundMarks,
  stakeName,
} from "@/lib/game/domain/truco/guide"
import type { RoundMark } from "@/lib/game/domain/truco/guide"
import { sideLabel } from "@/lib/game/domain/truco/teams"
import type { TeamIndex, TrucoState } from "@/lib/game/domain/truco/types"
import { cn } from "@/lib/utils"

const TEAM_TONES = ["ring-sky-400", "ring-rose-400"] as const

const MARK_STYLES: Readonly<Record<RoundMark, string>> = {
  won: "bg-gold text-gold-foreground",
  lost: "bg-rose-500 text-white",
  tie: "bg-felt-line text-felt-foreground",
  pending: "bg-transparent ring-1 ring-felt-line text-felt-muted",
}

const MARK_LABELS: Readonly<Record<RoundMark, string>> = {
  won: "ganha",
  lost: "perdida",
  tie: "empatada",
  pending: "por jogar",
}

const MARK_SYMBOLS: Readonly<Record<RoundMark, string>> = {
  won: "✓",
  lost: "✗",
  tie: "=",
  pending: "",
}

function TeamScore({ game, team }: { game: TrucoState; team: TeamIndex }) {
  const mine = team === game.viewerTeam
  return (
    <div
      className={cn(
        "flex min-w-0 flex-1 items-center justify-between gap-2 rounded-lg bg-felt px-3 py-1.5 ring-2",
        TEAM_TONES[team],
        mine && "bg-felt-glow"
      )}
    >
      <span className="min-w-0 truncate text-sm font-semibold">
        {sideLabel(game, team)}
      </span>
      <m.span
        key={game.scores[team]}
        aria-label={pointsLabel(game.scores[team])}
        initial={{ scale: 1.8, y: -6, color: "var(--gold)" }}
        animate={{ scale: 1, y: 0, color: "var(--felt-foreground)" }}
        transition={{ type: "spring", stiffness: 420, damping: 14 }}
        className="font-heading text-2xl leading-none font-bold tabular-nums"
      >
        {game.scores[team]}
      </m.span>
    </div>
  )
}

export function TrucoScoreboard({ game }: { game: TrucoState }) {
  const mode = modeLabel(game)
  return (
    <section
      aria-label="Placar"
      className="flex flex-col gap-2 border-b border-felt-line bg-felt-deep px-3 py-2"
    >
      <div className="flex items-stretch gap-2">
        <TeamScore game={game} team={0} />
        <TeamScore game={game} team={1} />
      </div>
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <m.span
          key={game.stake}
          initial={{ scale: 1.5, rotate: -6 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 420, damping: 12 }}
        >
          <Badge className="h-7 bg-gold px-2 text-sm text-gold-foreground">
            Vale {pointsLabel(game.stake)}
          </Badge>
        </m.span>
        {game.request && (
          <Badge variant="outline" className="h-7 border-gold px-2 text-sm">
            Pedido: {stakeName(game.request.stake)}
          </Badge>
        )}
        {mode && (
          <Badge variant="outline" className="h-7 px-2 text-sm">
            {mode}
          </Badge>
        )}
        <span className="text-felt-muted">Mão {game.handNumber}</span>
        <ol aria-label="Rodadas da mão" className="ml-auto flex gap-1">
          {roundMarks(game).map((mark, round) => (
            <li
              key={round}
              aria-label={`${round + 1}ª rodada ${MARK_LABELS[mark]}`}
              className={cn(
                "flex size-7 items-center justify-center rounded-full text-xs font-bold",
                MARK_STYLES[mark]
              )}
            >
              <span aria-hidden>{MARK_SYMBOLS[mark] || round + 1}</span>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
