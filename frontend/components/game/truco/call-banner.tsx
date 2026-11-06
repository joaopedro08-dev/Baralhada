"use client"

import { useEffect, useState } from "react"
import { AnimatePresence, m, useReducedMotion } from "framer-motion"

import { detectCall } from "@/lib/game/domain/truco/calls"
import type { CallTone, TrucoCall } from "@/lib/game/domain/truco/calls"
import type { TrucoState } from "@/lib/game/domain/truco/types"
import { cn } from "@/lib/utils"

const CALL_DURATION_MS = 1900

const TONES: Readonly<Record<CallTone, string>> = {
  raise: "text-gold",
  accept: "text-emerald-300",
  run: "text-rose-300",
  special: "text-sky-300",
}

const SHAKE = [0, -10, 9, -7, 6, -3, 0]

export const useTrucoCall = (game: TrucoState): TrucoCall | null => {
  const [seen, setSeen] = useState(game)
  const [call, setCall] = useState<TrucoCall | null>(null)

  if (seen !== game) {
    setSeen(game)
    const next = detectCall(seen, game)
    if (next) setCall(next)
  }

  useEffect(() => {
    if (!call) return
    const timer = setTimeout(() => setCall(null), CALL_DURATION_MS)
    return () => clearTimeout(timer)
  }, [call])

  return call
}

export function CallBanner({ call }: { call: TrucoCall | null }) {
  const calm = useReducedMotion()

  return (
    <>
      <p role="status" className="sr-only">
        {call ? `${call.shout} ${call.caption}` : ""}
      </p>
      <AnimatePresence>
        {call && (
          <m.div
            key={call.key}
            aria-hidden
            className="pointer-events-none fixed inset-0 z-30 flex flex-col items-center justify-center gap-3 px-4 text-center"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.25 } }}
          >
            <m.div
              className="absolute inset-0 bg-black/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
            />
            <m.span
              className={cn(
                "relative font-heading text-6xl font-extrabold tracking-tight text-balance drop-shadow-[0_5px_0_rgb(0_0_0/0.55)] sm:text-8xl",
                TONES[call.tone]
              )}
              initial={calm ? false : { scale: 0.2, rotate: -14, y: 40 }}
              animate={
                calm ? { opacity: 1 } : { scale: 1, rotate: -3, y: 0, x: SHAKE }
              }
              transition={{
                scale: { type: "spring", stiffness: 420, damping: 14 },
                rotate: { type: "spring", stiffness: 300, damping: 12 },
                y: { type: "spring", stiffness: 300, damping: 16 },
                x: { duration: 0.5, delay: 0.12 },
              }}
            >
              {call.shout}
            </m.span>
            <m.span
              className="relative rounded-full bg-felt-deep/90 px-4 py-1.5 text-base font-semibold text-felt-foreground ring-1 ring-felt-line sm:text-lg"
              initial={calm ? false : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.22, duration: 0.25 }}
            >
              {call.caption}
            </m.span>
          </m.div>
        )}
      </AnimatePresence>
    </>
  )
}
