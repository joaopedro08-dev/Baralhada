"use client"

import Link from "next/link"
import { BookOpen, Bug, MessageCircleQuestion } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { Reveal } from "@/components/game/home/reveal"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ISSUES_URL, REPOSITORY_URL } from "@/lib/site"

const QUESTIONS = [
  {
    question: "Preciso criar uma conta?",
    answer:
      "Não. Você escolhe um apelido e entra. O navegador guarda só o apelido e a chave para voltar à sala.",
  },
  {
    question: "Quantas pessoas podem jogar?",
    answer:
      "No Rouba Monte, de 2 a 6 pessoas, cada uma por si. No Truco Paulista, 2, 4 ou 6 pessoas, divididas em dois times iguais. No Três Trincas, de 2 a 4 pessoas, cada uma por si. No Poker Texas Hold'em, de 2 a 6 pessoas, até sobrar uma com todas as fichas. Na Cacheta, de 2 a 4 pessoas, até sobrar uma com pontos. No Blackjack, de 1 a 6 pessoas contra a banca, inclusive sozinho.",
  },
  {
    question: "Como convido meus amigos?",
    answer:
      "Na sala, copie o link ou compartilhe o código. Quem abrir o link já cai na tela de entrada com a sala preenchida.",
  },
  {
    question: "O que acontece se a minha conexão cair?",
    answer:
      "Abra o site de novo no mesmo navegador: você volta para a mesma sala e para a sua mão. Se ficar mais de 2 minutos fora, o jogo segue sem você.",
  },
  {
    question: "As cartas dos outros jogadores ficam escondidas?",
    answer:
      "Sim. O servidor decide tudo e só envia a você as suas próprias cartas e o que está na mesa.",
  },
  {
    question: "A sala fica salva depois da partida?",
    answer:
      "Não. As salas existem só na memória do servidor, sem banco de dados, e desaparecem quando todos saem ou o servidor reinicia.",
  },
  {
    question: "O Naipe Real é gratuito? O código é aberto?",
    answer: `É gratuito e o código é aberto, sob licença MIT. Você pode ver, sugerir melhorias ou reportar problemas no repositório: ${REPOSITORY_URL.replace("https://", "")}.`,
  },
] as const

export function Faq() {
  return (
    <section
      id="duvidas"
      aria-labelledby="duvidas-titulo"
      className="grid scroll-mt-20 gap-6 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12"
    >
      <Reveal className="flex flex-col gap-4 lg:sticky lg:top-24 lg:self-start">
        <MessageCircleQuestion aria-hidden className="size-10 text-gold" />
        <h2
          id="duvidas-titulo"
          className="font-heading text-3xl font-bold text-balance sm:text-4xl"
        >
          Perguntas frequentes
        </h2>
        <p className="text-felt-muted">
          O essencial para começar. As regras completas de cada jogo ficam na
          página de informações.
        </p>
        <div className="flex flex-wrap gap-2">
          <GameButton asChild>
            <Link href="/informacoes">
              <BookOpen aria-hidden />
              Regras e informações
            </Link>
          </GameButton>
          <GameButton asChild>
            <a href={ISSUES_URL} target="_blank" rel="noopener noreferrer">
              <Bug aria-hidden />
              Reportar um problema
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </GameButton>
        </div>
      </Reveal>
      <Reveal>
        <Accordion type="single" collapsible className="flex flex-col gap-2">
          {QUESTIONS.map(({ question, answer }) => (
            <AccordionItem
              key={question}
              value={question}
              className="overflow-hidden rounded-xl border-0 bg-felt-deep/70 ring-1 ring-felt-line transition-colors data-open:bg-felt-deep data-open:ring-gold/50"
            >
              <AccordionTrigger className="min-h-14 items-center px-4 text-base font-semibold hover:no-underline focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset **:data-[slot=accordion-trigger-icon]:text-gold">
                {question}
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 text-sm/relaxed text-felt-muted">
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  )
}
