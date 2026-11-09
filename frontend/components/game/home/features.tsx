"use client"

import { m } from "framer-motion"
import {
  EyeOff,
  Lightbulb,
  RefreshCw,
  Smartphone,
  Timer,
  Wifi,
} from "lucide-react"

import { CardBack, CardFace } from "@/components/game/cards/card-face"
import { Reveal } from "@/components/game/home/reveal"
import { cn } from "@/lib/utils"

function SecretHandArt() {
  return (
    <div aria-hidden className="flex items-end justify-center -space-x-5 pt-2">
      {[-12, -4, 4].map((tilt) => (
        <div key={tilt} style={{ rotate: `${tilt}deg` }}>
          <CardBack className="h-16 w-12" />
        </div>
      ))}
      <m.div
        initial={{ y: 0, rotate: 12 }}
        whileHover={{ y: -12 }}
        whileInView={{ y: -8 }}
        viewport={{ once: true }}
        transition={{ delay: 0.4, type: "spring" }}
      >
        <CardFace card="AH" size="flying" className="h-16 w-12" />
      </m.div>
    </div>
  )
}

function LiveArt() {
  return (
    <div aria-hidden className="flex items-center gap-2">
      <span className="relative flex size-3">
        <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-300 opacity-70 motion-reduce:hidden" />
        <span className="relative inline-flex size-3 rounded-full bg-emerald-300" />
      </span>
      <span className="font-mono text-xs font-semibold tracking-wide text-emerald-200 uppercase">
        Ao vivo
      </span>
    </div>
  )
}

function TimerArt() {
  return (
    <div
      aria-hidden
      className="feature-timer flex size-14 items-center justify-center rounded-full"
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-felt-deep font-mono text-sm font-bold text-gold">
        30
      </span>
    </div>
  )
}

function HintArt() {
  return (
    <div aria-hidden className="flex -space-x-3">
      <CardFace card="7S" size="flying" className="h-14 w-10 -rotate-6" />
      <CardFace
        card="7D"
        size="flying"
        className="suggest-pulse hint-best h-14 w-10 -translate-y-1"
      />
      <CardFace card="KC" size="flying" className="h-14 w-10 rotate-6" />
    </div>
  )
}

function ReconnectArt() {
  return (
    <span
      aria-hidden
      className="flex items-center gap-1.5 rounded-full bg-felt px-3 py-1 text-xs font-semibold text-felt-muted ring-1 ring-felt-line"
    >
      <RefreshCw className="size-3.5 text-gold motion-safe:animate-spin motion-safe:[animation-duration:3s]" />
      Voltando à sala
    </span>
  )
}

function PhoneArt() {
  return (
    <span
      aria-hidden
      className="flex h-16 w-10 flex-col items-center justify-end gap-0.5 rounded-lg bg-felt p-1 ring-2 ring-felt-line"
    >
      <span className="flex -space-x-1.5">
        <span className="h-4 w-3 -rotate-12 rounded-[2px] bg-playing-card" />
        <span className="h-4 w-3 rounded-[2px] bg-playing-card" />
        <span className="h-4 w-3 rotate-12 rounded-[2px] bg-playing-card" />
      </span>
      <span className="h-0.5 w-4 rounded-full bg-felt-line" />
    </span>
  )
}

const TILES = [
  {
    icon: EyeOff,
    title: "Mão secreta de verdade",
    text: "O servidor confere cada jogada e envia a cada pessoa só o que ela pode ver. Ninguém espia a mão dos outros.",
    art: SecretHandArt,
    span: "lg:col-span-4",
  },
  {
    icon: Wifi,
    title: "Tempo real",
    text: "Cada carta aparece na hora para todos, sem atualizar a página.",
    art: LiveArt,
    span: "lg:col-span-2",
  },
  {
    icon: Timer,
    title: "Relógio em cada jogada",
    text: "Se alguém demorar, o jogo segue com uma jogada automática.",
    art: TimerArt,
    span: "lg:col-span-2",
  },
  {
    icon: Lightbulb,
    title: "Dicas para aprender",
    text: "Veja a força das cartas no Truco, as melhores capturas no Rouba Monte, as trincas prontas ou o seu jogo no Poker. Dá para desligar quando quiser.",
    art: HintArt,
    span: "lg:col-span-4",
  },
  {
    icon: RefreshCw,
    title: "Reconexão automática",
    text: "A internet caiu? Abra o jogo de novo no mesmo navegador e volte para a sua sala e a sua mão.",
    art: ReconnectArt,
    span: "lg:col-span-3",
  },
  {
    icon: Smartphone,
    title: "Feito para o celular",
    text: "Botões grandes, cartas legíveis e telas pensadas para jogar com uma mão só.",
    art: PhoneArt,
    span: "lg:col-span-3",
  },
] as const

export function Features() {
  return (
    <section
      id="recursos"
      aria-labelledby="recursos-titulo"
      className="flex scroll-mt-20 flex-col gap-6"
    >
      <Reveal className="flex flex-col gap-2">
        <p className="font-heading text-sm font-semibold tracking-widest text-gold uppercase">
          Por trás da mesa
        </p>
        <h2
          id="recursos-titulo"
          className="font-heading text-3xl font-bold text-balance sm:text-4xl"
        >
          Pensado para a partida ser justa e sem atrito
        </h2>
      </Reveal>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
        {TILES.map(({ icon: Icon, title, text, art: Art, span }, index) => (
          <li key={title} className={cn(span, index === 0 && "sm:col-span-2")}>
            <Reveal
              delay={(index % 3) * 0.08}
              className="group/tile relative flex h-full flex-col gap-3 overflow-hidden rounded-2xl bg-felt-deep/70 p-5 ring-1 ring-felt-line transition-colors hover:bg-felt-deep hover:ring-gold/50"
            >
              <span
                aria-hidden
                className="absolute -top-16 -right-16 size-40 rounded-full bg-gold/10 blur-2xl transition-opacity group-hover/tile:opacity-100 lg:opacity-0"
              />
              <div className="relative flex items-start justify-between gap-3">
                <span className="flex size-11 items-center justify-center rounded-xl bg-felt ring-1 ring-felt-line">
                  <Icon aria-hidden className="size-5 text-gold" />
                </span>
                <Art />
              </div>
              <div className="relative flex flex-col gap-1">
                <h3 className="font-heading text-lg font-semibold">{title}</h3>
                <p className="text-sm/relaxed text-felt-muted">{text}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  )
}
