"use client"

import { useRef } from "react"

import {
  gsap,
  prefersReducedMotion,
  SplitText,
  useGSAP,
} from "@/lib/animation/gsap"

export function TurnBanner({ turnNumber }: { turnNumber: number }) {
  const banner = useRef<HTMLParagraphElement>(null)

  useGSAP(
    () => {
      if (prefersReducedMotion() || !banner.current) return
      const split = SplitText.create(banner.current, { type: "chars" })
      gsap
        .timeline()
        .set(banner.current, { autoAlpha: 1 })
        .from(split.chars, {
          y: 40,
          scale: 0.4,
          opacity: 0,
          rotation: () => gsap.utils.random(-20, 20),
          duration: 0.35,
          ease: "back.out(2.4)",
          stagger: 0.03,
        })
        .to(banner.current, { autoAlpha: 0, y: -24, duration: 0.25 }, "+=0.45")
    },
    { dependencies: [turnNumber], revertOnUpdate: true }
  )

  return (
    <p
      ref={banner}
      aria-hidden
      className="pointer-events-none invisible fixed inset-x-0 top-1/3 z-20 text-center font-heading text-5xl font-bold text-gold drop-shadow-[0_3px_0_rgb(0_0_0/0.45)]"
    >
      Sua vez!
    </p>
  )
}
