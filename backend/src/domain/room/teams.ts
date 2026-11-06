import type { RandomSource } from "../shared/random.js"
import { shuffle } from "../shared/random.js"
import type { PlayerId } from "../shared/seat.js"
import type { Room } from "./room.js"

export type TeamAssignments = Readonly<Record<PlayerId, number>>

type Seating = Pick<Room, "players" | "teamAssignments">

const assignedTeam = (room: Seating, playerId: PlayerId, position: number, teamCount: number) =>
  room.teamAssignments?.[playerId] ?? position % teamCount

export const teamsOf = (room: Seating, teamCount: number): readonly (readonly PlayerId[])[] => {
  const teams = Array.from({ length: teamCount }, (): PlayerId[] => [])
  room.players.forEach((player, position) => {
    teams[assignedTeam(room, player.id, position, teamCount)]?.push(player.id)
  })
  return teams
}

export const teamOf = (room: Seating, playerId: PlayerId, teamCount: number): number | null => {
  const team = teamsOf(room, teamCount).findIndex((members) => members.includes(playerId))
  return team < 0 ? null : team
}

export const areTeamsBalanced = (room: Seating, teamCount: number): boolean => {
  const sizes = teamsOf(room, teamCount).map((members) => members.length)
  return sizes.every((size) => size === sizes[0])
}

const toAssignments = (teams: readonly (readonly PlayerId[])[]): TeamAssignments =>
  Object.fromEntries(teams.flatMap((members, team) => members.map((id) => [id, team])))

export const lockTeams = <State>(room: Room<State>, teamCount: number): Room<State> => ({
  ...room,
  teamAssignments: toAssignments(teamsOf(room, teamCount)),
})

export const joinSmallestTeam = <State>(
  room: Room<State>,
  playerId: PlayerId,
  teamCount: number
): Room<State> => {
  if (room.teamAssignments === null) return room
  const others = { ...room, players: room.players.filter((player) => player.id !== playerId) }
  const sizes = teamsOf(others, teamCount).map((members) => members.length)
  const smallest = sizes.indexOf(Math.min(...sizes))
  return { ...room, teamAssignments: { ...room.teamAssignments, [playerId]: smallest } }
}

export const leaveTeam = <State>(room: Room<State>, playerId: PlayerId): Room<State> => {
  if (room.teamAssignments === null) return room
  const { [playerId]: _left, ...remaining } = room.teamAssignments
  return { ...room, teamAssignments: remaining }
}

export const moveToTeam = <State>(
  room: Room<State>,
  playerId: PlayerId,
  team: number,
  teamCount: number
): Room<State> => ({
  ...room,
  teamAssignments: { ...toAssignments(teamsOf(room, teamCount)), [playerId]: team },
})

export const drawTeams = <State>(
  room: Room<State>,
  teamCount: number,
  random: RandomSource
): Room<State> => {
  const drawn = shuffle(
    room.players.map((player) => player.id),
    random
  )
  return {
    ...room,
    teamAssignments: Object.fromEntries(drawn.map((id, position) => [id, position % teamCount])),
  }
}
