"use client"

import { m } from "framer-motion"

import { STARTING_POINTS } from "@/lib/game/domain/cacheta/guide"
import { cn } from "@/lib/utils"

const DANGER_POINTS = 3

const pipState = (lit: boolean) => ({
  scale: lit ? 1 : 0.55,
  opacity: lit ? 1 : 0.3,
})

export function PointsMeter({
  points,
  from,
  size = "sm",
  delay = 0,
  className,
}: {
  points: number
  from?: number
  size?: "sm" | "md"
  delay?: number
  className?: string
}) {
  return (
    <span
      role="img"
      aria-label={points === 1 ? "1 ponto" : `${points} pontos`}
      className={cn("inline-flex items-center gap-1.5", className)}
    >
      <span className="flex gap-0.5">
        {Array.from({ length: STARTING_POINTS }, (_, index) => {
          const lit = index < points
          return (
            <m.span
              key={index}
              initial={from === undefined ? false : pipState(index < from)}
              animate={pipState(lit)}
              transition={{
                delay: lit ? 0 : delay + (STARTING_POINTS - index) * 0.06,
                type: "spring",
                stiffness: 420,
                damping: 18,
              }}
              className={cn(
                "block rounded-full",
                size === "sm" ? "size-1.5" : "size-2.5",
                index < Math.max(points, from ?? 0)
                  ? points <= DANGER_POINTS
                    ? "bg-rose-400"
                    : "bg-emerald-300"
                  : "bg-white/30",
                lit && "shadow-[0_0_6px_rgb(255_255_255/0.35)]"
              )}
            />
          )
        })}
      </span>
      <span
        className={cn(
          "font-heading font-bold tabular-nums",
          size === "sm" ? "text-xs" : "text-base"
        )}
      >
        {points}
      </span>
    </span>
  )
}
