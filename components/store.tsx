"use client";
import { TiltMedia } from "./tilt-media";
// Landing Page Guide V2: minimalismo acolhedor para encomendas artesanais em Botucatu.
// Lora + Manrope, creme/argila/sálvia, composição editorial e vídeos originais.
// Uma CTA principal, benefícios reais e dúvidas inline; sem números ou avaliações inventados.
// Entradas na rolagem e interações expressivas, com redução de movimento respeitada.
import Link from "next/link";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { type Data, type CartItem, type Product } from "@/lib/types";
import { cartTotals, money, whatsapp } from "@/lib/order";
import { OriginalVideo, LogoPlaybackControl } from "./video";
import { Button } from "./ui/button";
import { LandingFAQ } from "./landing-faq";
import { ScrollEffects } from "./scroll-effects";
import StarBorder from "./react-bits/star-border";
import { MaskedHeading } from "./react-bits/masked-heading";
import { FlexCarousel } from "./react-bits/flex-carousel";
import { CinematicFooter } from "./ui/motion-footer";
import { brandStory } from "@/lib/brand-story";
import { CakeBuilder } from "./cake-builder";
import { AgendaPanel } from "./agenda-panel";
import { MyOrders } from "./my-orders";
import { CartCheckout } from "./cart-checkout";
const instagram = "https://www.instagram.com/boloss_da_mii/";
export function Store({ data, view = "home" }: { data: Data; view?: string }) {
  const [menu, setMenu] = useState(false),
    [cart, setCart] = useState<CartItem[]>([]),
    [loaded, setLoaded] = useState(false),
    [search, setSearch] = useState(""),
    [category, setCategory] = useState("Todas"),
    [sort, setSort] = useState("name"),
    [detail, setDetail] = useState<Product | null>(null),
    [notice, setNotice] = useState(""),
    [notes, setNotes] = useState("");
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    try {
      const c = JSON.parse(localStorage.getItem("mi-cart") ?? "[]");
      if (Array.isArray(c))
        setCart(
          c
            .filter(
              (i) =>
                typeof i.id === "string" &&
                typeof i.name === "string" &&
                Number.isInteger(i.quantity) &&
                i.quantity > 0 &&
                (i.price === null || typeof i.price === "number"),
            )
            .map((i) => ({
              ...i,
              quantity: Math.min(99, i.quantity),
              detail: typeof i.detail === "string" ? i.detail : "",
            })),
        );
    } catch {}
    setLoaded(true);
  }, []);
  useEffect(() => {
    if (loaded)
      try {
        localStorage.setItem("mi-cart", JSON.stringify(cart));
      } catch {
        setNotice("Não foi possível salvar o carrinho neste navegador.");
      }
  }, [cart, loaded]);
  useEffect(() => {
    if (detail) dialog.current?.showModal();
  }, [detail]);
  function add(p: Product) {
    setCart((c) =>
      c.some((i) => i.id === p.id)
        ? c.map((i) =>
            i.id === p.id
              ? { ...i, quantity: Math.min(99, i.quantity + 1) }
              : i,
          )
        : [
            ...c,
            { id: p.id, name: p.name, quantity: 1, price: p.price, detail: "" },
          ],
    );
    setNotice(`${p.name} adicionado ao carrinho.`);
  }
  const total = cartTotals(cart);
  const visible = data.products
    .filter(
      (p) =>
        p.name
          .toLocaleLowerCase("pt-BR")
          .includes(search.toLocaleLowerCase("pt-BR")) &&
        (category === "Todas" || p.category === category),
    )
    .sort((a, b) =>
      sort === "price"
        ? (a.price ?? Infinity) - (b.price ?? Infinity)
        : sort === "price-desc"
          ? (b.price ?? -Infinity) - (a.price ?? -Infinity)
          : a.name.localeCompare(b.name, "pt-BR"),
    );
  const nav = [
    ["Bolos", view === "home" ? "#criacao" : "/referencias"],
    ["Monte Seu Bolo", "/monte-seu-bolo"],
    ["Contato", "/contato"],
  ];
  const button = (text: string, href: string, secondary = false) => (
    secondary ? <Button asChild variant="secondary"><Link href={href}>{text}</Link></Button> : <StarBorder as={Link} href={href} className="button" color="#c993aa" trailColor="#f7e3eb" duration={8} radius={28} thickness={1} glow={0} hover="none" clickPulse={false} backgroundColor="var(--strong)" textColor="white">{text}</StarBorder>
  );
  const portfolio = () => (
    <section id="criacao" className="section portfolio">
      <div className="section-head">
        <div>
          <span className="eyebrow">O NOSSO PORTFÓLIO</span>
          {view === "referencias" ? (
            <h1><MaskedHeading>Do nosso ateliê</MaskedHeading></h1>
          ) : (
            <h2><MaskedHeading>Do nosso ateliê</MaskedHeading></h2>
          )}
        </div>
        <p>
          Cada bolo conta uma história. Conheça algumas das nossas criações,
          feitas com carinho, dedicação e muito sabor.
        </p>
      </div>
      {data.creations.length ? (
        <FlexCarousel items={data.creations} />
      ) : (
        <div className="portfolio-empty">
          <span className="eyebrow">DIRETO DO NOSSO ATELIÊ</span>
          <h3>
            Uma inspiração para
            <br />
            cada celebração.
          </h3>
          <p>
            Conheça as criações reais da Mi no Instagram e compartilhe a sua
            favorita ao pedir um orçamento.
          </p>
          <a
            className="text-link"
            href={instagram}
            target="_blank"
            rel="noreferrer"
          >
            Ver criações no Instagram
          </a>
        </div>
      )}
    </section>
  );
  const catalog = () => (
    <section className="section">
      <div className="section-head">
        <div>
          <span className="eyebrow">DO NOSSO ATELIÊ PARA SUA MESA</span>
          {["bolos", "catalogo"].includes(view) ? (
            <h1>Nossos bolos</h1>
          ) : (
            <h2>Nossos bolos</h2>
          )}
        </div>
        <p>
          Escolha uma criação ou conte para a Mi o que você imaginou. Cada
          pedido é combinado com cuidado.
        </p>
      </div>
      <div className="filters">
        <label>
          Buscar bolo
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Nome do bolo"
          />
        </label>
        <label>
          Categoria
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {["Todas", ...new Set(data.products.map((p) => p.category))].map(
              (c) => (
                <option key={c}>{c}</option>
              ),
            )}
          </select>
        </label>
        <label>
          Ordenar
          <select value={sort} onChange={(e) => setSort(e.target.value)}>
            <option value="name">Nome</option>
            <option value="price">Menor preço</option>
          </select>
        </label>
      </div>
      {visible.length ? (
        <div className="products">
          {visible.map((p) => (
            <article key={p.id}>
              <button
                className="product-image"
                onClick={() => setDetail(p)}
                aria-label={`Ver detalhes de ${p.name}`}
              >
                {p.image_url ? (
                  <img src={p.image_url} alt={p.name} loading="lazy" />
                ) : (
                  <span>Feito pela Mi</span>
                )}
              </button>
              <span className="eyebrow">{p.category}</span>
              <h3>
                <button className="plain" onClick={() => setDetail(p)}>
                  {p.name}
                </button>
              </h3>
              <p>{p.description}</p>
              <strong>
                {p.price === null ? "Valor sob consulta" : money(p.price)}
              </strong>
              <button className="text-link" onClick={() => add(p)}>
                Adicionar ao carrinho +
              </button>
              <a
                className="text-link"
                href={whatsapp(
                  `Olá, Mi! Gostaria de solicitar um orçamento para ${p.name}. Disponibilidade e valor sujeitos à confirmação.`,
                )}
                target="_blank"
                rel="noreferrer"
              >
                Solicitar orçamento
              </a>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty">
          <h3>
            {data.products.length
              ? "Nenhum bolo encontrado."
              : "O seu bolo começa com uma ideia."}
          </h3>
          <p>
            {data.products.length
              ? "Experimente outro nome ou categoria."
              : "Enquanto o catálogo é preparado, conte a ocasião e o que você deseja. A Mi ajuda você a escolher os detalhes."}
          </p>
          {button("Monte seu bolo", "/monte-seu-bolo")}
        </div>
      )}
    </section>
  );
  const configurator = () => <CakeBuilder data={data} />;
  return (
    <>
      {view === "home" && <ScrollEffects />}
      <header className={view === "home" && data.logoVideo ? "immersive-header" : undefined}>
        <Link className="brand" href="/" aria-label="Bolos da Mi — início">
          {data.logoVideo ? (
            <OriginalVideo
              src="/media/logo-faststart.mp4"
              poster="/media/Animate_logo_with_camera_movement_20261009010416.jpg"
              priority
              loop
              label="Logo original Bolos da Mi"
              controls={false}
            />
          ) : data.staticLogo ? (
            <img src="/media/logo.png" alt="Bolos da Mi" />
          ) : (
            <>
              <span className="brand-script">
                Bolos da Mi
              </span>
              <span className="brand-caption">CONFEITARIA ARTESANAL</span>
            </>
          )}
        </Link>
        <button
          className="menu-button"
          onClick={() => setMenu(!menu)}
          aria-expanded={menu}
          aria-controls="navigation"
        >
          {menu ? "Fechar" : "Menu"}
        </button>
        <nav
          id="navigation"
          className={menu ? "open" : ""}
          aria-label="Principal"
        >
          {nav.map(([n, h]) => (
            <Link
              key={h}
              href={h}
              aria-current={
                view ===
                {
                  "/": "home",
                  "/bolos": "bolos",
                  "/monte-seu-bolo": "monte-seu-bolo",
                  "/referencias": "referencias",
                  "/sobre": "sobre",
                  "/contato": "contato",
                }[h]
                  ? "page"
                  : undefined
              }
              onClick={() => setMenu(false)}
            >
              {n}
            </Link>
          ))}
        </nav>
        {(cart.length > 0 || view === "carrinho") && <Link className="cart-link" href="/carrinho">
          Carrinho <span>{cart.reduce((n, i) => n + i.quantity, 0)}</span>
        </Link>}
      </header>
      <main>
        {view === "home" && (
          <>
            <section className={`hero ${data.logoVideo ? "hero-with-background" : ""}`}>
              {data.logoVideo && <div className="hero-video-background" aria-hidden="true"><OriginalVideo src="/media/logo-faststart.mp4" poster="/media/Animate_logo_with_camera_movement_20261009010416.jpg" priority loop label="Animação original da logo Bolos da Mi" controls={false} /></div>}
              <div className="hero-copy">
                <span className="eyebrow">
                  BOLOS DA MI · BOTUCATU
                </span>
                <h1><MaskedHeading>Bolos artesanais.<br /><em>Feitos com amor.</em></MaskedHeading></h1>
                <p>{data.settings.intro}</p>
                <div className="hero-actions">
                  {button("Monte seu bolo", "/monte-seu-bolo")}
                </div>
                <div className="hero-note">
Sob encomenda, com cada detalhe combinado com a Mi.
                </div>
                {data.logoVideo && <LogoPlaybackControl />}
              </div>
              {!data.logoVideo && <div className="hero-art">
                  <div className="typographic-art">
                    <span className="art-top">CADA DETALHE, UM CARINHO</span>

                    <span className="art-brand">
                      Bolos
                      <br />
                      <em>da Mi</em>
                    </span>
                    <span className="art-bottom">
                      PARA CELEBRAR O QUE IMPORTA
                    </span>
                  </div>
                <span className="art-caption">FEITO À MÃO. PENSADO PARA VOCÊ.</span>
              </div>}
            </section>
            <section className="ribbon" aria-label="O cuidado do ateliê">
              <span>Produção artesanal</span>
              <span>Sabores e detalhes a combinar</span>
              <span>Atendimento direto com a Mi</span>
            </section>
            {data.settings.sections.intro !== false && (
              <section className="intro section intro-with-video">
                <div className="intro-heading"><span className="eyebrow">PRAZER, BOLOS DA MI</span>
                <h2>
                  Pequenos detalhes.
                  <br />
                  <em>Grandes lembranças.</em>
                </h2></div>
                <figure className="intro-video"><TiltMedia><Image src="/media/bolo-flores-atelie.jpg" alt="Bolo artesanal da Mi com flores brancas, folhas verdes e detalhes dourados" width={2752} height={1536} sizes="(max-width: 800px) 88vw, 48vw" quality={85} className="intro-cake-photo" /></TiltMedia></figure>
                <div className="intro-copy">
                  {data.settings.about.split(/\n\s*\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}

                </div>
              </section>
            )}
            <section className="section home-story" aria-labelledby="home-story-title">
              <div className="story-introduction"><span className="eyebrow">BOLOS DA MI · DESDE 2019</span><h2 id="home-story-title">Uma história que começou<br /><em>com um simples distrair…</em></h2></div>
              <div className="home-story-layout"><figure className="story-portrait"><img src="/media/mi-no-atelie.jpeg" alt="Mi no ateliê Bolos da Mi, decorando um bolo com cobertura rosa e morangos" width={1300} height={1576} loading="lazy" decoding="async" /></figure><div className="story-reading">{brandStory.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div></div>
            </section>
            {data.products.length > 0 && data.settings.sections.catalog !== false && catalog()}
            {data.settings.sections.portfolio !== false && portfolio()}
            <section className="section how">
              <span className="eyebrow">SIMPLES, COMO UMA BOA CONVERSA</span>
              <h2>Da ideia à celebração.</h2>
              <div className="how-grid">
                {[
                  [
                    "01",
                    "Imagine",
                    "Escolha uma referência ou personalize seu bolo.",
                  ],
                  [
                    "02",
                    "Converse",
                    "Envie suas escolhas para a Mi pelo WhatsApp.",
                  ],
                  [
                    "03",
                    "Combine",
                    "Confirme os detalhes, o valor e a disponibilidade com a confeiteira.",
                  ],
                ].map(([n, t, d]) => (
                  <article key={n}>
                    <span>{n}</span>
                    <h3>{t}</h3>
                    <p>{d}</p>
                  </article>
                ))}
              </div>
            </section>
            <LandingFAQ />
          </>
        )}
        {(view === "bolos" || view === "catalogo") && catalog()}
        {view === "agenda" && <AgendaPanel delivery={data.settings.delivery} />}
        {view === "meus-pedidos" && <MyOrders />}
        {view === "referencias" && portfolio()}
        {view === "monte-seu-bolo" && configurator()}
        {view === "sobre" && (
          <section className="section prose brand-story">
            <span className="eyebrow">BOLOS DA MI · NOSSA HISTÓRIA</span>
            <h1>
              Uma história que começou
              <br />
              <em>com um simples distrair…</em>
            </h1>
            <div className="story-reading">{brandStory.map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
            {button("Vamos imaginar seu bolo?", "/monte-seu-bolo")}
          </section>
        )}
        {view === "contato" && (
          <section className="section prose">
            <span className="eyebrow">VAMOS CONVERSAR</span>
            <h1>
              Conte a sua ideia.
              <br />
              <em>A Mi cuida dos detalhes.</em>
            </h1>
            <p>
              Para consultar sabores, valores e disponibilidade, fale
              diretamente com a confeiteira. O atendimento do ateliê em Botucatu é personalizado, com cardápio e tamanhos sob consulta.
            </p>
            <a
              className="button"
              href={whatsapp(
                "Olá, Mi! Gostaria de conversar sobre um bolo e solicitar um orçamento.",
              )}
              target="_blank"
              rel="noreferrer"
            >
              Conversar no WhatsApp
            </a>
            <p>+55 14 99148-1627</p>
            <a
              className="text-link"
              href={instagram}
              target="_blank"
              rel="noreferrer"
            >
              @boloss_da_mii
            </a>
          </section>
        )}
        {view === "carrinho" && (
          <section className="section">
            <span className="eyebrow">SUA PRÓXIMA CELEBRAÇÃO</span>
            <h1>Seu carrinho</h1>
            {!cart.length ? (
              <div className="empty">
                <h3>Ainda há espaço para algo especial.</h3>
                <p>Conheça o catálogo ou monte um bolo personalizado.</p>
                {button("Conhecer nossos bolos", "/bolos")}
                {button("Monte seu bolo", "/monte-seu-bolo", true)}
              </div>
            ) : (
              <div className="cart-layout">
                <div>
                  {cart.map((i) => (
                    <article className="cart-item" key={i.id}>
                      <div>
                        <h3>{i.name}</h3>
                        <p>
                          {i.price === null
                            ? "Valor sob consulta"
                            : money(i.price)}
                        </p>
                      </div>
                      <label>
                        Quantidade
                        <input
                          type="number"
                          min="1"
                          max="99"
                          value={i.quantity}
                          onChange={(e) =>
                            setCart((c) =>
                              c.map((item) =>
                                item.id === i.id
                                  ? {
                                      ...item,
                                      quantity: Math.min(
                                        99,
                                        Math.max(
                                          1,
                                          Number(e.target.value) || 1,
                                        ),
                                      ),
                                    }
                                  : item,
                              ),
                            )
                          }
                        />
                      </label>
                      <button
                        className="text-link"
                        onClick={() =>
                          setCart((c) => c.filter((item) => item.id !== i.id))
                        }
                      >
                        Remover
                      </button>
                    </article>
                  ))}
                </div>
                <aside className="cart-summary">
                  <h2>Resumo</h2>
                  <p>
                    {total.hasUnknown
                      ? "Subtotal dos itens com preço"
                      : "Subtotal"}
                    : <strong>{money(total.known)}</strong>
                  </p>
                  {total.hasUnknown && <p>Há itens com valor a consultar.</p>}
                  <label>
                    Observações
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      maxLength={1500}
                    />
                  </label>
                  <CartCheckout items={cart} notes={notes} data={data} />
                  <p className="hint">
                    O envio não confirma automaticamente o pedido.
                  </p>
                </aside>
              </div>
            )}
          </section>
        )}
      </main>
      <CinematicFooter compact={view === "monte-seu-bolo" || view === "contato"} hasCatalog={data.products.length > 0} />
      <div className="live-notice" role="status">
        {notice && (
          <>
            {notice} <Link href="/carrinho">Ver carrinho</Link>
            <button onClick={() => setNotice("")} aria-label="Fechar aviso">
              ×
            </button>
          </>
        )}
      </div>
      <dialog ref={dialog} onClose={() => setDetail(null)}>
        <button
          className="dialog-close"
          onClick={() => dialog.current?.close()}
          aria-label="Fechar detalhes"
        >
          ×
        </button>
        {detail && (
          <>
            {detail.image_url && (
              <img src={detail.image_url} alt={detail.name} />
            )}
            <span className="eyebrow">{detail.category}</span>
            <h2>{detail.name}</h2>
            <p>{detail.description}</p>
            <p>Tamanhos: {detail.sizes.join(", ") || "Consultar a Mi"}</p>
            <p>Sabores: {detail.flavors.join(", ") || "Consultar a Mi"}</p>
            <p>
              {detail.price === null
                ? "Valor sob consulta"
                : money(detail.price)}
            </p>
            <button
              className="button"
              onClick={() => {
                add(detail);
                dialog.current?.close();
              }}
            >
              Adicionar ao carrinho +
            </button>
          </>
        )}
      </dialog>
    </>
  );
}
