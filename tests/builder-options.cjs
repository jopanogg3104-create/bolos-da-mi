// Isolated browser fixture: these labels never enter the application catalogue.
const { build } = require("esbuild");
module.exports = async function checkOptions(browser, base) {
  const assert = require("node:assert/strict");
  const result = await build({
    stdin: {
      resolveDir: process.cwd(), loader: "tsx",
      contents: `import React from 'react'; import { createRoot } from 'react-dom/client'; import { CakeBuilder } from './components/cake-builder'; import { defaultSettings } from './lib/types';
      const rows = [['size','Tamanho cadastrado A'],['size','Tamanho cadastrado B'],['batter','Massa cadastrada A'],['filling','Recheio cadastrado A'],['filling','Recheio cadastrado B'],['decoration','Decoração cadastrada A']];
      const options = rows.map(([kind,label],i)=>({id:String(i),kind,label,active:true,price:null,portions:kind==='size'?12:null}));
      options.push({id:'inactive',kind:'batter',label:'Opção inativa',active:false,price:null,portions:null});
      createRoot(document.getElementById('root')).render(<CakeBuilder data={{products:[],creations:[],options,settings:{...defaultSettings,max_fillings:1},logoVideo:false,staticLogo:false}}/>);`,
    }, bundle: true, write: false, platform: "browser", jsx: "automatic", loader: { ".css": "empty" },
    define: { "process.env.NODE_ENV": '"production"' },
  });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  const calls = [];
  page.on("request", request => calls.push(request.url()));
  await page.route("**/__builder_fixture", route => route.fulfill({ contentType: "text/html", body: '<div id="root"></div><script>' + result.outputFiles[0].text.replaceAll('</script>', '<\\/script>') + '</script>' }));
  await page.goto(base + "/__builder_fixture");
  const next = () => page.getByRole("button", { name: "Continuar", exact: true }).click();
  await page.getByRole('button',{name:/^Tradicional/}).click(); await next();
  await page.getByRole('checkbox',{name:'Brigadeiro (cacau 100%)',exact:true}).check();
  await page.getByRole('button',{name:'Gourmet',exact:true}).click();
  await page.getByRole('checkbox',{name:'Ganache de limão siciliano',exact:true}).check();
  assert.equal(await page.getByRole('checkbox',{name:'Laka',exact:true}).isDisabled(),true);
  await page.getByRole('button',{name:'Tradicionais',exact:true}).click();
  await page.getByRole('checkbox',{name:'Brigadeiro (cacau 100%)',exact:true}).uncheck();
  await page.getByRole('button',{name:'Especiais',exact:true}).click();
  await page.getByRole('checkbox',{name:'Mousse de leite Ninho',exact:true}).check();
  await page.getByRole('button',{name:'Sem frutas',exact:true}).click(); await next();
  await page.getByLabel('Peso desejado em kg').fill('2'); await next();
  await page.getByRole('button',{name:/^Retirada/}).click();
  await page.getByLabel('Data desejada',{exact:true}).fill('2030-12-01');
  await page.getByLabel('Período preferido').selectOption('Tarde'); await next();
  const href=await page.getByRole('link',{name:'Faça seu orçamento'}).getAttribute('href');
  const text=new URL(href).searchParams.get('text');
  for(const value of ['Mousse de leite Ninho (sem frutas)','Ganache de limão siciliano','2 kg','Retirada'])assert.ok(text.includes(value));
  assert.ok(!text.includes('Brigadeiro (cacau 100%)'));
  await page.getByRole('button',{name:'Editar Data desejada',exact:true}).click();
  await page.getByLabel('Data desejada',{exact:true}).fill('');
  await page.getByRole('button',{name:'Salvar alterações',exact:true}).click();
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByRole('link',{name:'Faça seu orçamento'}).count(),0);
  assert.deepEqual(calls, [base + "/__builder_fixture"]);
  await page.close();
};
