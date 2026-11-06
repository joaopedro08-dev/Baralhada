import type { ScoreNotice } from "@/lib/game/domain/score-notice"
import {
  nicknameOf,
  setLabel,
  setRankOf,
  SETS_TO_WIN,
  setsOf,
} from "@/lib/game/domain/tres-trincas/guide"
import type { TresTrincasState } from "@/lib/game/domain/tres-trincas/types"
import type { PlayerId } from "@/lib/game/domain/types"

const describeSets = (count: number): string =>
  count === 1 ? "uma trinca" : "duas trincas"

const missing = (count: number): string => {
  const left = SETS_TO_WIN - count
  if (left <= 0) return "Completou as 3 trincas."
  return left === 1
    ? "Falta 1 trinca para vencer."
    : `Faltam ${left} trincas para vencer.`
}

export const trincaNotice = (
  previous: TresTrincasState,
  next: TresTrincasState,
  viewerId: PlayerId
): ScoreNotice | null => {
  const melder = next.players.find(
    (player) => player.sets.length > setsOf(previous, player.id).length
  )
  if (!melder) return null
  const added = melder.sets.slice(setsOf(previous, melder.id).length)
  const mine = melder.id === viewerId
  const total = melder.sets.length
  const labels = added.map((set) => setLabel(setRankOf(set, next.wildRank)))
  return {
    key: `trinca-${melder.id}-${total}`,
    tone: mine ? "good" : total >= SETS_TO_WIN - 1 ? "bad" : "neutral",
    title: `${mine ? "Você" : nicknameOf(next, melder.id)} baixou ${describeSets(added.length)}`,
    detail: `Trinca ${labels.join(" e ")}. ${missing(total)}`,
    lines: next.players.map((player) => ({
      id: player.id,
      label: player.id === viewerId ? "Você" : player.nickname,
      before: setsOf(previous, player.id).length,
      value: player.sets.length,
      lead: player.id === melder.id,
      mine: player.id === viewerId,
    })),
    cards: added.flat(),
  }
}
