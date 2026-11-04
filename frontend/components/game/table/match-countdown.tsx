"use client"

import { m } from "framer-motion"

export function MatchCountdown({ seconds }: { seconds: number }) {
  return (
    <div
      role="status"
      data-countdown
      className="fixed inset-0 z-40 flex flex-col items-center justify-center gap-3 bg-felt-deep/95 text-center"
    >
      <p className="font-heading text-xl font-semibold">A partida começa em</p>
      <m.span
        key={seconds}
        initial={{ scale: 1.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="font-heading text-8xl font-bold text-gold tabular-nums"
      >
        {seconds}
      </m.span>
    </div>
  )
}
