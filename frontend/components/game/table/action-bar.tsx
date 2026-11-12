"use client"

import {
  ArrowUpFromLine,
  Hand,
  HandGrab,
  Layers,
  PackagePlus,
} from "lucide-react"
import type { LucideIcon } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { isActionAvailable } from "@/lib/game/domain/selection"
import type {
  GameState,
  PlayerId,
  TurnActionKind,
} from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

interface ActionInfo {
  readonly kind: TurnActionKind
  readonly label: string
  readonly explanation: string
  readonly Icon: LucideIcon
}

const ACTIONS: readonly ActionInfo[] = [
  {
    kind: "draw",
    label: "Comprar",
    explanation:
      "Compra 1 carta do baralho. Com 5 cartas, descarte, capture, ponha no monte ou roube para fechar o turno.",
    Icon: PackagePlus,
  },
  {
    kind: "capture",
    label: "Capturar",
    explanation:
      "Junta a carta da mão com cartas de mesmo valor da mesa e leva tudo para o seu monte.",
    Icon: Hand,
  },
  {
    kind: "stack",
    label: "No monte",
    explanation:
      "Põe a carta da mão em cima do seu monte, se tiver o mesmo valor do topo.",
    Icon: Layers,
  },
  {
    kind: "steal",
    label: "Roubar",
    explanation:
      "Usa uma carta igual ao topo do monte de um adversário e leva o monte inteiro.",
    Icon: HandGrab,
  },
  {
    kind: "discard",
    label: "Descartar",
    explanation: "Coloca a carta da mão na mesa, virada para cima.",
    Icon: ArrowUpFromLine,
  },
]

export function ActionBar({
  game,
  viewerId,
  isMyTurn,
  busy,
  suggested,
  onAction,
}: {
  game: GameState
  viewerId: PlayerId
  isMyTurn: boolean
  busy: boolean
  suggested: TurnActionKind | null
  onAction: (kind: TurnActionKind) => void
}) {
  const renderAction = ({ kind, label, explanation, Icon }: ActionInfo) => {
    const highlighted = isMyTurn && suggested === kind
    return (
      <Tooltip key={kind}>
        <TooltipTrigger asChild>
          <span className="block">
            <GameButton
              tone={highlighted ? "gold" : "felt"}
              disabled={
                !isMyTurn || busy || !isActionAvailable(game, viewerId, kind)
              }
              data-action={kind}
              onClick={() => onAction(kind)}
              className={cn(
                "h-13 w-full min-w-0 flex-col gap-0.5 px-0 text-xs tracking-tight sm:text-sm short:text-xs",
                highlighted && "suggest-pulse"
              )}
            >
              <Icon aria-hidden />
              {label}
            </GameButton>
          </span>
        </TooltipTrigger>
        <TooltipContent>{explanation}</TooltipContent>
      </Tooltip>
    )
  }

  return (
    <div className="grid min-w-0 grid-cols-5 gap-1 sm:gap-2 lg:mx-auto lg:w-full lg:max-w-2xl">
      {ACTIONS.map(renderAction)}
    </div>
  )
}
