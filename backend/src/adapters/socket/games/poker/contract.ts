import type { CurrentHand, Outs } from "../../../../domain/games/poker/hints.js"
import type { PokerView } from "../../../../domain/games/poker/player-view.js"

export interface PokerStateDto extends Omit<PokerView, "viewerId" | "events"> {
  readonly kind: "poker-texas-holdem"
  readonly history: readonly string[]
}

export interface PokerHintsDto {
  readonly kind: "poker-texas-holdem"
  readonly current: CurrentHand | null
  readonly outs: Outs | null
  readonly sentences: readonly string[]
}
