"use client"

import { useEffect, useLayoutEffect, useRef } from "react"
import { toast } from "sonner"

import { flightBoard } from "@/components/game/table/flight-board"
import type { FlightPlan } from "@/components/game/table/flight-board"
import { gsap, prefersReducedMotion } from "@/lib/animation/gsap"
import { rankName } from "@/lib/game/domain/cards"
import {
  describeEvents,
  describeMoves,
  DECK_ANCHOR,
  playerAnchor,
} from "@/lib/game/domain/table-changes"
import type { CardMove, TableEvent } from "@/lib/game/domain/table-changes"
import type { GameState, PlayerId } from "@/lib/game/domain/types"
import { gameSession } from "@/lib/game/session"

const rectOfAnchor = (anchor: string): DOMRect | null =>
  document
    .querySelector(`[data-anchor="${anchor}"]`)
    ?.getBoundingClientRect() ?? null

const rectOfOrigin = ({ card, from }: CardMove): DOMRect | null =>
  (card &&
    document
      .querySelector(`[data-card-ids~="${card}"]`)
      ?.getBoundingClientRect()) ||
  rectOfAnchor(from)

const planFlights = (moves: readonly CardMove[]): readonly FlightPlan[] =>
  moves.flatMap((move) => {
    const from = rectOfOrigin(move)
    return from ? [{ card: move.card, from, toAnchor: move.to }] : []
  })

const nameOf = (game: GameState, playerId: PlayerId): string =>
  game.players.find((player) => player.id === playerId)?.nickname ?? "Alguém"

const announce = (event: TableEvent, game: GameState, viewerId: PlayerId) => {
  const rank = event.rank && rankName(event.rank)
  if (event.kind === "quadCompleted") {
    if (event.playerId === viewerId)
      toast.success(`Quadra de ${rank}! +1 ponto`)
    else toast(`${nameOf(game, event.playerId)} fechou a quadra de ${rank}`)
  } else if (event.victimId === viewerId) {
    toast.warning(
      `${nameOf(game, event.thiefId)} roubou suas cartas de ${rank}!`
    )
  } else if (event.thiefId === viewerId) {
    toast.success(`Você roubou as cartas de ${rank}!`)
  }
}

const animateEvent = (event: TableEvent) => {
  if (event.kind === "stolen") {
    gsap.fromTo(
      `[data-anchor="${playerAnchor(event.victimId)}"]`,
      { x: -8 },
      { x: 0, duration: 0.6, ease: "elastic.out(1.2, 0.25)", clearProps: "x" }
    )
    return
  }
  gsap.fromTo(
    `[data-anchor="${playerAnchor(event.playerId)}"] [data-meld="${event.rank}"]`,
    { scale: 1.6 },
    {
      scale: 1,
      duration: 0.7,
      ease: "elastic.out(1.1, 0.4)",
      clearProps: "scale",
    }
  )
}

interface PendingChange {
  readonly flights: readonly FlightPlan[]
  readonly events: readonly TableEvent[]
}

const dealCards = () => {
  const deck = rectOfAnchor(DECK_ANCHOR)
  if (!deck) return
  gsap.from("[data-deal]", {
    x: (_: number, element: Element) =>
      deck.left - element.getBoundingClientRect().left,
    y: (_: number, element: Element) =>
      deck.top - element.getBoundingClientRect().top,
    rotation: () => gsap.utils.random(-25, 25),
    opacity: 0,
    duration: 0.45,
    ease: "back.out(1.4)",
    stagger: 0.04,
    clearProps: "transform,opacity",
  })
}

const isFreshDeal = (game: GameState): boolean =>
  game.turnNumber === 1 && game.usedActions.length === 0

export const useTableEffects = (game: GameState, viewerId: PlayerId) => {
  const shown = useRef(game)
  const pending = useRef<PendingChange | null>(null)

  useEffect(
    () =>
      gameSession.subscribe(() => {
        const next = gameSession.getState().room?.game
        const previous = shown.current
        if (!next || next === previous) return
        shown.current = next
        pending.current = {
          flights: prefersReducedMotion()
            ? []
            : planFlights(describeMoves(previous, next, viewerId)),
          events: describeEvents(previous, next),
        }
      }),
    [viewerId]
  )

  useLayoutEffect(() => {
    const change = pending.current
    if (!change) return
    pending.current = null
    flightBoard.launch(change.flights)
    change.events.forEach((event) => {
      announce(event, game, viewerId)
      if (!prefersReducedMotion()) animateEvent(event)
    })
  }, [game, viewerId])

  const dealtOnMount = useRef(isFreshDeal(game))

  useLayoutEffect(() => {
    if (!dealtOnMount.current || prefersReducedMotion()) return
    dealtOnMount.current = false
    dealCards()
  }, [])
}
