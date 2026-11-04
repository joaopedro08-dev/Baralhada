import type { Selection } from "@/lib/game/domain/selection"
import type { GameState } from "@/lib/game/domain/types"

interface TurnGuideInput {
  readonly game: GameState
  readonly selection: Selection
  readonly isMyTurn: boolean
  readonly currentName: string
  readonly topHint: string | null
}

const hasPick = ({ hand, tableCards, meld }: Selection): boolean =>
  hand.length > 0 || tableCards.length > 0 || meld !== null

export const describeNextStep = ({
  game,
  selection,
  isMyTurn,
  currentName,
  topHint,
}: TurnGuideInput): string => {
  if (!isMyTurn) return `Aguarde: é a vez de ${currentName}.`
  if (game.usedActions.includes("draw") && !game.canEndTurn) {
    return "Você comprou: use a carta em uma jogada ou descarte 1 para fechar o turno."
  }
  if (hasPick(selection)) {
    return "Agora escolha a jogada abaixo. Ela fecha o seu turno."
  }
  if (game.deckSize === 0 && !game.canEndTurn) {
    return "O monte acabou: faça uma jogada ou descarte 1 carta. Passar a vez fica bloqueado."
  }
  if (topHint) return `Dica: ${topHint}`
  return "Faça 1 jogada: compre, baixe, pegue da mesa, roube ou descarte."
}
