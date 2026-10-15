# Bolos da Mi

**[Abrir o site publicado](https://bolos-da-mi.vercel.app/)**

Site da confeitaria artesanal Bolos da Mi, em Botucatu. Este repositório contém o código, as mídias locais, as configurações e os testes do projeto publicado.

## Tecnologias e recursos utilizados

- Next.js 16, React 19 e TypeScript.
- Tailwind CSS 4 e estilos próprios na identidade rosa pastel da marca.
- GSAP / ScrollTrigger para efeitos de rolagem e rodapé.
- React Bits: Star Border e adaptações de Masked Heading e Flex Carousel (licença em `components/react-bits/LICENSE.md`).
- Fontes locais Lora e Manrope; componentes acessíveis Radix UI.
- Fotografias e vídeos fornecidos pela cliente, em `public/media`, e efeito de inclinação 3D em CSS.
- WhatsApp para consulta de encomendas; configurador com estado temporário e total estimado.
- Supabase opcional para os recursos administrativos existentes; Playwright e testes TypeScript para validação.
- Hospedagem na Vercel. A publicação atual foi feita pela CLI; sincronizar o GitHub não configura publicação automática por si só.

## Organização do código

- `app/`: páginas, rotas e estilos globais.
- `components/`: interface, configurador, galeria, animações e rodapé.
- `lib/`: cardápio, cálculos, mensagens do WhatsApp e acesso a dados.
- `public/media/`: fotos, vídeos e capas.
- `tests/`: testes automatizados.
- `supabase/`: arquivos dos recursos opcionais de banco de dados.

Não inclua credenciais no repositório. `.env.example` documenta as variáveis sem valores secretos.

## Monte Seu Bolo — fluxo simples

A montagem usa somente estado React temporário, em cinco etapas: categoria, recheios, peso e adicionais, entrega ou retirada, resumo e WhatsApp. O cardápio informado pela Mi fica em `lib/cake-menu.ts`; os adicionais e a validação ficam em `lib/guided-cake.ts`. Até dois recheios podem ser combinados sem restrições inventadas. Mousse de nata permite escolher a fruta; Ninho permite com ou sem frutas. O peso é informado livremente em kg. Os valores por kg foram reajustados em R$ 20 para todas as categorias (90/105/105/130/130/145). O resumo mostra uma estimativa: peso × valor da categoria, adicionais por kg × peso, doces decorativos × quantidade e valores iniciais de adicionais fixos. Adicionais “a partir de” identificam o total como valor inicial. A taxa de entrega não é calculada nem incluída; preço final depende da Mi. O botão “Faça seu orçamento” inclui a estimativa na mensagem do WhatsApp.

A entrega é apenas uma solicitação sujeita à confirmação, pois o cardápio original informa retirada. Endereço opcional e bairro para consulta ficam apenas no estado local e não aparecem na mensagem de retirada, mesmo após alternar a modalidade. A data não tem bloqueios nem limites diários. O resumo pode ser editado antes de abrir `https://wa.me/5514991481627`, com `encodeURIComponent`. Não há login, persistência, chamadas a APIs de pedidos, mapas ou envio antes da ação do cliente. Os cadastros e recursos antigos foram preservados em suas outras áreas.

Validação: `npm test`, `npm run build`, `BROWSER_BASE_URL=http://localhost:3044 npm run test:browser` e `BROWSER_BASE_URL=http://localhost:3044 node tests/guided-cake-browser.cjs` (servidor iniciado com `npm run start -- --port 3044`).

# Bolos da Mi

Site existente aprimorado em Next.js App Router, React, TypeScript e Tailwind CSS. Publicação: https://bolos-da-mi.vercel.app.

## Funcionalidades

- Catálogo com busca, categorias, ordenação, detalhes, carrinho e solicitação de orçamento.
- Configurador em cinco etapas: categoria, recheios, peso/adicionais, entrega/retirada e resumo. **Não existe etapa de nome ou telefone.** Endereço somente para entrega.
- Agenda com datas disponíveis, horários por modalidade, antecedência, bloqueios por período, férias/feriados, capacidade diária e limites opcionais por categoria e complexidade.
- Cálculo de orçamento no banco com preços cadastrados. Regra do configurador, quando ativada: tamanho-base + massa + recheios + decoração + adicionais + entrega. Sem regra ou preço suficiente: “Preço sob consulta.”
- Registro de solicitações com sessão anônima Supabase Auth, reserva provisória configurável, idempotência e acompanhamento por código privado de 256 bits.
- Painel com dashboard, produtos, opções, regras de combinações, agenda, pedidos, dez status e pagamentos Pix conferidos manualmente.
- Trilha de auditoria de status, valores e alterações de entrega. Não existe confirmação automática de pagamento ou pedido.

Nenhum produto, preço, disponibilidade ou pedido fictício é utilizado no site. Mídias e código de portfólio preexistentes foram preservados; esta implementação não exige arquivos de mídia.

## Executar e validar

Node.js >=20.9. Use o checkout existente em `/workspace/testes`; não crie worktrees para tarefas comuns.

```sh
npm ci --cache /tmp/bolos-npm-cache
npm run dev
```

```sh
npm test
npm run typecheck
npm run build
npm start
```

Com servidor ativo, `npm run test:browser` valida navegação desktop/mobile, configurador sem dados pessoais, WhatsApp, carrinho persistente, ausência de disponibilidade simulada e códigos de acompanhamento inválidos. Usa `/usr/bin/chromium` quando disponível; em outras máquinas use `npx playwright install chromium`. Variáveis opcionais: `BROWSER_BASE_URL` e `BROWSER_EXECUTABLE`.

`npm run test:database` usa Docker para criar um PostgreSQL 17 descartável, sem publicar portas nem montar arquivos da aplicação, e remove o container ao terminar. Aplica o schema e a migração em banco isolado com fixtures exclusivamente de teste. Verifica concorrência real na última vaga, idempotência, RLS, rejeição de dados pessoais, capacidade, antecedência, cancelamento, limites de envio, preços do banco, Pix e auditoria. **Não aponta ao banco da confeitaria.**

## Ativar o sistema no Supabase

1. Crie um projeto Supabase. Em um banco novo, execute `supabase/schema.sql` e depois `supabase/migrations/001-order-system.sql` no SQL Editor, nessa ordem e uma vez cada. Se o schema anterior já estiver aplicado, execute somente a migração. Ela preserva registros e normaliza o status antigo “em conversa”. Faça backup de dados reais antes de aplicar migrações.
2. Configure `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` em `.env.local` e também na Vercel. A chave deve ser a pública anon, nunca service-role.
3. Crie a conta da confeiteira em Supabase Auth; registre seu UUID com `insert into public.admins(user_id) values ('UUID_DA_CONTA');`. Nenhuma senha padrão é criada.
4. Habilite **Anonymous Sign-Ins** no Supabase Auth para o cliente registrar pedidos sem fornecer dados pessoais. Admin e cliente usam sessões separadas.
5. Para produção, configure CAPTCHA e limites de autenticação no Supabase Auth. O checkout suporta Cloudflare Turnstile: configure o segredo no painel Supabase e `NEXT_PUBLIC_TURNSTILE_SITE_KEY` na Vercel/ambiente. A chave secreta do CAPTCHA não vai para o cliente nem para este repositório. Cadastre o domínio público no Turnstile.
6. Faça novo build após alterar variáveis públicas. Entre em `/admin`, cadastre os dados reais, configure dias, horários, capacidades e antecedência e então abra a agenda. Ative entrega em Conteúdo antes de cadastrar horários de entrega.
7. Em Orçamento e Pix, revise e ative a regra de cálculo somente quando o tamanho representar o preço-base e as demais opções representarem os acréscimos. Cadastre zero explicitamente quando uma opção não tiver acréscimo. Regras de recheios incompatíveis são verificadas no banco.

O banco inicia com agenda fechada, sem horários, produtos nem preços. Sem conexão ou migração, o site continua oferecendo conversa pelo WhatsApp, informa a indisponibilidade do serviço online e não simula vagas ou pedidos registrados.

## Segurança e operação

- RLS permite que administradores gerenciem o sistema e que sessões de clientes leiam apenas os próprios pedidos. A API valida a sessão com Supabase Auth antes de registrar solicitações.
- Código privado do pedido é gerado com `crypto.getRandomValues`; somente o hash é armazenado. O código é transmitido no corpo de um POST, não em parâmetros de URL, e pode ser recuperado pelo navegador que registrou o pedido. Compartilhar o código dá acesso ao pedido.
- JSON, tamanho do corpo, escolhas e campos permitidos são validados no servidor e no banco. Nome, telefone, e-mail e CPF não são aceitos na solicitação. Honeypot, rate limit por sessão no banco e CAPTCHA/Auth limitam spam. CAPTCHA e limites de Auth precisam ser configurados para proteção efetiva contra criação massiva de sessões.
- O banco recalcula os preços de produtos e opções ativos; não confia em preços, totais ou capacidade enviados pelo navegador.
- Locks transacionais por data e triggers impedem ultrapassar capacidades, inclusive em atualizações administrativas. Pedidos cancelados não ocupam capacidade. Pendentes reservam vaga até o prazo configurado; confirmados continuam ocupando capacidade. Reativar pedido cuja reserva expirou exige nova validação de capacidade.
- Exceções de agenda alteram apenas futuras solicitações; pedidos existentes precisam ser revisados. Observações internas de agenda não são devolvidas ao público.
- Pix aparece apenas no acesso privado de pedido “Aguardando pagamento” com valor final aprovado. A confeiteira registra sinal, recebimento e pagamento manualmente. O banco recusa valores incompatíveis, e alterações geram auditoria. Não há integração bancária automática.
- “Meus Pedidos” inclui solicitações registradas no site. Conversas enviadas diretamente pelo WhatsApp não são importadas automaticamente; isso exigiria uma integração WhatsApp Business própria.
- O painel lista até 500 solicitações recentes. Dashboard utiliza registros reais. Rever a política de retenção e privacidade conforme a operação efetiva da confeitaria.

## Publicação

`vercel.json` fixa o framework Next.js. Configure `NEXT_PUBLIC_SITE_URL=https://bolos-da-mi.vercel.app`. Importe o repositório na Vercel ou publique com CLI autenticada. Publicações via CLI deste ambiente não enviam alterações automaticamente ao GitHub; commits/push e deploy contínuo são ações separadas.

Antes de considerar o sistema de pedidos operacional em produção, valide com o Supabase real: login administrativo, sessão anônima/CAPTCHA, RLS, registro, último horário simultâneo, acompanhamento privado, confirmação administrativa e pagamento manual. Testes locais isolados não provam configuração do banco remoto.

## Direção da página inicial

A skill enviada `landing-page-guide-v2` foi aplicada ao projeto existente com direção minimalista: Lora/Manrope locais, creme/rosa/ameixa, mídia original, CTA principal única, benefícios verificáveis, FAQ acessível com componentes no padrão ShadCN/Radix e dados estruturados Bakery para Botucatu. Avaliações, estatísticas, escassez e depoimentos não foram adicionados sem fontes reais. A navegação objetiva e a privacidade da montagem continuam prioritárias.

### Animações inspiradas no React Bits

- Star Border utiliza o código oficial (`DavidHDev/react-bits`, versão TypeScript), com licença em `components/react-bits/LICENSE.md`. Configuração: uma borda de 1px, ciclo de 8s, sem partículas, pulsos ou brilho externo; redução de movimento reage às mudanças do sistema.
- Masked Heading adapta a revelação por máscara para texto DOM: conserva as fontes, cores, elementos `em`, acessibilidade, renderização no servidor e leitura sem JavaScript. Não usa mídia dentro das letras nem recalcula a tipografia.
- Flex Carousel adapta a vitrine para painéis expansíveis DOM, com os posters existentes e os vídeos originais na seleção ativa. Dispensa shaders WebGL para evitar distorção e preservar o conteúdo. Não há rotação automática. Mouse, toque e setas/Home/End selecionam a criação; a referência escolhida acompanha o link para o configurador.

Fontes consultadas: https://reactbits.dev/animations/star-border, https://reactbits.dev/text-animations/masked-heading, https://reactbits.dev/components/flex-carousel e os arquivos TypeScript/CSS correspondentes do repositório oficial. Nenhuma fotografia foi criada ou alterada para essa integração.

A antiga tela de carregamento foi preservada em `components/store-loading.tsx`, fora da convenção automática `app/loading.tsx`. Isso evita que a página pública dependa do JavaScript de streaming para substituir o fallback, garantindo conteúdo e títulos visíveis também com JavaScript desativado.

### Rodapé com movimento

`components/ui/motion-footer.tsx` adapta o CinematicFooter enviado pelo usuário para o Bolos da Mi. Usa GSAP/ScrollTrigger, texto de marca em fundo, faixa inclinada e botões magnéticos de movimento limitado. Mantém Lora/Manrope locais, rosa pastel, contatos oficiais e links secundários recolhidos. Em telas de computador com altura suficiente, a cortina revela o rodapé fixo ao final da rolagem. Em celulares, sem JavaScript, com movimento reduzido ou com links secundários expandidos, o rodapé fica no fluxo da página para preservar a leitura e a navegação. Não inclui links fictícios de aplicativos, fontes externas, imagens de banco ou emojis. As animações respondem à preferência de movimento reduzido; os listeners e timelines são limpos ao desmontar.
