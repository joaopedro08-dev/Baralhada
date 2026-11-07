import type { Metadata } from "next"
import Link from "next/link"
import {
  ArrowRight,
  Clock,
  DoorOpen,
  Eye,
  Layers,
  Lightbulb,
  Plus,
  Radio,
  RefreshCw,
  Share2,
  ShieldCheck,
  Smartphone,
  Swords,
  Users,
} from "lucide-react"

import { CardFace, SuitIcon } from "@/components/game/cards/card-face"
import { GAME_IDENTITY } from "@/components/game/game-identity"
import { GameButton } from "@/components/game/game-button"
import { InfoNav } from "@/components/game/info/info-nav"
import type { InfoSectionLink } from "@/components/game/info/info-nav"
import { SiteFooter } from "@/components/game/site-footer"
import { SiteHeader } from "@/components/game/site-header"
import type { HeaderLink } from "@/components/game/site-header"
import { Badge } from "@/components/ui/badge"
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb"
import { describePlayerCounts, GAMES } from "@/lib/game/domain/catalog"
import type { GameInfo } from "@/lib/game/domain/catalog"
import { RULE_SECTIONS } from "@/lib/game/domain/how-to-play"
import { BLACKJACK_RULE_SECTIONS } from "@/lib/game/domain/blackjack/how-to-play"
import { CACHETA_RULE_SECTIONS } from "@/lib/game/domain/cacheta/how-to-play"
import { POKER_RULE_SECTIONS } from "@/lib/game/domain/poker/how-to-play"
import { TRES_TRINCAS_RULE_SECTIONS } from "@/lib/game/domain/tres-trincas/how-to-play"
import { TRUCO_RULE_SECTIONS } from "@/lib/game/domain/truco/how-to-play"
import type { GameId } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

export const metadata: Metadata = {
  title: "Regras e informações · Baralhada",
  description:
    "Como jogar Rouba Monte, Truco Paulista, Três Trincas, Poker, Cacheta e Blackjack, o que você precisa para começar e como o sistema funciona.",
}

type RuleItem = { readonly title: string; readonly text: string }

const RULES: Readonly<Record<GameId, readonly RuleItem[]>> = {
  "rouba-monte": RULE_SECTIONS,
  "truco-paulista": TRUCO_RULE_SECTIONS,
  "tres-trincas": TRES_TRINCAS_RULE_SECTIONS,
  "poker-texas-holdem": POKER_RULE_SECTIONS,
  cacheta: CACHETA_RULE_SECTIONS,
  blackjack: BLACKJACK_RULE_SECTIONS,
}

const HEADER_LINKS: readonly HeaderLink[] = [
  { href: "/#jogos", label: "Jogos" },
  { href: "/#como-funciona", label: "Como funciona" },
  { href: "/#duvidas", label: "Dúvidas" },
  { href: "/informacoes", label: "Regras", current: true },
]

const HEADER_CTA: HeaderLink = { href: "/#entrar", label: "Jogar agora" }

const SECTIONS: readonly InfoSectionLink[] = [
  { id: "informacoes-gerais", label: "Para começar", suit: null },
  ...GAMES.map((game) => ({
    id: game.rulesAnchor,
    label: GAME_IDENTITY[game.id].short,
    suit: GAME_IDENTITY[game.id].suit,
  })),
  { id: "sobre-o-sistema", label: "Sobre o sistema", suit: null },
]

const GENERAL_STEPS = [
  {
    icon: Plus,
    title: "Crie a sala",
    text: "Escolha um apelido e o jogo. Não há instalação nem cadastro: basta um navegador, no PC ou no celular.",
  },
  {
    icon: Share2,
    title: "Chame os amigos",
    text: "Mande o código ou o link. No Truco, quem criou a sala também forma os times ou sorteia.",
  },
  {
    icon: DoorOpen,
    title: "Comece a partida",
    text: "Quando todos entrarem, o anfitrião inicia. Cada pessoa joga pelo próprio aparelho.",
  },
] as const

const SYSTEM_INFO = [
  {
    icon: Radio,
    title: "Partida em tempo real",
    text: "O servidor confere cada jogada e envia a cada jogador só o que ele pode ver. Ninguém vê a mão dos outros.",
  },
  {
    icon: RefreshCw,
    title: "Se a conexão cair",
    text: "Abra o jogo de novo no mesmo navegador para voltar à sua sala e à sua mão.",
  },
  {
    icon: Lightbulb,
    title: "Dicas",
    text: "No Rouba Monte, o jogo destaca a melhor jogada e as outras possíveis. No Truco, mostra a força das suas cartas e sugere o que jogar ou responder. No Três Trincas, organiza a mão por valor, destaca as trincas prontas e marca as cartas mortas. No Poker, mostra o seu jogo atual e quantas cartas ainda o melhoram. Na Cacheta, junta os jogos prontos na mão, avisa quando dá para bater e sugere o descarte. No Blackjack, sugere pedir, parar, dobrar ou dividir pela estratégia básica. Você pode desligar as dicas no menu da partida.",
  },
  {
    icon: ShieldCheck,
    title: "Seus dados",
    text: "O navegador guarda seu apelido e a chave para voltar à sala. As salas ficam só na memória do servidor, sem banco de dados, e se perdem quando ele reinicia.",
  },
] as const

