"use client"

import { useEffect, useLayoutEffect, useRef } from "react"
import { toast } from "sonner"

import { flightBoard } from "@/components/game/table/flight-board"
import type { FlightPlan } from "@/components/game/table/flight-board"
import { gsap, prefersReducedMotion } from "@/lib/animation/gsap"
import { plural } from "@/lib/game/domain/cards"
import {
  describeMoves,
  describeSteal,
  DECK_ANCHOR,
  playerAnchor,
} from "@/lib/game/domain/table-changes"
import type { CardMove, PileStolen } from "@/lib/game/domain/table-changes"
import type { GameState, PlayerId } from "@/lib/game/domain/types"
import { gameSession } from "@/lib/game/session"

const rectOfAnchor = (anchor: string): DOMRect | null =>
  (
    document.querySelector(`[data-anchor="${anchor}"] [data-landing]`) ??
    document.querySelector(`[data-anchor="${anchor}"]`)
  )?.getBoundingClientRect() ?? null

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

const announce = (steal: PileStolen, game: GameState, viewerId: PlayerId) => {
  const cards = plural(steal.count, "carta", "cartas")
  if (steal.victimId === viewerId) {
    toast.warning(
      `${nameOf(game, steal.thiefId)} roubou seu monte de ${cards}!`
    )
  } else if (steal.thiefId === viewerId) {
    toast.success(
      `Você roubou o monte de ${nameOf(game, steal.victimId)}: +${cards}`
    )
  } else {
    toast(
      `${nameOf(game, steal.thiefId)} roubou o monte de ${nameOf(game, steal.victimId)}`
    )
  }
}

const shakeVictim = ({ victimId }: PileStolen) =>
  gsap.fromTo(
    `[data-anchor="${playerAnchor(victimId)}"]`,
    { x: -8 },
    { x: 0, duration: 0.6, ease: "elastic.out(1.2, 0.25)", clearProps: "x" }
  )

interface PendingChange {
  readonly flights: readonly FlightPlan[]
  readonly steal: PileStolen | null
}

const dealCards = (delaySeconds: number) => {
  const deck = rectOfAnchor(DECK_ANCHOR)
  if (!deck) return
  gsap.from("[data-deal]", {
    delay: delaySeconds,
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

const isFreshDeal = (game: GameState): boolean => game.turnNumber === 1

export const useTableEffects = (
  game: GameState,
  viewerId: PlayerId,
  matchStartsAt: number | null
) => {
  const shown = useRef(game)
  const startsAt = useRef(matchStartsAt)
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
          steal: describeSteal(previous, next),
        }
      }),
    [viewerId]
  )

  useLayoutEffect(() => {
    const change = pending.current
    if (!change) return
    pending.current = null
    flightBoard.launch(change.flights)
    if (!change.steal) return
    announce(change.steal, game, viewerId)
    if (!prefersReducedMotion()) shakeVictim(change.steal)
  }, [game, viewerId])

  const dealtOnMount = useRef(isFreshDeal(game))

  useLayoutEffect(() => {
    if (!dealtOnMount.current || prefersReducedMotion()) return
    dealtOnMount.current = false
    const waitMs = (startsAt.current ?? 0) - Date.now()
    dealCards(Math.max(0, waitMs) / 1000)
  }, [])
}
