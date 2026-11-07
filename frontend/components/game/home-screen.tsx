"use client"

import dynamic from "next/dynamic"
import { domAnimation, LazyMotion, MotionConfig } from "framer-motion"

import { EntryPanel } from "@/components/game/home/entry-panel"
import { Faq } from "@/components/game/home/faq"
import { Features } from "@/components/game/home/features"
import { GameShowcase } from "@/components/game/home/game-showcase"
import { HomeHero } from "@/components/game/home/home-hero"
import { HowItWorks } from "@/components/game/home/how-it-works"
import { SuitMarquee } from "@/components/game/home/suit-marquee"
import { ENTRY_ANCHOR, useEntry } from "@/components/game/home/use-entry"
import { SiteFooter } from "@/components/game/site-footer"
import { SiteHeader } from "@/components/game/site-header"
import type { HeaderLink } from "@/components/game/site-header"
import { cn } from "@/lib/utils"

const ClosingCall = dynamic(() =>
  import("@/components/game/home/closing-call").then((mod) => mod.ClosingCall)
)

const HEADER_LINKS: readonly HeaderLink[] = [
  { href: "#jogos", label: "Jogos" },
  { href: "#como-funciona", label: "Como funciona" },
  { href: "#duvidas", label: "Dúvidas" },
  { href: "/informacoes", label: "Regras" },
]

const HEADER_CTA: HeaderLink = {
  href: `#${ENTRY_ANCHOR}`,
  label: "Jogar agora",
}

export function HomeScreen() {
  const [entry, nicknameInput] = useEntry()

  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">
        <div className="flex min-h-svh flex-col overflow-x-clip">
          <SiteHeader links={HEADER_LINKS} cta={HEADER_CTA} />
          <main className="hero-glow flex-1">
            <div className="mx-auto flex w-full max-w-6xl flex-col gap-20 px-4 pt-8 pb-8 sm:gap-24 sm:pt-14">
              <section
                aria-label="Entrar em uma sala"
                className="grid grid-cols-1 items-center gap-10 lg:grid-cols-[1.05fr_1fr] lg:gap-14"
              >
                <HomeHero gameId={entry.gameId} onChoose={entry.chooseGame} />
                <div
                  className={cn(
                    "mx-auto w-full max-w-md lg:max-w-none",
                    entry.invited && "order-first lg:order-0"
                  )}
                >
                  <EntryPanel entry={entry} nicknameInput={nicknameInput} />
                </div>
              </section>

              <SuitMarquee />
              <GameShowcase onPick={entry.pickGame} />
              <HowItWorks />
              <Features />
              <Faq />
              <ClosingCall
                onCreate={() => entry.openEntry("criar")}
                onJoin={() => entry.openEntry("entrar")}
              />
            </div>
          </main>
          <SiteFooter />
        </div>
      </MotionConfig>
    </LazyMotion>
  )
}
