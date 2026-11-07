"use client"

import { ChevronsUp, Hand, Plus, Split } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import type {
  BlackjackAction,
  BlackjackHints,
  BlackjackMoves,
  Play,
} from "@/lib/game/domain/blackjack/types"
import { cn } from "@/lib/utils"

const BUTTONS: readonly {
  readonly play: Play
  readonly label: string
  readonly icon: typeof Plus
}[] = [
  { play: "hit", label: "Pedir", icon: Plus },
  { play: "stand", label: "Parar", icon: Hand },
  { play: "double", label: "Dobrar", icon: ChevronsUp },
  { play: "split", label: "Dividir", icon: Split },
]

export function PlayActions({
  moves,
  hints,
  busy,
  onAction,
}: {
  moves: BlackjackMoves
  hints: BlackjackHints | null
  busy: boolean
  onAction: (action: BlackjackAction) => void
}) {
  const advised = hints?.advice?.play
  const available = BUTTONS.filter((button) => moves[button.play])
  return (
    <div className="flex flex-col gap-2">
      {hints?.advice && (
        <p className="text-center text-sm font-medium text-gold">
          {hints.advice.sentence}
        </p>
      )}
      <div className="grid grid-cols-2 gap-2 sm:flex sm:justify-center">
        {available.map(({ play, label, icon: Icon }) => (
          <GameButton
            key={play}
            tone={advised === play ? "gold" : "felt"}
            disabled={busy}
            onClick={() => onAction({ type: play })}
            className={cn(
              "sm:min-w-28",
              advised === play &&
                "animate-[suggest-pulse_1.6s_ease-in-out_infinite]"
            )}
          >
            <Icon aria-hidden />
            {label}
          </GameButton>
        ))}
      </div>
    </div>
  )
}
