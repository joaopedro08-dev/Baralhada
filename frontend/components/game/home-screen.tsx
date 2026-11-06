"use client"

import Link from "next/link"
import { domAnimation, LazyMotion, MotionConfig } from "framer-motion"
import { BookOpen } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { GithubIcon } from "@/components/game/github-icon"
import { EntryPanel } from "@/components/game/home/entry-panel"
import { Faq } from "@/components/game/home/faq"
import { Features } from "@/components/game/home/features"
import { GameShowcase } from "@/components/game/home/game-showcase"
import { HomeHero } from "@/components/game/home/home-hero"
import { HowItWorks } from "@/components/game/home/how-it-works"
import { Reveal } from "@/components/game/home/reveal"
import { useEntry } from "@/components/game/home/use-entry"
import { SiteFooter } from "@/components/game/site-footer"
import { REPOSITORY_URL } from "@/lib/site"

const NAV_LINK =
  "hidden min-h-11 items-center rounded-md px-3 text-sm font-medium text-felt-muted transition-colors outline-none hover:text-gold focus-visible:ring-2 focus-visible:ring-gold md:inline-flex"

function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-felt-line bg-felt-deep/90 backdrop-blur">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-1 px-4">
        <Link
          href="/"
          className="mr-auto inline-flex min-h-11 items-center rounded-md font-heading text-xl font-extrabold text-gold outline-none focus-visible:ring-2 focus-visible:ring-gold"
        >
          Baralhada
        </Link>
        <nav aria-label="Seções do site" className="flex items-center">
          <a href="#jogos" className={NAV_LINK}>
            Jogos
          </a>
          <a href="#como-funciona" className={NAV_LINK}>
            Como funciona
          </a>
          <a href="#duvidas" className={NAV_LINK}>
            Dúvidas
          </a>
        </nav>
        <GameButton asChild className="px-3">
          <Link href="/informacoes">
            <BookOpen aria-hidden />
            Regras
          </Link>
        </GameButton>
        <GameButton asChild className="px-3" aria-label="Repositório no GitHub">
          <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
            <GithubIcon />
            <span className="sr-only">GitHub (abre em nova aba)</span>
          </a>
        </GameButton>
      </div>
    </header>
  )
}

function ClosingCall({ onPlay }: { onPlay: () => void }) {
  return (
    <Reveal className="flex flex-col items-center gap-4 rounded-2xl bg-felt-deep px-6 py-10 text-center ring-1 ring-gold/40">
      <h2 className="font-heading text-3xl font-bold text-balance">
        A mesa está pronta. Falta só você.
      </h2>
      <p className="max-w-lg text-felt-muted">
        Chame os amigos, escolha o jogo e comece uma partida agora mesmo.
      </p>
      <GameButton tone="gold" onClick={onPlay} className="h-12 px-6 text-base">
        Criar uma sala
      </GameButton>
    </Reveal>
  )
}

export function HomeScreen() {
  const [entry, nicknameInput] = useEntry()

  const playNow = () => {
    document
      .getElementById("entrar")
      ?.scrollIntoView({ behavior: "smooth", block: "center" })
    nicknameInput.current?.focus({ preventScroll: true })
  }

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <div className="flex min-h-svh flex-col">
          <SiteHeader />
          <main className="hero-glow flex-1">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-16 px-4 py-8 sm:py-12">
              <section
                aria-label="Entrar em uma sala"
                className="grid items-center gap-8 lg:grid-cols-[1.1fr_1fr] lg:gap-12"
              >
                <HomeHero />
                <div className="mx-auto w-full max-w-md lg:max-w-none">
                  <EntryPanel entry={entry} nicknameInput={nicknameInput} />
                </div>
              </section>

              <GameShowcase onPick={entry.pickGame} />
              <HowItWorks />
              <Features />
              <Faq />
              <ClosingCall onPlay={playNow} />
            </div>
          </main>
          <SiteFooter />
        </div>
      </MotionConfig>
    </LazyMotion>
  )
}
