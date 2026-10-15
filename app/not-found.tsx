import Link from "next/link";
export default function NotFound() {
  return (
    <main className="section prose">
      <h1>Essa página não está por aqui.</h1>
      <Link className="button" href="/">
        Voltar ao início
      </Link>
    </main>
  );
}
