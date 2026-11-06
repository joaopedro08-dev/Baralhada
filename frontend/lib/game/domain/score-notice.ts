import { plural } from "@/lib/game/domain/cards"
import type { PileStolen } from "@/lib/game/domain/table-changes"
import { describeHandSummary } from "@/lib/game/domain/truco/guide"
import { nicknameOf, sideLabel } from "@/lib/game/domain/truco/teams"
import type { TeamIndex, TrucoState } from "@/lib/game/domain/truco/types"
import type { Card, GameState, PlayerId } from "@/lib/game/domain/types"

export type NoticeTone = "good" | "bad" | "neutral"

export interface ScoreLine {
  readonly id: string
  readonly label: string
  readonly before: number
  readonly value: number
  readonly lead: boolean
  readonly mine: boolean
}

export interface ScoreNotice {
  readonly key: string
  readonly tone: NoticeTone
  readonly title: string
  readonly detail: string
  readonly lines: readonly ScoreLine[]
  readonly cards: readonly Card[]
}

const TEAMS: readonly TeamIndex[] = [0, 1]

const teamLines = (
  previous: TrucoState,
  next: TrucoState,
  leader: TeamIndex | null
): readonly ScoreLine[] =>
  TEAMS.map((team) => ({
    id: `time-${team}`,
    label: sideLabel(next, team),
    before: previous.scores[team],
    value: next.scores[team],
    lead: team === leader,
    mine: team === next.viewerTeam,
  }))

const toneFor = (game: TrucoState, winner: TeamIndex | null): NoticeTone => {
  if (winner === null || game.viewerTeam === null) return "neutral"
  return winner === game.viewerTeam ? "good" : "bad"
}

const handNotice = (previous: TrucoState, next: TrucoState): ScoreNotice => {
  const summary = next.lastHand as NonNullable<TrucoState["lastHand"]>
  const winner = summary.winnerTeam
  return {
    key: `mao-${summary.number}`,
    tone: toneFor(next, winner),
    title:
      winner === null
        ? "Mão empatada"
        : `${sideLabel(next, winner)} +${summary.points}`,
    detail: describeHandSummary(next, summary),
    lines: teamLines(previous, next, winner),
    cards: [],
  }
}

const shownNotice = (
  previous: TrucoState,
  next: TrucoState,
  playerId: PlayerId,
  cards: readonly Card[]
): ScoreNotice => {
  const self = Boolean(previous.lastHand?.runner?.cards)
  return {
    key: `mostrou-${next.lastHand?.number ?? 0}`,
    tone: "neutral",
    title: self
      ? "Você mostrou as cartas"
      : `${nicknameOf(next, playerId)} mostrou as cartas`,
    detail: "Era o que tinha na mão quando correu.",
    lines: teamLines(previous, next, null),
    cards,
  }
}

export const trucoNotice = (
  previous: TrucoState,
  next: TrucoState
): ScoreNotice | null => {
  const summary = next.lastHand
  if (!summary) return null
  if ((previous.lastHand?.number ?? 0) < summary.number) {
    return handNotice(previous, next)
  }
  const runner = summary.runner
  const before = previous.lastHand
  if (!runner?.shown || !runner.cards || before?.number !== summary.number) {
    return null
  }
  return before.runner?.shown === false
    ? shownNotice(previous, next, runner.playerId, runner.cards)
    : null
}

const pileOf = (game: GameState, playerId: PlayerId): number =>
  game.players.find((player) => player.id === playerId)?.pileSize ?? 0

const nameOf = (game: GameState, playerId: PlayerId): string =>
  game.players.find((player) => player.id === playerId)?.nickname ?? "Alguém"

export const stealNotice = (
  previous: GameState,
  next: GameState,
  steal: PileStolen,
  viewerId: PlayerId
): ScoreNotice => {
  const thief = nameOf(previous, steal.thiefId)
  const victim = nameOf(previous, steal.victimId)
  const cards = plural(steal.count, "carta", "cartas")
  const line = (playerId: PlayerId, label: string): ScoreLine => ({
    id: playerId,
    label: playerId === viewerId ? "Você" : label,
    before: pileOf(previous, playerId),
    value: pileOf(next, playerId),
    lead: playerId === steal.thiefId,
    mine: playerId === viewerId,
  })
  const base = {
    key: `roubo-${next.turnNumber}`,
    lines: [line(steal.thiefId, thief), line(steal.victimId, victim)],
    cards: [],
  }
  if (steal.victimId === viewerId) {
    return {
      ...base,
      tone: "bad",
      title: "Roubaram seu monte!",
      detail: `${thief} levou ${cards}.`,
    }
  }
  if (steal.thiefId === viewerId) {
    return {
      ...base,
      tone: "good",
      title: "Você roubou o monte!",
      detail: `De ${victim}: +${cards}.`,
    }
  }
  return {
    ...base,
    tone: "neutral",
    title: `${thief} roubou ${victim}`,
    detail: `O monte de ${cards} mudou de dono.`,
  }
}
