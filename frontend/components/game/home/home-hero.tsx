"use client"

import { m } from "framer-motion"
import { Smartphone, Sparkles, UserRoundX, Zap } from "lucide-react"

import { CardFace } from "@/components/game/cards/card-face"
import { Badge } from "@/components/ui/badge"
import type { Card } from "@/lib/game/domain/types"

const FAN: readonly {
  readonly card: Card
  readonly tilt: number
  readonly left: string
  readonly top: string
  readonly delay: number
}[] = [
  { card: "4C", tilt: -22, left: "4%", top: "14%", delay: 0 },
  { card: "7H", tilt: -11, left: "21%", top: "4%", delay: 0.4 },
  { card: "AS", tilt: 0, left: "38%", top: "0%", delay: 0.8 },
  { card: "7D", tilt: 11, left: "55%", top: "4%", delay: 1.2 },
  { card: "3S", tilt: 22, left: "72%", top: "14%", delay: 1.6 },
]

const PERKS = [
  { icon: Zap, label: "Tempo real" },
  { icon: UserRoundX, label: "Sem cadastro" },
  { icon: Smartphone, label: "PC ou celular" },
] as const

function CardFanArt() {
  return (
    <div
      aria-hidden
      className="relative mx-auto h-40 w-72 sm:h-52 sm:w-[26rem] lg:mx-0 short:hidden"
    >
      {FAN.map(({ card, tilt, left, top, delay }, index) => (
        <m.div
          key={card}
          className="absolute"
          style={{ left, top, zIndex: index }}
          initial={{ opacity: 0, y: 40, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: tilt }}
          whileHover={{ y: -14, scale: 1.08, zIndex: 10 }}
          transition={{
            type: "spring",
            stiffness: 180,
            damping: 16,
            delay: 0.1 + index * 0.08,
          }}
        >
          <div
            className="float-card"
            style={
              {
                "--tilt": "0deg",
                "--float-delay": `${delay}s`,
              } as React.CSSProperties
            }
          >
            <CardFace card={card} size="hero" className="shadow-xl" />
          </div>
        </m.div>
      ))}
    </div>
  )
}

export function HomeHero() {
  return (
    <div className="flex flex-col items-center gap-5 text-center lg:items-start lg:text-left">
      <Badge variant="outline" className="h-7 gap-1.5 border-gold px-3 text-sm">
        <Sparkles aria-hidden className="size-3.5 text-gold" />
        Jogos de baralho com os amigos
      </Badge>
      <h1 className="font-heading text-5xl leading-none font-extrabold tracking-tight sm:text-7xl short:text-3xl">
        <span className="sheen">Baralhada</span>
      </h1>
      <p className="max-w-md text-base/relaxed text-balance text-felt-muted sm:text-lg short:hidden">
        Monte a mesa em segundos: crie uma sala, mande o link e jogue Rouba
        Monte, Truco Paulista, Três Trincas ou Poker com quem você quiser.
      </p>
      <CardFanArt />
      <ul className="flex flex-wrap justify-center gap-2 lg:justify-start">
        {PERKS.map(({ icon: Icon, label }) => (
          <li
            key={label}
            className="flex items-center gap-1.5 rounded-full bg-felt-deep/80 px-3 py-1.5 text-sm font-medium ring-1 ring-felt-line"
          >
            <Icon aria-hidden className="size-4 text-gold" />
            {label}
          </li>
        ))}
      </ul>
    </div>
  )
}
