import type { Metadata, Viewport } from "next"
import { Geist_Mono, Public_Sans, Space_Grotesk } from "next/font/google"

import "./globals.css"
import { ThemeProvider } from "@/components/theme-provider"
import { SEAT_BOOT_SCRIPT } from "@/lib/game/infrastructure/local-seat-store"
import { cn } from "@/lib/utils"

const spaceGroteskHeading = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-heading",
})

const publicSans = Public_Sans({ subsets: ["latin"], variable: "--font-sans" })

const fontMono = Geist_Mono({
  subsets: ["latin"],
  variable: "--font-mono",
})

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: "Naipe Real",
  description:
    "Jogue Rouba Monte, Truco Paulista, Três Trincas, Poker, Cacheta e Blackjack online com os amigos, no PC ou no celular.",
  openGraph: {
    title: "Naipe Real",
    description:
      "Salas privadas para jogar baralho com os amigos: Rouba Monte, Truco Paulista, Três Trincas, Poker, Cacheta e Blackjack.",
    type: "website",
    locale: "pt_BR",
  },
  twitter: { card: "summary_large_image" },
}

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#0b3b2c" },
    { media: "(prefers-color-scheme: dark)", color: "#07211a" },
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      data-scroll-behavior="smooth"
      className={cn(
        "antialiased",
        fontMono.variable,
        "font-sans",
        publicSans.variable,
        spaceGroteskHeading.variable
      )}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: SEAT_BOOT_SCRIPT }} />
      </head>
      <body>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  )
}
