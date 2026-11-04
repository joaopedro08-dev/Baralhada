import Link from "next/link"

import { Button } from "@/components/ui/button"

export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-heading text-3xl font-bold">Página não encontrada</h1>
      <p className="text-felt-muted">
        Este endereço não existe. Volte para o início e crie ou entre em uma
        sala.
      </p>
      <Button asChild className="h-11 px-4 text-sm font-semibold">
        <Link href="/">Voltar ao início</Link>
      </Button>
    </main>
  )
}
