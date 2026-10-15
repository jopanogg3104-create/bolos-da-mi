import type { Metadata } from "next";
import "@fontsource/manrope/latin-400.css";
import "@fontsource/manrope/latin-500.css";
import "@fontsource/manrope/latin-600.css";
import "@fontsource/lora/latin-500.css";
import "@fontsource/lora/latin-500-italic.css";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000",
  ),
  title: {
    default: "Bolos artesanais sob encomenda em Botucatu | Bolos da Mi",
    template: "%s | Bolos da Mi",
  },
  description:
    "Bolos e doces artesanais sob encomenda em Botucatu. Personalize seu bolo e consulte sabores, tamanhos e disponibilidade pelo WhatsApp.",
  openGraph: {
    title: "Bolos artesanais em Botucatu | Bolos da Mi",
    description: "Escolha sua referência, personalize seu bolo e combine a encomenda com a Mi pelo WhatsApp.",
    locale: "pt_BR",
    type: "website",
  },
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head>
        <link rel="preload" as="image" href="/media/Animate_logo_with_camera_movement_20261009010416.jpg" />
      </head>
      <body>
        <a className="skip" href="#conteudo">
          Pular para o conteúdo
        </a>
        <div id="conteudo">{children}</div>
      </body>
    </html>
  );
}
