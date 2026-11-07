"use client"

import { useRef } from "react"
import { m, useScroll } from "framer-motion"
import { Check, Link2, PlayCircle, Plus } from "lucide-react"

import { CardBack } from "@/components/game/cards/card-face"
import { Reveal } from "@/components/game/home/reveal"

const SAMPLE_CODE = "K7Q2MX"

function CodeArt() {
  return (
    <div className="flex justify-center gap-1 [perspective:600px]">
      {[...SAMPLE_CODE].map((letter, index) => (
        <m.span
          key={index}
          initial={{ rotateX: -90, opacity: 0 }}
          whileInView={{ rotateX: 0, opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 + index * 0.08, type: "spring" }}
          className="flex h-11 w-8 items-center justify-center rounded-md bg-playing-card font-mono text-xl font-bold text-suit-black shadow-md"
        >
          {letter}
        </m.span>
      ))}
    </div>
  )
}

function ShareArt() {
  return (
    <div className="flex flex-col items-end gap-1.5">
      <m.p
        initial={{ opacity: 0, scale: 0.85, y: 10 }}
        whileInView={{ opacity: 1, scale: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ delay: 0.25, type: "spring" }}
        className="max-w-[15rem] origin-bottom-right rounded-2xl rounded-br-sm bg-emerald-200 px-3 py-2 text-left text-sm text-emerald-950 shadow-md"
      >
        Bora jogar? Entra aí:{" "}
        <span className="font-semibold underline">…/?sala={SAMPLE_CODE}</span>
      </m.p>
      <m.span
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        viewport={{ once: true }}
        transition={{ delay: 0.7 }}
        className="flex items-center gap-1 text-xs font-medium text-felt-muted"
      >
        <Check aria-hidden className="size-3.5 text-gold" />
        Link copiado
      </m.span>
    </div>
  )
}

const SEATS = ["bg-amber-200", "bg-sky-200", "bg-rose-200"] as const

function DealArt() {
  return (
    <div className="flex justify-center gap-4">
      {SEATS.map((tone, seat) => (
        <div key={tone} className="flex flex-col items-center gap-1.5">
          <div className="flex -space-x-4">
            {[0, 1, 2].map((card) => (
              <m.div
                key={card}
                initial={{ opacity: 0, y: -40, rotate: -30 }}
                whileInView={{ opacity: 1, y: 0, rotate: (card - 1) * 10 }}
                viewport={{ once: true }}
                transition={{
                  delay: 0.2 + (card * SEATS.length + seat) * 0.07,
                  type: "spring",
                  stiffness: 200,
                  damping: 16,
                }}
              >
                <CardBack className="h-11 w-8" />
              </m.div>
            ))}
          </div>
          <span
            className={`size-7 rounded-full ${tone} ring-2 ring-felt-deep`}
          />
        </div>
      ))}
    </div>
  )
}

const STEPS = [
  {
    icon: Plus,
    title: "Crie a sala",
    text: "Escolha um apelido e o jogo. A sala nasce com um código de 6 caracteres.",
    art: CodeArt,
  },
  {
    icon: Link2,
    title: "Compartilhe o código",
    text: "Mande o link no grupo. Quem abrir já cai na sala, com o código preenchido.",
    art: ShareArt,
  },
  {
    icon: PlayCircle,
    title: "Jogue",
    text: "Com todos sentados, o anfitrião inicia. No Truco, dá para montar os times ou sortear.",
    art: DealArt,
  },
] as const

export function HowItWorks() {
  const rail = useRef<HTMLDivElement>(null)
  const { scrollYProgress } = useScroll({
    target: rail,
    offset: ["start 85%", "end 55%"],
  })

  return (
    <section
      id="como-funciona"
      aria-labelledby="como-funciona-titulo"
      className="flex scroll-mt-20 flex-col gap-8"
    >
      <Reveal className="flex flex-col gap-2">
        <p className="font-heading text-sm font-semibold tracking-widest text-gold uppercase">
          Do convite à primeira carta
        </p>
        <h2
          id="como-funciona-titulo"
          className="font-heading text-3xl font-bold text-balance sm:text-4xl"
        >
          Três passos e a mesa está montada
        </h2>
      </Reveal>

      <div ref={rail} className="relative">
        <div
          aria-hidden
          className="absolute top-0 bottom-0 left-5 w-0.5 bg-felt-line/50 md:top-5 md:right-[16%] md:bottom-auto md:left-[16%] md:h-0.5 md:w-auto"
        >
          <m.div
            style={{ scaleY: scrollYProgress }}
            className="size-full origin-top bg-gold md:hidden"
          />
          <m.div
            style={{ scaleX: scrollYProgress }}
            className="hidden size-full origin-left bg-gold md:block"
          />
        </div>
        <ol className="relative grid gap-6 md:grid-cols-3 md:gap-5">
          {STEPS.map(({ icon: Icon, title, text, art: Art }, index) => (
            <li
              key={title}
              className="relative flex gap-4 md:flex-col md:items-center md:text-center"
            >
              <span className="relative z-10 flex size-10 shrink-0 items-center justify-center rounded-full bg-gold font-heading text-lg font-bold text-gold-foreground shadow-lg ring-4 ring-felt">
                {index + 1}
              </span>
              <Reveal
                delay={index * 0.1}
                className="flex flex-1 flex-col gap-4 rounded-2xl bg-felt-deep/80 p-4 ring-1 ring-felt-line md:w-full"
              >
                <div className="flex min-h-24 items-center justify-center rounded-xl bg-felt/60 p-3">
                  <Art />
                </div>
                <div className="flex flex-col gap-1">
                  <h3 className="flex items-center gap-2 font-heading text-xl font-semibold md:justify-center">
                    <Icon aria-hidden className="size-5 text-gold" />
                    {title}
                  </h3>
                  <p className="text-sm/relaxed text-felt-muted">{text}</p>
                </div>
              </Reveal>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
