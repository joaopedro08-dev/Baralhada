"use client"

import Link from "next/link"
import { Menu, Spade, X } from "lucide-react"

import { GameButton } from "@/components/game/game-button"
import { GithubIcon } from "@/components/game/github-icon"
import { ThemeToggle } from "@/components/game/theme-toggle"
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { REPOSITORY_URL } from "@/lib/site"
import { cn } from "@/lib/utils"

export interface HeaderLink {
  readonly href: string
  readonly label: string
  readonly current?: boolean
}

const NAV_LINK =
  "inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-felt-muted transition-colors outline-none hover:text-gold focus-visible:ring-2 focus-visible:ring-gold aria-[current=page]:text-gold"

export function BrandMark({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn(
        "group/brand inline-flex min-h-11 items-center gap-2 rounded-md font-heading text-xl font-extrabold text-gold outline-none focus-visible:ring-2 focus-visible:ring-gold",
        className
      )}
    >
      <span
        aria-hidden
        className="flex h-8 w-6 -rotate-8 items-center justify-center rounded-[0.3rem] bg-playing-card shadow-md ring-1 ring-black/25 transition-transform duration-300 group-hover/brand:rotate-6"
      >
        <Spade fill="currentColor" className="size-3.5 text-suit-black" />
      </span>
      Baralhada
    </Link>
  )
}

function MobileMenu({
  links,
  cta,
}: {
  links: readonly HeaderLink[]
  cta: HeaderLink
}) {
  return (
    <Sheet>
      <SheetTrigger asChild>
        <GameButton aria-label="Abrir menu" className="px-0 md:hidden">
          <Menu aria-hidden />
        </GameButton>
      </SheetTrigger>
      <SheetContent
        side="right"
        showCloseButton={false}
        className="w-[min(20rem,85vw)] border-felt-line bg-felt-deep text-felt-foreground"
      >
        <SheetHeader className="flex-row items-center justify-between p-4">
          <SheetTitle className="font-heading text-lg font-bold text-gold">
            Menu
          </SheetTitle>
          <SheetDescription className="sr-only">
            Navegação do Baralhada
          </SheetDescription>
          <SheetClose asChild>
            <GameButton aria-label="Fechar menu" className="px-0">
              <X aria-hidden />
            </GameButton>
          </SheetClose>
        </SheetHeader>
        <nav aria-label="Menu principal" className="flex flex-col gap-1 px-4">
          {links.map((link) => (
            <SheetClose asChild key={link.href}>
              <Link
                href={link.href}
                aria-current={link.current ? "page" : undefined}
                className={cn(NAV_LINK, "text-base")}
              >
                {link.label}
              </Link>
            </SheetClose>
          ))}
        </nav>
        <div className="mt-auto flex flex-col gap-2 p-4">
          <SheetClose asChild>
            <GameButton asChild tone="gold" className="h-12 text-base">
              <Link href={cta.href}>{cta.label}</Link>
            </GameButton>
          </SheetClose>
          <GameButton asChild>
            <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
              <GithubIcon />
              Código no GitHub
              <span className="sr-only">(abre em nova aba)</span>
            </a>
          </GameButton>
        </div>
      </SheetContent>
    </Sheet>
  )
}

export function SiteHeader({
  links,
  cta,
}: {
  links: readonly HeaderLink[]
  cta: HeaderLink
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-felt-line/60 bg-felt-deep/85 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-1 px-4">
        <BrandMark className="mr-auto" />
        <nav
          aria-label="Seções do site"
          className="hidden items-center md:flex"
        >
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={link.current ? "page" : undefined}
              className={NAV_LINK}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <ThemeToggle />
        <GameButton
          asChild
          className="hidden px-0 sm:inline-flex"
          aria-label="Repositório no GitHub"
        >
          <a href={REPOSITORY_URL} target="_blank" rel="noopener noreferrer">
            <GithubIcon />
            <span className="sr-only">GitHub (abre em nova aba)</span>
          </a>
        </GameButton>
        <GameButton asChild tone="gold" className="ml-1 px-3 sm:px-4">
          <Link href={cta.href}>{cta.label}</Link>
        </GameButton>
        <MobileMenu links={links} cta={cta} />
      </div>
    </header>
  )
}
