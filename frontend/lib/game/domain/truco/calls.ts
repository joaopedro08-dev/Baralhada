import { stakeName } from "@/lib/game/domain/truco/guide"
import { nicknameOf } from "@/lib/game/domain/truco/teams"
import type { HandSummary, TrucoState } from "@/lib/game/domain/truco/types"

export type CallTone = "raise" | "accept" | "run" | "special"

export interface TrucoCall {
  readonly key: string
  readonly shout: string
  readonly caption: string
  readonly tone: CallTone
}

const SHOUTS = {
  3: "TRUCO!",
  6: "SEIS!",
  9: "NOVE!",
  12: "DOZE!",
} as const

const keyOf = (game: TrucoState, kind: string): string =>
  `${game.handNumber}:${game.turnNumber}:${kind}`

const raised = (previous: TrucoState, next: TrucoState): TrucoCall | null => {
  const request = next.request
  if (!request || request.stake === 1) return null
  const before = previous.request
  if (before?.stake === request.stake) return null
  return {
    key: keyOf(next, "raise"),
    shout: SHOUTS[request.stake as keyof typeof SHOUTS],
    caption: `${nicknameOf(next, request.requesterId)} pediu ${stakeName(request.stake)}`,
    tone: "raise",
  }
}

const accepted = (previous: TrucoState, next: TrucoState): TrucoCall | null => {
  const request = previous.request
  if (!request || next.request || next.handNumber !== previous.handNumber) {
    return null
  }
  return {
    key: keyOf(next, "accept"),
    shout: "ACEITO!",
    caption: `${nicknameOf(next, request.responderId)} aceitou o ${stakeName(request.stake)}`,
    tone: "accept",
  }
}

const describeRun = (
  previous: TrucoState,
  next: TrucoState,
  summary: HandSummary
): string => {
  if (summary.ending === "elevenRan") return "O time correu da mão de onze"
  const runner = summary.runner
  if (!runner) return "A mão acabou"
  const who = nicknameOf(next, runner.playerId)
  return previous.request
    ? `${who} correu do ${stakeName(previous.request.stake)}`
    : `${who} correu da mão`
}

const ran = (previous: TrucoState, next: TrucoState): TrucoCall | null => {
  const summary = next.lastHand
  if (next.handNumber === previous.handNumber || !summary) return null
  if (summary.ending !== "ran" && summary.ending !== "elevenRan") return null
  return {
    key: keyOf(next, "run"),
    shout: "CORREU!",
    caption: describeRun(previous, next, summary),
    tone: "run",
  }
}

const special = (previous: TrucoState, next: TrucoState): TrucoCall | null => {
  if (next.handNumber === previous.handNumber || next.mode === "normal") {
    return null
  }
  const eleven = next.mode === "eleven"
  return {
    key: keyOf(next, "mode"),
    shout: eleven ? "MÃO DE ONZE!" : "MÃO DE FERRO!",
    caption: eleven
      ? "Um dos times está a 1 ponto da vitória"
      : "Os dois times estão a 1 ponto: ninguém vê as próprias cartas",
    tone: "special",
  }
}

export const detectCall = (
  previous: TrucoState,
  next: TrucoState
): TrucoCall | null =>
  raised(previous, next) ??
  ran(previous, next) ??
  special(previous, next) ??
  accepted(previous, next)
