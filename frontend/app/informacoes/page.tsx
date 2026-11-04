import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { SiteFooter } from "@/components/game/site-footer"
import { Card, CardContent } from "@/components/ui/card"
import { RULE_SECTIONS } from "@/lib/game/domain/how-to-play"

export const metadata: Metadata = {
  title: "Regras e informações · Rouba Monte",
  description:
    "Como jogar Rouba Monte, o que você precisa para começar e como o sistema funciona.",
}

const GENERAL_INFO = [
  {
    title: "O que é",
    text: "Rouba Monte é um jogo de cartas online para 2 a 6 amigos, com um baralho de 52 cartas.",
  },
  {
    title: "O que você precisa",
    text: "Só de um navegador, no PC ou no celular. Não há instalação nem cadastro: basta escolher um apelido.",
  },
  {
    title: "Como começar",
    text: "Uma pessoa cria a sala e manda o código ou o link para os amigos. Quando todos entrarem, ela inicia a partida.",
  },
] as const

const SYSTEM_INFO = [
  {
    title: "Partida em tempo real",
    text: "O servidor confere cada jogada e envia a cada jogador só o que ele pode ver. Ninguém vê a mão dos outros.",
  },
  {
    title: "Se a conexão cair",
    text: "Abra o jogo de novo no mesmo navegador para voltar à sua sala e à sua mão.",
  },
  {
    title: "Dicas",
    text: "O jogo destaca a melhor jogada e as outras possíveis. Você pode desligar as dicas no menu da partida.",
  },
  {
    title: "Seus dados",
    text: "O navegador guarda seu apelido e a chave para voltar à sala. As salas ficam só na memória do servidor, sem banco de dados, e se perdem quando ele reinicia.",
  },
] as const

function InfoSection({
  id,
  heading,
  items,
}: {
  id: string
  heading: string
  items: readonly { readonly title: string; readonly text: string }[]
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3">
      <h2 id={id} className="font-heading text-2xl font-bold">
        {heading}
      </h2>
      <Card>
        <CardContent className="flex flex-col gap-4">
          {items.map(({ title, text }) => (
            <div key={title} className="flex flex-col gap-1">
              <h3 className="font-heading text-base font-semibold">{title}</h3>
              <p className="text-sm/relaxed">{text}</p>
            </div>
          ))}
        </CardContent>
      </Card>
    </section>
  )
}

export default function InformationPage() {
  return (
    <div className="flex min-h-svh flex-col">
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-6 px-4 py-6">
        <header className="flex flex-col items-start gap-3">
          <GameButton asChild>
            <Link href="/">
              <ArrowLeft aria-hidden />
              Voltar ao jogo
            </Link>
          </GameButton>
          <h1 className="font-heading text-3xl font-bold">
            Regras e informações
          </h1>
        </header>

        <InfoSection
          id="informacoes-gerais"
          heading="Informações gerais"
          items={GENERAL_INFO}
        />
        <InfoSection id="regras" heading="Regras" items={RULE_SECTIONS} />
        <InfoSection
          id="sobre-o-sistema"
          heading="Sobre o sistema"
          items={SYSTEM_INFO}
        />
      </main>
      <SiteFooter />
    </div>
  )
}
