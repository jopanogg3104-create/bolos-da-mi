"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="section prose">
      <h1>Vamos tentar de novo?</h1>
      <p>
        Não conseguimos carregar a página. Seus itens permanecem no carrinho
        deste navegador.
      </p>
      <button className="button" onClick={reset}>
        Tentar novamente
      </button>
    </main>
  );
}