const SECTION_SCROLL = "scroll-mt-36 lg:scroll-mt-24"

function SectionHeading({
  id,
  eyebrow,
  children,
}: {
  id: string
  eyebrow: string
  children: React.ReactNode
}) {
  return (
    <div className="flex flex-col gap-1">
      <p className="font-heading text-xs font-semibold tracking-widest text-gold uppercase">
        {eyebrow}
      </p>
      <h2 id={id} className="font-heading text-3xl font-bold text-balance">
        {children}
      </h2>
    </div>
  )
}

function GameJumpCard({ game }: { game: GameInfo }) {
  const { suit, short, accent } = GAME_IDENTITY[game.id]
  return (
    <Link
      href={`#${game.rulesAnchor}`}
      className="group/jump flex min-h-11 items-center gap-3 rounded-2xl bg-felt-deep/70 p-3 ring-1 ring-felt-line transition-all outline-none hover:-translate-y-0.5 hover:bg-felt-deep hover:ring-gold/50 focus-visible:ring-2 focus-visible:ring-gold"
    >
      <span className="flex h-12 w-9 shrink-0 items-center justify-center rounded-md bg-playing-card shadow-md transition-transform group-hover/jump:-rotate-6">
        <SuitIcon suit={suit} className="size-5" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col">
        <span className={cn("font-heading text-base font-bold", accent)}>
          {short}
        </span>
        <span className="text-xs text-felt-muted">
          {describePlayerCounts(game)}
        </span>
      </span>
      <ArrowRight
        aria-hidden
        className="size-4 shrink-0 text-felt-muted transition-transform group-hover/jump:translate-x-0.5"
      />
    </Link>
  )
}

function GameFact({
  icon: Icon,
  children,
}: {
  icon: typeof Users
  children: React.ReactNode
}) {
  return (
    <Badge
      variant="outline"
      className="h-7 gap-1.5 border-felt-line bg-felt-deep/60 px-2.5 text-xs text-felt-foreground"
    >
      <Icon aria-hidden className="size-3.5 text-gold" />
      {children}
    </Badge>
  )
}

