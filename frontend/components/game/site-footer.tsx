import Link from "next/link"
import { Bug, ExternalLink, Scale, ShieldAlert } from "lucide-react"

import { GithubIcon } from "@/components/game/github-icon"
import { Separator } from "@/components/ui/separator"
import { GAMES } from "@/lib/game/domain/catalog"
import {
  AUTHOR_NAME,
  AUTHOR_URL,
  ISSUES_URL,
  LICENSE_URL,
  REPOSITORY_URL,
  SECURITY_URL,
} from "@/lib/site"

const LINK_CLASS =
  "inline-flex min-h-11 items-center gap-1.5 rounded-sm text-felt-muted transition-colors outline-none hover:text-gold focus-visible:ring-2 focus-visible:ring-gold"

function ExternalAnchor({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={LINK_CLASS}
    >
      {children}
      <ExternalLink aria-hidden className="size-3 opacity-70" />
      <span className="sr-only">(abre em nova aba)</span>
    </a>
  )
}

function FooterColumn({
  title,
  children,
}: {
  title: string
  children: React.ReactNode
}) {
  return (
    <nav aria-label={title} className="flex flex-col gap-1">
      <h2 className="mb-1 font-heading text-sm font-semibold tracking-wide text-felt-foreground uppercase">
        {title}
      </h2>
      {children}
    </nav>
  )
}

export function SiteFooter() {
  return (
    <footer className="mt-12 border-t border-felt-line bg-felt-deep text-sm">
      <div className="mx-auto grid w-full max-w-6xl gap-8 px-4 py-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="flex flex-col gap-3">
          <p className="font-heading text-2xl font-extrabold text-gold">
            Naipe Real
          </p>
          <p className="max-w-xs text-felt-muted">
            Jogos de baralho online para jogar com os amigos, no PC ou no
            celular. Sem cadastro, sem anúncios e com código aberto.
          </p>
          <a
            href={REPOSITORY_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="hover:bg-felt-glow inline-flex min-h-11 w-fit items-center gap-2 rounded-lg bg-felt px-4 font-semibold text-felt-foreground ring-1 ring-felt-line transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gold"
          >
            <GithubIcon className="size-5" />
            Ver no GitHub
            <span className="sr-only">(abre em nova aba)</span>
          </a>
        </div>

        <FooterColumn title="Jogos">
          {GAMES.map((game) => (
            <Link
              key={game.id}
              href={`/informacoes#${game.rulesAnchor}`}
              className={LINK_CLASS}
            >
              {game.name}
            </Link>
          ))}
          <Link href="/informacoes" className={LINK_CLASS}>
            Regras e informações
          </Link>
        </FooterColumn>

        <FooterColumn title="Site">
          <Link href="/#jogos" className={LINK_CLASS}>
            Escolher um jogo
          </Link>
          <Link href="/#como-funciona" className={LINK_CLASS}>
            Como funciona
          </Link>
          <Link href="/#recursos" className={LINK_CLASS}>
            Recursos
          </Link>
          <Link href="/#duvidas" className={LINK_CLASS}>
            Perguntas frequentes
          </Link>
        </FooterColumn>

        <FooterColumn title="Projeto">
          <ExternalAnchor href={REPOSITORY_URL}>
            <GithubIcon className="size-4" />
            Repositório
          </ExternalAnchor>
          <ExternalAnchor href={ISSUES_URL}>
            <Bug aria-hidden className="size-4" />
            Reportar um problema
          </ExternalAnchor>
          <ExternalAnchor href={SECURITY_URL}>
            <ShieldAlert aria-hidden className="size-4" />
            Relatar uma falha de segurança
          </ExternalAnchor>
          <ExternalAnchor href={LICENSE_URL}>
            <Scale aria-hidden className="size-4" />
            Licença MIT
          </ExternalAnchor>
        </FooterColumn>
      </div>

      <Separator className="bg-felt-line" />

      <div className="mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-2 px-4 py-4 text-center text-felt-muted sm:flex-row sm:text-left">
        <p>
          © {new Date().getFullYear()}{" "}
          <a
            href={AUTHOR_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-11 items-center rounded-sm underline-offset-2 outline-none hover:text-gold hover:underline focus-visible:ring-2 focus-visible:ring-gold"
          >
            {AUTHOR_NAME}
          </a>
          . Distribuído sob a licença MIT.
        </p>
        <p>As salas ficam só na memória do servidor: nada é guardado.</p>
      </div>
    </footer>
  )
}
