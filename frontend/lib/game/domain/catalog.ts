import type { Card, GameId, RoomState } from "@/lib/game/domain/types"

export interface GameInfo {
  readonly id: GameId
  readonly name: string
  readonly tagline: string
  readonly playerCounts: readonly number[]
  readonly teamCount: number | null
  readonly deck: string
  readonly turnSeconds: number
  readonly mode: string
  readonly highlights: readonly string[]
  readonly sample: readonly Card[]
  readonly rulesAnchor: string
}

export const GAMES: readonly GameInfo[] = [
  {
    id: "rouba-monte",
    name: "Rouba Monte",
    tagline: "Capture cartas, roube o monte dos amigos e termine com o maior.",
    playerCounts: [2, 3, 4, 5, 6],
    teamCount: null,
    deck: "52 cartas",
    turnSeconds: 60,
    mode: "Cada um por si",
    highlights: [
      "Capture cartas iguais às da mesa",
      "Roube o monte de quem tem a mesma carta no topo",
      "Vence quem termina com o maior monte",
    ],
    sample: ["7C", "KH", "AS"],
    rulesAnchor: "regras-rouba-monte",
  },
  {
    id: "truco-paulista",
    name: "Truco Paulista",
    tagline: "Duplas ou trios, manilha pela vira e truco até 12 pontos.",
    playerCounts: [2, 4, 6],
    teamCount: 2,
    deck: "40 cartas, sem 8, 9 e 10",
    turnSeconds: 30,
    mode: "Em times",
    highlights: [
      "A manilha muda a cada mão, de acordo com a vira",
      "Peça truco, seis, nove e doze para blefar ou pressionar",
      "Vence o time que chega primeiro a 12 pontos",
    ],
    sample: ["4C", "7H", "3D"],
    rulesAnchor: "regras-truco",
  },
]

export const DEFAULT_GAME_ID: GameId = "rouba-monte"

export const gameInfo = (gameId: GameId): GameInfo =>
  GAMES.find((game) => game.id === gameId) ?? (GAMES[0] as GameInfo)

export const maxPlayersOf = (game: GameInfo): number =>
  Math.max(...game.playerCounts)

export const describePlayerCounts = ({ playerCounts }: GameInfo): string => {
  const first = playerCounts[0] ?? 0
  const last = playerCounts.at(-1) ?? 0
  const consecutive = last - first + 1 === playerCounts.length
  if (consecutive) return `${first} a ${last} jogadores`
  return `${playerCounts.slice(0, -1).join(", ")} ou ${last} jogadores`
}

export const describeStartProblem = (room: RoomState): string | null => {
  const game = gameInfo(room.gameId)
  if (room.startProblem === "TEAMS_UNBALANCED") {
    return "Os times precisam ter o mesmo número de jogadores."
  }
  if (room.startProblem !== "NOT_ENOUGH_PLAYERS") return null
  const accepted = `${game.name} aceita ${describePlayerCounts(game)}.`
  const next = game.playerCounts.find((count) => count > room.players.length)
  if (next === undefined) return accepted
  const missing = next - room.players.length
  return missing === 1
    ? `Falta 1 jogador para começar. ${accepted}`
    : `Faltam ${missing} jogadores para começar. ${accepted}`
}
