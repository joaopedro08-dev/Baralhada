import type {
  TeamIndex,
  TrucoPlayer,
  TrucoState,
} from "@/lib/game/domain/truco/types"
import type { PlayerId } from "@/lib/game/domain/types"

const TEAM_NAMES = ["Time A", "Time B"] as const

export const teamLabel = (team: number): string =>
  TEAM_NAMES[team as TeamIndex] ?? `Time ${team + 1}`

export const otherTeam = (team: TeamIndex): TeamIndex => (team === 0 ? 1 : 0)

const listNames = (names: readonly string[]): string =>
  names.length < 2
    ? (names[0] ?? "")
    : `${names.slice(0, -1).join(", ")} e ${names.at(-1)}`

export const membersOf = (
  game: TrucoState,
  team: TeamIndex
): readonly TrucoPlayer[] =>
  game.players.filter((player) => player.team === team)

export const teamNames = (game: TrucoState, team: TeamIndex): string =>
  listNames(membersOf(game, team).map((player) => player.nickname))

export const sideLabel = (game: TrucoState, team: TeamIndex): string => {
  if (game.viewerTeam === null) return teamNames(game, team)
  if (team === game.viewerTeam) return game.players.length > 2 ? "Nós" : "Você"
  return game.players.length > 2 ? "Eles" : teamNames(game, team)
}

export const nicknameOf = (game: TrucoState, playerId: PlayerId): string =>
  game.players.find((player) => player.id === playerId)?.nickname ?? "Jogador"

export const seatsFromViewer = (
  game: TrucoState,
  viewerId: PlayerId
): readonly TrucoPlayer[] => {
  const index = game.players.findIndex((player) => player.id === viewerId)
  if (index < 0) return game.players
  return [...game.players.slice(index), ...game.players.slice(0, index)]
}
