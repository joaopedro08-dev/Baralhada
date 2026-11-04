"use client"

import {
  ArrowDownToLine,
  ArrowUpFromLine,
  Check,
  FastForward,
  Hand,
  HandGrab,
  Layers,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { isActionOpen } from "@/lib/game/domain/selection"
import type { GameState, TurnActionKind } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

const ACTIONS: readonly {
  readonly kind: TurnActionKind
  readonly label: string
  readonly explanation: string
  readonly Icon: LucideIcon
}[] = [
  {
    kind: "draw",
    label: "Comprar",
    explanation:
      "Compra 1 carta do monte. Depois, use a carta em uma jogada ou descarte 1 para fechar.",
    Icon: Layers,
  },
  {
    kind: "layDown",
    label: "Baixar",
    explanation: "Baixa as cartas selecionadas na sua área e fecha o turno.",
    Icon: ArrowDownToLine,
  },
  {
    kind: "takeFromTable",
    label: "Pegar",
    explanation:
      "Junta cartas da mesa com cartas iguais da mão e fecha o turno.",
    Icon: Hand,
  },
  {
    kind: "steal",
    label: "Roubar",
    explanation:
      "Rouba uma quadra incompleta do mesmo valor das suas cartas e fecha o turno.",
    Icon: HandGrab,
  },
  {
    kind: "discard",
    label: "Descartar",
    explanation: "Coloca 1 carta da sua mão na mesa e fecha o turno.",
    Icon: ArrowUpFromLine,
  },
]

export function ActionBar({
  game,
  isMyTurn,
  busy,
  suggested,
  onAction,
  onPass,
}: {
  game: GameState
  isMyTurn: boolean
  busy: boolean
  suggested: TurnActionKind | null
  onAction: (kind: TurnActionKind) => void
  onPass: () => void
}) {
  return (
    <div className="flex flex-col gap-1 sm:gap-2 lg:mx-auto lg:w-full lg:max-w-2xl">
      <div className="grid grid-cols-5 gap-1 sm:gap-2">
        {ACTIONS.map(({ kind, label, explanation, Icon }) => {
          const used = game.usedActions.includes(kind)
          const highlighted = isMyTurn && suggested === kind
          return (
            <Tooltip key={kind}>
              <TooltipTrigger asChild>
                <span className="block">
                  <GameButton
                    tone={highlighted ? "gold" : "felt"}
                    disabled={!isMyTurn || !isActionOpen(game, kind) || busy}
                    aria-label={used ? `${label}: já feita neste turno` : label}
                    data-action={kind}
                    onClick={() => onAction(kind)}
                    className={cn(
                      "h-13 w-full min-w-0 flex-col gap-0.5 px-0 text-xs tracking-tight sm:text-sm short:text-xs",
                      highlighted && "suggest-pulse"
                    )}
                  >
                    {used ? <Check aria-hidden /> : <Icon aria-hidden />}
                    {label}
                  </GameButton>
                </span>
              </TooltipTrigger>
              <TooltipContent>{explanation}</TooltipContent>
            </Tooltip>
          )
        })}
      </div>

      <GameButton
        disabled={!isMyTurn || !game.canEndTurn || busy}
        data-action="pass"
        onClick={onPass}
      >
        <FastForward aria-hidden />
        Passar a vez
      </GameButton>
    </div>
  )
}