function GameRules({ game }: { game: GameInfo }) {
  const { accent, glow } = GAME_IDENTITY[game.id]
  const headingId = `${game.rulesAnchor}-titulo`
  return (
    <section
      id={game.rulesAnchor}
      aria-labelledby={headingId}
      className={cn("flex flex-col gap-5", SECTION_SCROLL)}
    >
      <header
        className={cn(
          "relative flex flex-col gap-4 overflow-hidden rounded-3xl bg-gradient-to-br to-felt-deep/40 p-5 ring-1 ring-felt-line sm:flex-row sm:items-center sm:p-6",
          glow
        )}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-3">
          <p className="font-heading text-xs font-semibold tracking-widest text-gold uppercase">
            Regras
          </p>
          <h2
            id={headingId}
            className={cn(
              "font-heading text-3xl font-bold sm:text-4xl",
              accent
            )}
          >
            {game.name}
          </h2>
          <p className="max-w-xl text-base/relaxed">{game.tagline}</p>
          <div className="flex flex-wrap gap-1.5">
            <GameFact icon={Users}>{describePlayerCounts(game)}</GameFact>
            <GameFact icon={Swords}>{game.mode}</GameFact>
            <GameFact icon={Layers}>{game.deck}</GameFact>
            <GameFact icon={Clock}>{game.turnSeconds} s por jogada</GameFact>
          </div>
        </div>
        <div aria-hidden className="flex shrink-0 -space-x-6 self-center pr-2">
          {game.sample.map((card, index) => (
            <CardFace
              key={card}
              card={card}
              size="flying"
              className={cn(
                "shadow-xl",
                index === 0 && "-rotate-10",
                index === 1 && "z-10 -translate-y-2",
                index === 2 && "rotate-10"
              )}
            />
          ))}
        </div>
      </header>

      <div className="flex flex-col gap-2 rounded-2xl bg-gold/10 p-4 ring-1 ring-gold/40">
        <h3 className="flex items-center gap-2 font-heading text-base font-semibold text-gold">
          <Eye aria-hidden className="size-4" />
          Em 10 segundos
        </h3>
        <ul className="grid gap-2 text-sm/relaxed sm:grid-cols-3">
          {game.highlights.map((highlight) => (
            <li key={highlight} className="flex gap-2">
              <span aria-hidden className="text-gold">
                ♠
              </span>
              {highlight}
            </li>
          ))}
        </ul>
      </div>

      <ol className="grid gap-3 md:grid-cols-2">
        {RULES[game.id].map(({ title, text }, index) => (
          <li
            key={title}
            className="flex gap-3 rounded-2xl bg-felt-deep/60 p-4 ring-1 ring-felt-line"
          >
            <span
              aria-hidden
              className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-playing-card font-heading text-sm font-bold text-suit-black shadow"
            >
              {index + 1}
            </span>
            <div className="flex min-w-0 flex-col gap-1">
              <h3 className="font-heading text-lg leading-snug font-semibold">
                {title}
              </h3>
              <p className="text-sm/relaxed text-felt-muted">{text}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  )
}

export default function InformationPage() {
  return (
    <div className="flex min-h-svh flex-col overflow-x-clip">
      <SiteHeader links={HEADER_LINKS} cta={HEADER_CTA} />
      <main className="hero-glow flex-1">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-8 px-4 pt-6 pb-8 sm:pt-10">
          <header className="flex flex-col gap-5">
            <Breadcrumb>
              <BreadcrumbList className="text-sm text-felt-muted">
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link
                      href="/"
                      className="inline-flex min-h-11 items-center hover:text-gold"
                    >
                      Início
                    </Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage className="text-felt-foreground">
                    Regras e informações
                  </BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
            <div className="flex flex-col gap-3">
              <h1 className="font-heading text-4xl font-extrabold tracking-tight text-balance sm:text-5xl">
                Regras e informações
              </h1>
              <p className="max-w-2xl text-base/relaxed text-felt-muted sm:text-lg">
                Tudo o que você precisa para sentar à mesa: como começar, as
                regras de cada jogo em blocos curtos e como o Baralhada funciona
                por trás.
              </p>
            </div>
            <nav aria-label="Ir para as regras de um jogo">
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {GAMES.map((game) => (
                  <li key={game.id}>
                    <GameJumpCard game={game} />
                  </li>
                ))}
              </ul>
            </nav>
          </header>

          <div className="grid grid-cols-1 gap-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
            <InfoNav sections={SECTIONS} />

            <div className="flex min-w-0 flex-col gap-16">
              <section
                id="informacoes-gerais"
                aria-labelledby="informacoes-gerais-titulo"
                className={cn("flex flex-col gap-5", SECTION_SCROLL)}
              >
                <SectionHeading
                  id="informacoes-gerais-titulo"
                  eyebrow="Informações gerais"
                >
                  Para começar
                </SectionHeading>
                <p className="max-w-2xl text-felt-muted">
                  Baralhada é um site para jogar baralho online com os amigos:
                  Rouba Monte, Truco Paulista, Três Trincas, Cacheta, Poker
                  Texas Hold&apos;em e Blackjack, os dois últimos com fichas de
                  mentira.
                </p>
                <ol className="grid gap-3 md:grid-cols-3">
                  {GENERAL_STEPS.map(({ icon: Icon, title, text }, index) => (
                    <li
                      key={title}
                      className="flex flex-col gap-2 rounded-2xl bg-felt-deep/60 p-4 ring-1 ring-felt-line"
                    >
                      <span className="flex items-center gap-2">
                        <span
                          aria-hidden
                          className="flex size-8 items-center justify-center rounded-full bg-gold font-heading text-sm font-bold text-gold-foreground"
                        >
                          {index + 1}
                        </span>
                        <Icon aria-hidden className="size-5 text-gold" />
                      </span>
                      <h3 className="font-heading text-lg font-semibold">
                        {title}
                      </h3>
                      <p className="text-sm/relaxed text-felt-muted">{text}</p>
                    </li>
                  ))}
                </ol>
              </section>

              {GAMES.map((game) => (
                <GameRules key={game.id} game={game} />
              ))}

              <section
                id="sobre-o-sistema"
                aria-labelledby="sobre-o-sistema-titulo"
                className={cn("flex flex-col gap-5", SECTION_SCROLL)}
              >
                <SectionHeading id="sobre-o-sistema-titulo" eyebrow="Por trás">
                  Sobre o sistema
                </SectionHeading>
                <ul className="grid gap-3 md:grid-cols-2">
                  {SYSTEM_INFO.map(({ icon: Icon, title, text }) => (
                    <li
                      key={title}
                      className="flex gap-3 rounded-2xl bg-felt-deep/60 p-4 ring-1 ring-felt-line"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-felt ring-1 ring-felt-line">
                        <Icon aria-hidden className="size-5 text-gold" />
                      </span>
                      <div className="flex flex-col gap-1">
                        <h3 className="font-heading text-lg font-semibold">
                          {title}
                        </h3>
                        <p className="text-sm/relaxed text-felt-muted">
                          {text}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>

              <section
                aria-labelledby="pronto-titulo"
                className="flex flex-col items-center gap-4 rounded-3xl bg-felt-deep px-6 py-10 text-center ring-1 ring-gold/40"
              >
                <Smartphone aria-hidden className="size-8 text-gold" />
                <h2
                  id="pronto-titulo"
                  className="font-heading text-3xl font-bold text-balance"
                >
                  Já sabe as regras? Bora para a mesa.
                </h2>
                <p className="max-w-md text-felt-muted">
                  Crie uma sala em segundos e mande o link para os amigos.
                </p>
                <GameButton asChild tone="gold" className="h-12 px-6 text-base">
                  <Link href="/#entrar">
                    <Plus aria-hidden />
                    Criar uma sala
                  </Link>
                </GameButton>
              </section>
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  )
}
