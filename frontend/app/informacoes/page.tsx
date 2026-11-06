import type { Metadata } from "next"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { SiteFooter } from "@/components/game/site-footer"
import { Card, CardContent } from "@/components/ui/card"
import { RULE_SECTIONS } from "@/lib/game/domain/how-to-play"
import { POKER_RULE_SECTIONS } from "@/lib/game/domain/poker/how-to-play"
import { TRES_TRINCAS_RULE_SECTIONS } from "@/lib/game/domain/tres-trincas/how-to-play"
import { TRUCO_RULE_SECTIONS } from "@/lib/game/domain/truco/how-to-play"

export const metadata: Metadata = {
  title: "Regras e informações · Baralhada",
  description:
    "Como jogar Rouba Monte, Truco Paulista, Três Trincas e Poker, o que você precisa para começar e como o sistema funciona.",
}

const GENERAL_INFO = [
  {
    title: "O que é",
    text: "Baralhada é um site para jogar baralho online com os amigos. Hoje há o Rouba Monte, para 2 a 6 jogadores com 52 cartas, o Truco Paulista, para 2, 4 ou 6 jogadores com 40 cartas, o Três Trincas, para 2 a 4 jogadores com 52 cartas, e o Poker Texas Hold'em, para 2 a 6 jogadores com 52 cartas e fichas de mentira.",
  },
  {
    title: "O que você precisa",
    text: "Só de um navegador, no PC ou no celular. Não há instalação nem cadastro: basta escolher um apelido.",
  },
  {
    title: "Como começar",
    text: "Uma pessoa cria a sala, escolhe o jogo e manda o código ou o link para os amigos. No Truco, ela também forma os times ou sorteia. Quando todos entrarem, ela inicia a partida.",
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
    text: "No Rouba Monte, o jogo destaca a melhor jogada e as outras possíveis. No Truco, mostra a força das suas cartas e sugere o que jogar ou responder. No Três Trincas, organiza a mão por valor, destaca as trincas prontas e marca as cartas mortas. No Poker, mostra o seu jogo atual e quantas cartas ainda o melhoram. Você pode desligar as dicas no menu da partida.",
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
      <main className="mx-auto flex w-full max-w-full flex-1 flex-col gap-6 px-4 py-6">
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
        <InfoSection
          id="regras-rouba-monte"
          heading="Regras do Rouba Monte"
          items={RULE_SECTIONS}
        />
        <InfoSection
          id="regras-truco"
          heading="Regras do Truco Paulista"
          items={TRUCO_RULE_SECTIONS}
        />
        <InfoSection
          id="regras-tres-trincas"
          heading="Regras do Três Trincas"
          items={TRES_TRINCAS_RULE_SECTIONS}
        />
        <InfoSection
          id="regras-poker"
          heading="Regras do Poker Texas Hold'em"
          items={POKER_RULE_SECTIONS}
        />
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
