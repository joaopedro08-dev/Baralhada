"use client"

import { Link2, PlayCircle, UserPen, UsersRound } from "lucide-react"

import { Reveal } from "@/components/game/home/reveal"

const STEPS = [
  {
    icon: UserPen,
    title: "Escolha um apelido",
    text: "Sem cadastro, senha ou e-mail. Só o nome que os amigos vão ver na mesa.",
  },
  {
    icon: PlayCircle,
    title: "Crie a sala e o jogo",
    text: "Escolha Rouba Monte ou Truco Paulista. Você pode trocar de jogo no saguão.",
  },
  {
    icon: Link2,
    title: "Convide os amigos",
    text: "Copie o link ou passe o código da sala. Cada pessoa entra pelo próprio aparelho.",
  },
  {
    icon: UsersRound,
    title: "Monte os times e jogue",
    text: "No Truco, você arruma as duplas ou sorteia. Quando todos estiverem prontos, é só iniciar.",
  },
] as const

export function HowItWorks() {
  return (
    <section
      id="como-funciona"
      aria-labelledby="como-funciona-titulo"
      className="flex scroll-mt-20 flex-col gap-6"
    >
      <Reveal className="flex flex-col gap-2">
        <h2
          id="como-funciona-titulo"
          className="font-heading text-3xl font-bold"
        >
          Como funciona
        </h2>
        <p className="max-w-2xl text-felt-muted">
          Do clique à primeira carta, são quatro passos.
        </p>
      </Reveal>

      <ol className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map(({ icon: Icon, title, text }, index) => (
          <li key={title}>
            <Reveal
              delay={index * 0.08}
              className="flex h-full flex-col gap-3 rounded-xl bg-felt-deep/80 p-4 ring-1 ring-felt-line"
            >
              <span className="flex items-center gap-3">
                <span
                  aria-hidden
                  className="flex size-10 items-center justify-center rounded-full bg-gold font-heading text-lg font-bold text-gold-foreground"
                >
                  {index + 1}
                </span>
                <Icon aria-hidden className="size-6 text-gold" />
              </span>
              <h3 className="font-heading text-lg font-semibold">{title}</h3>
              <p className="text-sm/relaxed text-felt-muted">{text}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  )
}
