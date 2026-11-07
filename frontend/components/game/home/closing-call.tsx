"use client"

import { useRef } from "react"
import { useGSAP } from "@gsap/react"
import gsap from "gsap"
import { DoorOpen, Plus, Shuffle } from "lucide-react"

import { CardBack, CardFace } from "@/components/game/cards/card-face"
import { GameButton } from "@/components/game/game-button"
import type { Card } from "@/lib/game/domain/types"

gsap.registerPlugin(useGSAP)

const ACES: readonly Card[] = ["AC", "AH", "AD", "AS"]

const fanX = (index: number) => (index - 1.5) * 48
const fanY = (index: number) => Math.abs(index - 1.5) * 9
const fanRotation = (index: number) => (index - 1.5) * 11
const stackY = (index: number) => -index * 2

function Deck({ onReady }: { onReady: (shuffle: () => void) => void }) {
  const stage = useRef<HTMLDivElement>(null)

  useGSAP(
    (_, contextSafe) => {
      const cards = gsap.utils.toArray<HTMLElement>("[data-deck-card]")
      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches
      gsap.set(cards, { transformPerspective: 800 })

      if (reduced || !contextSafe) {
        gsap.set(cards, {
          x: fanX,
          y: fanY,
          rotation: fanRotation,
          rotationY: 0,
        })
        onReady(() => undefined)
        return
      }

      gsap.set(cards, { x: 0, y: stackY, rotation: 0, rotationY: 180 })

      const shuffle = contextSafe(() => {
        gsap
          .timeline()
          .to(cards, {
            x: 0,
            y: stackY,
            rotation: 0,
            rotationY: 180,
            duration: 0.3,
            ease: "power2.inOut",
          })
          .to(cards, {
            x: (index: number) => (index % 2 ? 74 : -74),
            rotation: (index: number) => (index % 2 ? 12 : -12),
            duration: 0.32,
            ease: "power2.out",
            stagger: 0.04,
          })
          .to(cards, {
            x: 0,
            y: stackY,
            rotation: 0,
            duration: 0.28,
            ease: "power2.in",
            stagger: 0.06,
          })
          .to(cards, {
            x: fanX,
            y: fanY,
            rotation: fanRotation,
            duration: 0.6,
            ease: "back.out(1.7)",
            stagger: 0.07,
          })
          .to(
            cards,
            { rotationY: 0, duration: 0.45, ease: "power2.out", stagger: 0.08 },
            "-=0.35"
          )
      })
      onReady(shuffle)

      const watcher = new IntersectionObserver(
        ([entry]) => {
          if (!entry?.isIntersecting) return
          shuffle()
          watcher.disconnect()
        },
        { threshold: 0.5 }
      )
      if (stage.current) watcher.observe(stage.current)
      return () => watcher.disconnect()
    },
    { scope: stage }
  )

  return (
    <div ref={stage} aria-hidden className="relative h-48 w-full sm:h-56">
      {ACES.map((card) => (
        <div
          key={card}
          data-deck-card
          className="absolute top-1/2 left-1/2 -mt-14 -ml-10 h-28 w-20 [transform-style:preserve-3d] sm:-mt-18 sm:-ml-[3.25rem] sm:h-36 sm:w-[6.5rem]"
        >
          <CardFace
            card={card}
            size="hero"
            className="absolute inset-0 size-full shadow-xl [backface-visibility:hidden]"
          />
          <CardBack className="absolute inset-0 size-full [transform:rotateY(180deg)] [backface-visibility:hidden]" />
        </div>
      ))}
    </div>
  )
}

export function ClosingCall({
  onCreate,
  onJoin,
}: {
  onCreate: () => void
  onJoin: () => void
}) {
  const shuffleRef = useRef<() => void>(() => undefined)

  return (
    <section
      aria-labelledby="chamada-titulo"
      className="relative grid items-center gap-6 overflow-hidden rounded-3xl bg-felt-deep px-5 py-10 ring-1 ring-gold/40 sm:px-10 lg:grid-cols-2"
    >
      <div
        aria-hidden
        className="hero-glow pointer-events-none absolute inset-0 opacity-80"
      />
      <div className="relative flex flex-col items-center gap-4 text-center lg:items-start lg:text-left">
        <h2
          id="chamada-titulo"
          className="font-heading text-3xl font-bold text-balance sm:text-4xl"
        >
          A mesa está pronta. Falta só você.
        </h2>
        <p className="max-w-md text-felt-muted">
          Chame os amigos, escolha o jogo e comece uma partida agora mesmo. Leva
          menos tempo que embaralhar.
        </p>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <GameButton
            tone="gold"
            onClick={onCreate}
            className="h-12 px-6 text-base"
          >
            <Plus aria-hidden />
            Criar uma sala
          </GameButton>
          <GameButton onClick={onJoin} className="h-12 px-6 text-base">
            <DoorOpen aria-hidden />
            Tenho um código
          </GameButton>
        </div>
      </div>
      <div className="relative flex flex-col items-center gap-2">
        <Deck onReady={(shuffle) => (shuffleRef.current = shuffle)} />
        <GameButton
          variant="ghost"
          tone="panel"
          onClick={() => shuffleRef.current()}
          className="text-felt-muted hover:bg-felt/60 hover:text-gold motion-reduce:hidden"
        >
          <Shuffle aria-hidden />
          Embaralhar de novo
        </GameButton>
      </div>
    </section>
  )
}
