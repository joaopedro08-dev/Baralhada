import { isFinished } from "./model.js"
import type { TrucoGame } from "./model.js"

export const HAND_PAUSE_MS = 2800
export const RUN_PAUSE_MS = 3600
export const ROUND_PAUSE_MS = 1600
export const CALL_PAUSE_MS = 1400
export const ANSWER_PAUSE_MS = 1000

const newHand = (previous: TrucoGame, next: TrucoGame): boolean =>
  next.hand.number !== previous.hand.number || (isFinished(next) && !isFinished(previous))

const ranAway = (next: TrucoGame): boolean => (next.lastHand?.runner?.cards.length ?? 0) > 0

const roundSettled = (previous: TrucoGame, next: TrucoGame): boolean =>
  next.hand.rounds.length > previous.hand.rounds.length

const called = (previous: TrucoGame, next: TrucoGame): boolean =>
  next.hand.request !== null && next.hand.request.stake !== previous.hand.request?.stake

const answered = (previous: TrucoGame, next: TrucoGame): boolean =>
  (previous.hand.request !== null && next.hand.request === null) ||
  (previous.hand.elevenDeciderId !== null && next.hand.elevenDeciderId === null)

export const trucoPauseAfter = (previous: TrucoGame, next: TrucoGame): number => {
  if (newHand(previous, next)) return ranAway(next) ? RUN_PAUSE_MS : HAND_PAUSE_MS
  if (roundSettled(previous, next)) return ROUND_PAUSE_MS
  if (called(previous, next)) return CALL_PAUSE_MS
  return answered(previous, next) ? ANSWER_PAUSE_MS : 0
}
