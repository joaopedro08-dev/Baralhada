import type {
  HandCategory,
  HandSummary,
  PlayerStatus,
  PokerPlayer,
  PokerState,
  Street,
} from "@/lib/game/domain/poker/types"
import type { PlayerId } from "@/lib/game/domain/types"

export const STARTING_CHIPS = 1000

export const HAND_NAMES: Readonly<Record<HandCategory, string>> = {
  highCard: "carta alta",
  pair: "par",
  twoPair: "dois pares",
  threeOfAKind: "trinca",
  straight: "sequência",
  flush: "flush",
  fullHouse: "full house",
  fourOfAKind: "quadra",
  straightFlush: "straight flush",
  royalFlush: "royal flush",
}

export const STREET_NAMES: Readonly<Record<Street, string>> = {
  preflop: "Pré-flop",
  flop: "Flop",
  turn: "Turn",
  river: "River",
}

const STATUS_LABELS: Partial<Readonly<Record<PlayerStatus, string>>> = {
  folded: "Desistiu",
  allIn: "All-in",
  out: "Fora",
}

export type Position = "D" | "SB" | "BB"

export const formatChips = (chips: number): string =>
  chips.toLocaleString("pt-BR")

export const playerOf = (
  game: PokerState,
  playerId: PlayerId
): PokerPlayer | undefined =>
  game.players.find((player) => player.id === playerId)

export const nicknameOf = (game: PokerState, playerId: PlayerId): string =>
  playerOf(game, playerId)?.nickname ?? "Alguém"

const nameFor = (game: PokerState, playerId: PlayerId, viewerId: PlayerId) =>
  playerId === viewerId ? "Você" : nicknameOf(game, playerId)

export const statusLabel = (status: PlayerStatus): string | null =>
  STATUS_LABELS[status] ?? null

export const positionsOf = (
  game: PokerState,
  playerId: PlayerId
): readonly Position[] => {
  const positions: Position[] = []
  if (game.buttonId === playerId) positions.push("D")
  if (game.smallBlindId === playerId) positions.push("SB")
  if (game.bigBlindId === playerId) positions.push("BB")
  return positions
}

export const describeTurn = (game: PokerState, viewerId: PlayerId): string =>
  game.currentPlayerId === viewerId
    ? "Sua vez"
    : `Vez de ${nicknameOf(game, game.currentPlayerId)}`

export const describeBlinds = (game: PokerState): string => {
  const { blinds, handsUntilBlindsRise: left } = game
  const now = `Blinds ${formatChips(blinds.small)}/${formatChips(blinds.big)}`
  if (left <= 1) return `${now} · dobram na próxima mão`
  return `${now} · dobram em ${left} mãos`
}

export const isInHand = (player: PokerPlayer | undefined): boolean =>
  player?.status === "active" || player?.status === "allIn"

export const describeNextStep = (
  game: PokerState,
  viewerId: PlayerId
): string => {
  const viewer = playerOf(game, viewerId)
  if (game.endReason !== null) return "A partida terminou."
  if (viewer?.status === "out") return "Você foi eliminado e está assistindo."
  if (viewer?.status === "folded") return "Você desistiu desta mão."
  if (viewer?.status === "allIn") return "Você está all-in. Torça pela mesa!"
  if (game.currentPlayerId !== viewerId) {
    return `Aguarde ${nicknameOf(game, game.currentPlayerId)}.`
  }
  const { moves } = game
  if (moves.call !== null) {
    return `Pague ${formatChips(moves.call)}, aumente ou desista.`
  }
  return "Passe ou aposte."
}

export const winnersOf = (summary: HandSummary): readonly PlayerId[] =>
  Object.entries(summary.winnings)
    .sort(([, first], [, second]) => second - first)
    .map(([playerId]) => playerId)

export const describeHandResult = (
  game: PokerState,
  summary: HandSummary,
  viewerId: PlayerId
): string => {
  const [main] = summary.pots
  const winners = main?.winnerIds ?? winnersOf(summary)
  const names = winners.map((id) => nameFor(game, id, viewerId))
  const who =
    names.length > 1
      ? `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`
      : (names[0] ?? "Alguém")
  if (!summary.showdown) return `${who} levou o pote`
  const category = main?.category ? ` com ${HAND_NAMES[main.category]}` : ""
  const verb = winners.length > 1 ? "dividiram o pote" : "ganhou"
  return `${who} ${verb}${category}`
}

export interface Standing {
  readonly player: PokerPlayer
  readonly place: number
}

export const standingsOf = (game: PokerState): readonly Standing[] => {
  const total = game.players.length
  const alive = game.players.filter(
    (player) => !game.eliminatedIds.includes(player.id)
  )
  const eliminated = [...game.eliminatedIds]
    .reverse()
    .map((id) => playerOf(game, id))
    .filter((player) => player !== undefined)
  return [...alive, ...eliminated].map((player) => ({
    player,
    place: alive.includes(player)
      ? 1
      : total - game.eliminatedIds.indexOf(player.id),
  }))
}

export const describeResult = (
  game: PokerState,
  viewerId: PlayerId
): string => {
  if (game.winnerId === null) return "Partida encerrada"
  return game.winnerId === viewerId
    ? "Você venceu!"
    : `${nicknameOf(game, game.winnerId)} venceu`
}

export const explainEnd = (game: PokerState): string =>
  game.endReason === "abandoned"
    ? "Os outros jogadores saíram, e a partida terminou."
    : `Ficou com todas as ${formatChips(game.players.length * STARTING_CHIPS)} fichas.`
