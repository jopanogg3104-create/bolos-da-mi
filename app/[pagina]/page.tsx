import { notFound } from "next/navigation";
import { getData } from "@/lib/data";
import { Store } from "@/components/store";
const names: Record<string, string> = {
  bolos: "Nossos bolos",
  catalogo: "Catálogo",
  agenda: "Agenda de disponibilidade",
  "meus-pedidos": "Meus pedidos",
  "monte-seu-bolo": "Monte seu bolo",
  referencias: "Nossas Criações",
  sobre: "Sobre nós",
  contato: "Contato",
  carrinho: "Carrinho",
};
export const dynamic = "force-dynamic";
export async function generateMetadata({
  params,
}: {
  params: Promise<{ pagina: string }>;
}) {
  const { pagina } = await params;
  return {
    title: names[pagina] ?? "Página não encontrada",
    ...(["carrinho", "meus-pedidos"].includes(pagina)
      ? { robots: { index: false, follow: false } }
      : {}),
  };
}
export default async function Page({
  params,
}: {
  params: Promise<{ pagina: string }>;
}) {
  const { pagina } = await params;
  if (!names[pagina]) notFound();
  return <Store data={await getData()} view={pagina} />;
}
