import type { Selection } from "@/lib/game/domain/selection"
import type { GameState } from "@/lib/game/domain/types"

interface TurnGuideInput {
  readonly game: GameState
  readonly selection: Selection
  readonly isMyTurn: boolean
  readonly currentName: string
  readonly topHint: string | null
}

const hasPick = ({ card, tableCards, pile }: Selection): boolean =>
  card !== null || tableCards.length > 0 || pile !== null

export const describeNextStep = ({
  game,
  selection,
  isMyTurn,
  currentName,
  topHint,
}: TurnGuideInput): string => {
  if (!isMyTurn) return `Aguarde: é a vez de ${currentName}.`
  if (hasPick(selection)) {
    return "Agora escolha a jogada abaixo. Ela fecha o seu turno."
  }
  if (topHint) return `Dica: ${topHint}`
  if (game.deckSize === 0) {
    return "O baralho acabou: jogue com as cartas que restam na sua mão."
  }
  return "Escolha 1 carta da mão: capture da mesa, ponha no seu monte, roube um monte ou descarte."
}
