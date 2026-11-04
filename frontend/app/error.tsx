"use client"

import { Button } from "@/components/ui/button"

export default function ErrorPage({ retry }: { retry: () => void }) {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="font-heading text-3xl font-bold">Algo deu errado</h1>
      <p className="text-felt-muted">
        A tela não carregou. Se você estava em uma partida, seu lugar continua
        guardado por 2 minutos.
      </p>
      <Button onClick={retry} className="h-11 px-4 text-sm font-semibold">
        Tentar de novo
      </Button>
    </main>
  )
}
