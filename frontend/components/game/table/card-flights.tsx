"use client"

import { useEffect, useRef, useSyncExternalStore } from "react"

import { CardBack, CardFace } from "@/components/game/cards/card-face"
import { flightBoard } from "@/components/game/table/flight-board"
import type { Flight } from "@/components/game/table/flight-board"
import { gsap, useGSAP } from "@/lib/animation/gsap"

const ARC_HEIGHT = 70
const FLIGHT_SECONDS = 0.55

const findDestination = ({ card, toAnchor }: Flight): Element | null =>
  (card && document.querySelector(`[data-card-ids~="${card}"]`)) ||
  document.querySelector(`[data-anchor="${toAnchor}"] [data-landing]`) ||
  document.querySelector(`[data-anchor="${toAnchor}"]`)

const isSingleCard = (element: Element): boolean =>
  !(element.getAttribute("data-card-ids") ?? " ").includes(" ")

function FlyingCard({ flight }: { flight: Flight }) {
  const body = useRef<HTMLDivElement>(null)

  useGSAP(
    () => {
      const element = body.current
      const destination = findDestination(flight)
      if (!element || !destination) return flightBoard.land(flight.id)

      const start = flight.from
      const end = destination.getBoundingClientRect()
      const baseWidth = element.offsetWidth
      const hidesDestination = flight.card !== null && isSingleCard(destination)

      if (hidesDestination) gsap.set(destination, { autoAlpha: 0 })
      gsap.set(element, {
        x: start.left,
        y: start.top,
        scale: start.width / baseWidth,
        rotation: gsap.utils.random(-10, 10),
        transformOrigin: "0 0",
      })
      gsap.to(element, {
        delay: flight.delay,
        duration: FLIGHT_SECONDS,
        ease: "power2.inOut",
        scale: end.width / baseWidth,
        rotation: 0,
        motionPath: {
          curviness: 1.1,
          path: [
            { x: start.left, y: start.top },
            {
              x: (start.left + end.left) / 2,
              y: Math.min(start.top, end.top) - ARC_HEIGHT,
            },
            { x: end.left, y: end.top },
          ],
        },
        onComplete: () => {
          if (hidesDestination) {
            gsap.set(destination, { clearProps: "opacity,visibility" })
          }
          flightBoard.land(flight.id)
        },
      })
    },
    { dependencies: [flight.id] }
  )

  return (
    <div ref={body} className="absolute top-0 left-0 will-change-transform">
      {flight.card ? (
        <CardFace card={flight.card} size="flying" />
      ) : (
        <CardBack className="h-[4.75rem] w-14" />
      )}
    </div>
  )
}

export function CardFlights() {
  useEffect(() => flightBoard.clear, [])
  const flights = useSyncExternalStore(
    flightBoard.subscribe,
    flightBoard.getFlights,
    flightBoard.getServerFlights
  )
  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-0 z-30 overflow-hidden"
    >
      {flights.map((flight) => (
        <FlyingCard key={flight.id} flight={flight} />
      ))}
    </div>
  )
}
