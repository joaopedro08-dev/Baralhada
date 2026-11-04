"use client"

import { useState } from "react"

import type { Refusal } from "@/lib/game/application/game-session"
import {
  currentSelection,
  emptySelection,
  planAction,
  suggestAction,
  toggleHandCard,
  toggleMeld,
  toggleTableCard,
} from "@/lib/game/domain/selection"
import type { Selection } from "@/lib/game/domain/selection"
import type {
  Card,
  GameState,
  MeldTarget,
  PlayerId,
  TurnActionKind,
} from "@/lib/game/domain/types"
import { gameSession } from "@/lib/game/session"

interface ShownRefusal {
  readonly id: number
  readonly turn: number
  readonly message: string
}

export const useTurnControls = (
  game: GameState,
  viewerId: PlayerId,
  bestAction: TurnActionKind | null
) => {
  const [stored, setStored] = useState<Selection>(() =>
    emptySelection(game.turnNumber)
  )
  const [refusal, setRefusal] = useState<ShownRefusal | null>(null)
  const [busy, setBusy] = useState(false)

  const selection = currentSelection(stored, game)

  const refuse = (message: string) =>
    setRefusal((shown) => ({
      id: (shown?.id ?? 0) + 1,
      turn: game.turnNumber,
      message,
    }))

  const choose = (next: Selection) => {
    setRefusal(null)
    setStored(next)
  }

  const run = async (command: () => Promise<Refusal>) => {
    setBusy(true)
    const refused = await command()
    setBusy(false)
    if (refused) refuse(refused)
    else setRefusal(null)
  }

  return {
    selection,
    busy,
    suggested: suggestAction(game, selection, viewerId, bestAction),
    refusal: refusal?.turn === game.turnNumber ? refusal : null,
    toggleHand: (card: Card) => choose(toggleHandCard(selection, card)),
    toggleTable: (card: Card) =>
      choose(toggleTableCard(selection, card, game.hand)),
    toggleTarget: (target: MeldTarget) =>
      choose(toggleMeld(selection, target, game.hand)),
    perform(kind: TurnActionKind) {
      const plan = planAction(kind, selection)
      if (!plan.ready) return refuse(plan.problem)
      void run(() => gameSession.playAction(plan.action))
    },
    pass: () => void run(gameSession.endTurn),
  }
}
