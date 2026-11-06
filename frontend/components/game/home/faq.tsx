"use client"

import { Reveal } from "@/components/game/home/reveal"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { REPOSITORY_URL } from "@/lib/site"

const QUESTIONS = [
  {
    question: "Preciso criar uma conta?",
    answer:
      "Não. Você escolhe um apelido e entra. O navegador guarda só o apelido e a chave para voltar à sala.",
  },
  {
    question: "Quantas pessoas podem jogar?",
    answer:
      "No Rouba Monte, de 2 a 6 pessoas, cada uma por si. No Truco Paulista, 2, 4 ou 6 pessoas, divididas em dois times iguais. No Três Trincas, de 2 a 4 pessoas, cada uma por si. No Poker Texas Hold'em, de 2 a 6 pessoas, até sobrar uma com todas as fichas.",
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
    question: "O Baralhada é gratuito? O código é aberto?",
    answer: `É gratuito e o código é aberto, sob licença MIT. Você pode ver, sugerir melhorias ou reportar problemas no repositório: ${REPOSITORY_URL.replace("https://", "")}.`,
  },
] as const

export function Faq() {
  return (
    <section
      id="duvidas"
      aria-labelledby="duvidas-titulo"
      className="mx-auto flex w-full max-w-3xl scroll-mt-20 flex-col gap-6"
    >
      <Reveal className="flex flex-col gap-2 text-center">
        <h2 id="duvidas-titulo" className="font-heading text-3xl font-bold">
          Perguntas frequentes
        </h2>
      </Reveal>
      <Reveal>
        <Accordion
          type="single"
          collapsible
          className="overflow-hidden rounded-xl bg-card text-card-foreground ring-1 ring-felt-line"
        >
          {QUESTIONS.map(({ question, answer }) => (
            <AccordionItem key={question} value={question}>
              <AccordionTrigger className="min-h-12 items-center p-4 text-base">
                {question}
              </AccordionTrigger>
              <AccordionContent className="px-4 pb-4 text-sm/relaxed">
                {answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </Reveal>
    </section>
  )
}
