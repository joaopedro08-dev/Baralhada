"use client"

import { useRef } from "react"

import {
  gsap,
  prefersReducedMotion,
  SplitText,
  useGSAP,
} from "@/lib/animation/gsap"

const CONFETTI_PIECES = 36
const SUIT_GLYPHS = ["♠", "♥", "♦", "♣"] as const

const launchConfetti = (stage: HTMLElement) => {
  const originX = stage.clientWidth / 2
  for (let piece = 0; piece < CONFETTI_PIECES; piece++) {
    const glyph = document.createElement("span")
    glyph.textContent = SUIT_GLYPHS[piece % SUIT_GLYPHS.length] as string
    glyph.className = "confetti-piece"
    stage.appendChild(glyph)
    gsap.set(glyph, { x: originX, y: stage.clientHeight * 0.35 })
    gsap.to(glyph, {
      duration: gsap.utils.random(1.8, 3),
      rotation: gsap.utils.random(-540, 540),
      opacity: 0,
      ease: "none",
      physics2D: {
        velocity: gsap.utils.random(320, 820),
        angle: gsap.utils.random(200, 340),
        gravity: 620,
      },
      onComplete: () => glyph.remove(),
    })
  }
}

export const useVictoryShow = (viewerWon: boolean) => {
  const stage = useRef<HTMLDivElement>(null)
  const title = useRef<HTMLHeadingElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion() || !title.current) return
      const split = SplitText.create(title.current, { type: "chars" })
      gsap.from(split.chars, {
        y: 28,
        opacity: 0,
        rotation: () => gsap.utils.random(-14, 14),
        duration: 0.5,
        ease: "back.out(2)",
        stagger: 0.025,
      })
      if (viewerWon && stage.current) launchConfetti(stage.current)
    },
    { scope: stage, dependencies: [viewerWon] }
  )

  return { stage, title }
}
