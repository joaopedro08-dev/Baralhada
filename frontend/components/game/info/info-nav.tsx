"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { SuitIcon } from "@/components/game/cards/card-face"
import type { Suit } from "@/lib/game/domain/types"
import { cn } from "@/lib/utils"

export interface InfoSectionLink {
  readonly id: string
  readonly label: string
  readonly suit: Suit | null
}

const useActiveSection = (ids: readonly string[]): string | null => {
  const [active, setActive] = useState<string | null>(ids[0] ?? null)

  useEffect(() => {
    const targets = ids
      .map((id) => document.getElementById(id))
      .filter((target): target is HTMLElement => target !== null)
    const watcher = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (first, second) =>
              first.boundingClientRect.top - second.boundingClientRect.top
          )
        const first = visible[0]
        if (first) setActive(first.target.id)
      },
      { rootMargin: "-25% 0px -65% 0px" }
    )
    for (const target of targets) watcher.observe(target)
    return () => watcher.disconnect()
  }, [ids])

  return active
}

function NavItem({
  section,
  active,
  compact,
}: {
  section: InfoSectionLink
  active: boolean
  compact: boolean
}) {
  return (
    <a
      href={`#${section.id}`}
      data-section={section.id}
      aria-current={active ? "location" : undefined}
      className={cn(
        "flex min-h-11 shrink-0 items-center gap-2 rounded-full text-sm font-medium whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-gold",
        compact ? "px-3.5" : "rounded-lg px-3",
        active
          ? "bg-gold text-gold-foreground"
          : "text-felt-muted hover:bg-felt-deep hover:text-felt-foreground"
      )}
    >
      {section.suit && (
        <span
          aria-hidden
          className="flex size-5 items-center justify-center rounded-sm bg-playing-card"
        >
          <SuitIcon suit={section.suit} className="size-3" />
        </span>
      )}
      {section.label}
    </a>
  )
}

export function InfoNav({
  sections,
}: {
  sections: readonly InfoSectionLink[]
}) {
  const ids = useMemo(() => sections.map((section) => section.id), [sections])
  const active = useActiveSection(ids)
  const strip = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const container = strip.current
    const chip = container?.querySelector<HTMLElement>(
      `[data-section="${active}"]`
    )
    if (!container || !chip) return
    container.scrollTo({
      left: chip.offsetLeft - container.clientWidth / 2 + chip.clientWidth / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
    })
  }, [active])

  return (
    <>
      <nav
        aria-label="Seções da página"
        className="sticky top-16 z-20 -mx-4 border-b border-felt-line/60 bg-felt-deep/90 backdrop-blur-md lg:hidden"
      >
        <div
          ref={strip}
          className="flex [scrollbar-width:none] gap-1.5 overflow-x-auto px-4 py-2"
        >
          {sections.map((section) => (
            <NavItem
              key={section.id}
              section={section}
              active={section.id === active}
              compact
            />
          ))}
        </div>
      </nav>
      <nav
        aria-label="Índice"
        className="sticky top-24 hidden flex-col gap-1 self-start lg:flex"
      >
        <p className="mb-2 px-3 font-heading text-xs font-semibold tracking-widest text-gold uppercase">
          Nesta página
        </p>
        {sections.map((section) => (
          <NavItem
            key={section.id}
            section={section}
            active={section.id === active}
            compact={false}
          />
        ))}
      </nav>
    </>
  )
}
