const { chromium } = require("playwright");
const assert = require("node:assert/strict");
const { existsSync } = require("node:fs");
const base = process.env.BROWSER_BASE_URL || "http://localhost:3000";
const executablePath =
  process.env.BROWSER_EXECUTABLE ||
  (existsSync("/usr/bin/chromium") ? "/usr/bin/chromium" : undefined);
(async () => {
  const browser = await chromium.launch({
    executablePath,
    headless: true,
    args: ["--no-sandbox"],
  });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  const errors = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto(base);
  await page
    .getByRole("heading", { name: "Bolos artesanais. Feitos com amor." })
    .waitFor();
  await page.screenshot({ path: "/tmp/mi-desktop.png", fullPage: true });
  const faqQuestion = page.getByRole("button", { name: "A data escolhida fica reservada?", exact: true });
  await page.waitForLoadState("networkidle");
  await faqQuestion.focus();
  await page.keyboard.press("Enter");
  await page.waitForFunction(() => document.querySelector(".faq-trigger[aria-expanded=\"true\"]"));
  assert.equal(await faqQuestion.getAttribute("aria-expanded"), "true");
  await page.getByText(/Não. A data escolhida está sujeita à confirmação/).waitFor();
  await page.keyboard.press("Enter");
  assert.equal(await faqQuestion.getAttribute("aria-expanded"), "false");
  const business = JSON.parse(await page.locator('script[type="application/ld+json"]').textContent());
  assert.equal(business.telephone, "+5514991481627");
  assert.equal(business.areaServed.name, "Botucatu");
  assert.equal(business.aggregateRating, undefined);
  for (const route of [
    "/bolos",
    "/referencias",
    "/sobre",
    "/contato",
    "/privacidade",
    "/admin",
    "/agenda",
    "/meus-pedidos",
    "/catalogo",
  ]) {
    const response = await page.goto(base + route);
    assert.equal(response.status(), 200);
    await page.locator("h1").waitFor();
  }
  const builderRequests = [];
  const watchBuilder = (request) => {
    if (request.url().includes("/api/") || !["GET", "HEAD"].includes(request.method())) builderRequests.push(request.url());
  };
  page.on("request", watchBuilder);
  await page.goto(base + "/monte-seu-bolo?referencia=Criação%20original");
  const storageBefore = await page.evaluate(() => JSON.stringify({ local: {...localStorage}, session: {...sessionStorage} }));
  const form = page.locator('.builder form');
  const next = () => form.getByRole('button', {name:'Continuar',exact:true}).click();
  await next();
  await page.locator('.error[role=alert]').waitFor();
  await form.getByRole('button',{name:/^Tradicional/}).click();
  await next();
  await form.getByRole('checkbox',{name:'Brigadeiro branco',exact:true}).check();
  await next();
  await form.getByLabel('Peso desejado em kg').fill('2');
  const observations = form.getByLabel('Observações sobre tema, cores ou estilo (opcional)');
  assert.match(await observations.inputValue(), /Criação original/);
  await observations.fill((await observations.inputValue())+'; Rosa e branco; Parabéns, vó! & família');
  await next();
  await form.getByRole('button',{name:/^Retirada/}).click();
  const dateInput = form.getByLabel('Data desejada',{exact:true});
  assert.equal(await dateInput.getAttribute('min'),null);
  assert.equal(await dateInput.getAttribute('max'),null);
  await dateInput.fill('2030-12-01');
  await form.getByLabel('Período preferido').selectOption('Tarde');
  await next();
  const order=form.getByRole('link',{name:'Faça seu orçamento',exact:true});
  const href=await order.getAttribute('href');
  const message=new URL(href).searchParams.get('text');
  assert.equal(new URL(href).pathname,'/5514991481627');
  for(const text of ['Criação original','Parabéns, vó! & família','Rosa e branco','Brigadeiro branco','01/12/2030'])assert.ok(message.includes(text));
  await form.getByRole('button',{name:'Editar Observações',exact:true}).click();
  await observations.fill('Rosa claro');
  await form.getByRole('button',{name:'Salvar alterações',exact:true}).click();
  assert.match(new URL(await order.getAttribute('href')).searchParams.get('text'),/Rosa claro/);
  assert.equal(await page.evaluate(()=>JSON.stringify({local:{...localStorage},session:{...sessionStorage}})),storageBefore);
  assert.deepEqual(builderRequests,[],'Montagem não consulta APIs nem envia escolhas');
  page.off('request',watchBuilder);
  await page.reload();
  assert.equal(await form.getByRole('button',{name:/^Tradicional/}).getAttribute('aria-pressed'),'false');
  await page.evaluate(() =>
    localStorage.setItem(
      "mi-cart",
      JSON.stringify([
        {
          id: "test",
          name: "Item de verificação",
          price: 10,
          quantity: 2,
          detail: "",
        },
        {
          id: "consult",
          name: "Sob consulta",
          price: null,
          quantity: 1,
          detail: "",
        },
      ]),
    ),
  );
  await page.goto(base + "/carrinho");
  await page.getByText("Item de verificação", { exact: true }).waitFor();
  await page.getByLabel("Quantidade").first().fill("3");
  await page.reload();
  assert.equal(await page.getByLabel("Quantidade").first().inputValue(), "3");
  const cartHref = await page
    .getByRole("link", { name: "Faça seu orçamento", exact: false })
    .getAttribute("href");
  assert.match(
    new URL(cartHref).searchParams.get("text"),
    /3 × Item de verificação/,
  );
  await page
    .getByRole("button", { name: "Remover", exact: true })
    .first()
    .click();
  assert.equal(
    await page.getByText("Item de verificação", { exact: true }).count(),
    0,
  );
  await page.setViewportSize({ width: 390, height: 844 });
  for (const route of [
    "/",
    "/bolos",
    "/referencias",
    "/monte-seu-bolo",
    "/carrinho",
    "/agenda",
    "/meus-pedidos",
  ]) {
    await page.goto(base + route);
    await page.locator("h1").waitFor();
    assert.equal(
      await page.evaluate(
        () => document.documentElement.scrollWidth > innerWidth,
      ),
      false,
      "Overflow on " + route,
    );
    if (route === "/") {
      await page.screenshot({ path: "/tmp/mi-mobile.png", fullPage: true });
      await page.getByRole("button", { name: "Menu" }).click();
      await page
        .getByRole("navigation")
        .getByRole("link", { name: "Bolos", exact: true })
        .click();
      await page.waitForURL("**/#criacao");
    }
  }
  await page.goto(base + "/monte-seu-bolo");
  await page.locator('.builder form').getByRole('button',{name:/^Tradicional/}).click();
  await next();
  await form.getByRole('checkbox',{name:'Doce de leite com coco',exact:true}).check();
  await next();
  await form.getByLabel('Peso desejado em kg').fill('2');
  await next();
  await form.getByRole('button',{name:/^Retirada/}).click();
  await form.getByLabel('Data desejada',{exact:true}).fill('2030-12-01');
  await form.getByLabel('Período preferido').selectOption('Tarde');
  await next();
  await form.getByRole('link',{name:'Faça seu orçamento',exact:true}).waitFor();
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  const unavailable = await page.request.get(
    base + "/api/availability?month=" + new Date().toISOString().slice(0, 7),
  );
  assert.equal(unavailable.status(), 503);
  assert.match((await unavailable.json()).error, /não está configurado/);
  const invalid = await page.request.post(base + "/api/orders", {
    data: { input: { kind: "cake", method: "Retirada" } },
  });
  assert.equal(invalid.status(), 400);
  const foreign = await page.request.post(base + "/api/orders/lookup", {
    headers: { Origin: "https://outro-site.example" },
    data: { token: "codigo-invalido" },
  });
  assert.equal(foreign.status(), 403);
  await page.goto(base + "/meus-pedidos");
  await page.getByLabel("Código privado de acesso").fill("codigo-invalido");
  await page.getByRole("button", { name: "Consultar pedido" }).click();
  await page
    .getByText("Não encontramos um pedido com esse código de acesso.")
    .waitFor();
  // Contract fixture only in this browser context: no application data is seeded.
  const availableDate = new Date(Date.now() + 86400000)
    .toISOString()
    .slice(0, 10);
  await page.route("**/api/availability?*", (route) =>
    route.fulfill({
      json: {
        enabled: true,
        notice_hours: 24,
        days: [
          {
            date: availableDate,
            available: true,
            remaining: 1,
            pending: 0,
            confirmed: 0,
            slots: [{ time: "09:00", method: "Retirada", capacity: 1 }],
          },
        ],
      },
    }),
  );
  await page.goto(base + "/agenda");
  await page.locator(".calendar-day:not([disabled])").click();
  await page.getByRole("button", { name: /09:00/ }).click();
  const builderLink = await page
    .getByRole("link", { name: "Personalizar e escolher um horário" })
    .getAttribute("href");
  assert.match(builderLink, /hora=09:00/);
  await page
    .getByRole("link", { name: "Personalizar e escolher um horário" })
    .click();
  assert.equal(await page.getByLabel("Seu nome", { exact: true }).count(), 0);
  await page.unroute("**/api/availability?*");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(base);
  assert.equal(
    await page.evaluate(
      () => getComputedStyle(document.documentElement).scrollBehavior,
    ),
    "auto",
  );
  assert.deepEqual(errors, []);
  await require("./builder-options.cjs")(browser, base);
  await browser.close();
  console.log(
    "PASS: desktop/mobile, rotas, validação do configurador, referência no WhatsApp, carrinho persistente, remoção e movimento reduzido.",
  );
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
