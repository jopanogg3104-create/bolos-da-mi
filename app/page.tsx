import { getData } from "@/lib/data";
import { Store } from "@/components/store";
export const dynamic = "force-dynamic";
export default async function Page() {
  const business = {
    "@context": "https://schema.org", "@type": "Bakery", name: "Bolos da Mi",
    description: "Bolos e doces artesanais sob encomenda em Botucatu.",
    url: process.env.NEXT_PUBLIC_SITE_URL || "https://bolos-da-mi.vercel.app",
    telephone: "+5514991481627", areaServed: { "@type": "City", name: "Botucatu" },
    sameAs: ["https://www.instagram.com/boloss_da_mii/"],
  };
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(business).replace(/</g, "\\u003c") }} /><Store data={await getData()} /></>;
}
