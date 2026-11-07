"use client"

import { useRef } from "react"
import { m } from "framer-motion"

import { gsap, prefersReducedMotion, useGSAP } from "@/lib/animation/gsap"
import { cn } from "@/lib/utils"

const GLYPHS = ["♠", "♥", "♦", "♣", "★"] as const
const SPARKS = 16
const RED_GLYPHS = new Set<string>(["♥", "♦"])

const SIZES = {
  small: { ribbon: "text-[0.65rem] px-1.5", spark: "text-sm" },
  large: { ribbon: "text-sm px-3 py-0.5", spark: "text-xl" },
} as const

export type FlareSize = keyof typeof SIZES

export function BlackjackFlare({ size }: { size: FlareSize }) {
  const burst = useRef<HTMLDivElement>(null)
  const style = SIZES[size]

  useGSAP(
    () => {
      const node = burst.current
      if (!node || prefersReducedMotion()) return
      gsap.fromTo(
        node.children,
        { x: 0, y: 0, scale: 0.4, opacity: 1, rotate: 0 },
        {
          duration: 1.8,
          scale: () => gsap.utils.random(0.8, 1.6),
          opacity: 0,
          rotate: () => gsap.utils.random(-220, 220),
          physics2D: {
            velocity: () =>
              gsap.utils.random(160, size === "large" ? 340 : 220),
            angle: () => gsap.utils.random(0, 360),
            gravity: 260,
          },
          ease: "power1.out",
          stagger: 0.015,
        }
      )
    },
    { scope: burst }
  )

  return (
    <>
      <m.span
        aria-hidden
        initial={{ opacity: 0 }}
        animate={{ opacity: [0, 0.9, 0.55] }}
        transition={{ duration: 1.2 }}
        className="pointer-events-none absolute inset-0 -z-10 rounded-xl bg-[radial-gradient(circle,var(--gold)_0%,transparent_70%)] blur-md"
      />
      <div
        ref={burst}
        aria-hidden
        className="pointer-events-none absolute top-1/3 left-1/2 z-20"
      >
        {Array.from({ length: SPARKS }, (_, index) => {
          const glyph = GLYPHS[index % GLYPHS.length] as string
          return (
            <span
              key={index}
              className={cn(
                "absolute -translate-x-1/2 -translate-y-1/2 font-bold opacity-0 drop-shadow",
                style.spark,
                RED_GLYPHS.has(glyph) ? "text-rose-400" : "text-gold"
              )}
            >
              {glyph}
            </span>
          )
        })}
      </div>
      <m.span
        initial={{ scale: 0, rotate: -30 }}
        animate={{ scale: [0, 1.35, 1], rotate: -10 }}
        transition={{ duration: 0.6, ease: "backOut" }}
        className={cn(
          "sheen absolute top-[42%] left-1/2 z-10 -translate-x-1/2 -translate-y-1/2 rounded-md bg-black/80 font-heading font-extrabold tracking-[0.2em] whitespace-nowrap uppercase shadow-[0_0_14px_var(--gold)] ring-2 ring-gold",
          style.ribbon
        )}
      >
        Blackjack!
      </m.span>
    </>
  )
}
