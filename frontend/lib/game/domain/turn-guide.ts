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
  if (game.canPass) {
    return "Você comprou e está com até 4 cartas: passe a vez."
  }
  if (game.drewThisTurn && !hasPick(selection)) {
    return "Você comprou: descarte, capture, ponha no monte ou roube para fechar o turno."
  }
  if (hasPick(selection)) {
    return "Agora escolha a jogada abaixo. Ela fecha o seu turno."
  }
  if (topHint) return `Dica: ${topHint}`
  if (game.deckSize === 0) {
    return "O baralho acabou: faça uma jogada com as cartas da sua mão."
  }
  return "Faça 1 jogada: capture, ponha no seu monte, roube, descarte ou compre 1 carta."
}
