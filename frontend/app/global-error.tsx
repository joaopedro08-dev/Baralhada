"use client"

export default function GlobalError({ retry }: { retry: () => void }) {
  return (
    <html lang="pt-BR">
      <body>
        <main>
          <h1>Algo deu errado</h1>
          <p>O jogo não carregou. Tente de novo em alguns instantes.</p>
          <button type="button" onClick={retry}>
            Tentar de novo
          </button>
        </main>
      </body>
    </html>
  )
}
