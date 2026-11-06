"use client"

import {
  Lightbulb,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Timer,
  Wifi,
} from "lucide-react"

import { Reveal } from "@/components/game/home/reveal"

const FEATURES = [
  {
    icon: ShieldCheck,
    title: "Mão secreta de verdade",
    text: "O servidor confere cada jogada e envia a cada pessoa só o que ela pode ver. Ninguém espia a mão dos outros.",
  },
  {
    icon: Wifi,
    title: "Tempo real",
    text: "Cada carta jogada aparece na hora para todos, sem precisar atualizar a página.",
  },
  {
    icon: RefreshCw,
    title: "Reconexão automática",
    text: "A internet caiu? Abra o jogo de novo no mesmo navegador e volte para a sua sala e a sua mão.",
  },
  {
    icon: Lightbulb,
    title: "Dicas para aprender",
    text: "Veja a força das cartas no Truco ou as melhores capturas no Rouba Monte. Dá para desligar quando quiser.",
  },
  {
    icon: Timer,
    title: "Relógio em cada jogada",
    text: "Se alguém demorar, o jogo segue com uma jogada automática. Ninguém trava a mesa.",
  },
  {
    icon: Smartphone,
    title: "Feito para o celular",
    text: "Botões grandes, cartas legíveis e telas pensadas para jogar com uma mão só.",
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
        <h2 id="recursos-titulo" className="font-heading text-3xl font-bold">
          Pensado para jogar bem
        </h2>
        <p className="max-w-2xl text-felt-muted">
          O que fica por trás da mesa para a partida ser justa e sem atrito.
        </p>
      </Reveal>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map(({ icon: Icon, title, text }, index) => (
          <li key={title}>
            <Reveal
              delay={(index % 3) * 0.08}
              className="flex h-full gap-3 rounded-xl bg-felt-deep/60 p-4 ring-1 ring-felt-line transition-colors hover:bg-felt-deep"
            >
              <Icon aria-hidden className="mt-0.5 size-6 shrink-0 text-gold" />
              <div className="flex flex-col gap-1">
                <h3 className="font-heading text-base font-semibold">
                  {title}
                </h3>
                <p className="text-sm/relaxed text-felt-muted">{text}</p>
              </div>
            </Reveal>
          </li>
        ))}
      </ul>
    </section>
  )
}
