const {chromium}=require('playwright');
const assert=require('node:assert/strict');
(async()=>{
 const browser=await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
 for(const width of [360,1440]){
  const page=await browser.newPage({viewport:{width,height:900},reducedMotion:'reduce'});
  const requests=[];
  page.on('request',r=>{if(r.url().includes('/api/')||r.method()!=='GET')requests.push(r.url());});
  await page.goto((process.env.BROWSER_BASE_URL||'http://localhost:3050')+'/monte-seu-bolo');
  const form=page.locator('.builder form');
  const next=()=>form.getByRole('button',{name:'Continuar',exact:true}).click();
  const before=await page.evaluate(()=>JSON.stringify([localStorage,sessionStorage]));
  await form.getByRole('combobox',{name:'Tipo de bolo',exact:true}).selectOption({label:'Quero ajuda da Mi para escolher'});
  await next();
  await form.getByRole('button',{name:'Quero ajuda da Mi com os recheios',exact:true}).click();
  // A real flavor replaces the help selection instead of consuming a flavor slot.
  await form.getByRole('checkbox',{name:'Brigadeiro branco',exact:true}).check();
  assert.equal(await form.getByRole('button',{name:'Quero ajuda da Mi com os recheios',exact:true}).getAttribute('aria-pressed'),'false');
  await form.getByRole('button',{name:'Quero ajuda da Mi com os recheios',exact:true}).click();
  await next();
  assert.equal(await form.locator('details.builder-extras').getAttribute('open'),null);
  await form.getByRole('checkbox',{name:'Não sei o peso. Quero ajuda da Mi.',exact:true}).check();
  assert.equal(await form.getByLabel('Peso desejado em kg').isDisabled(),true);
  await next();
  await form.getByRole('button',{name:/^Retirada/}).click();
  await form.getByLabel('Data desejada',{exact:true}).fill('2027-02-20');
  await form.getByLabel('Período preferido').selectOption('A combinar com a Mi');
  await next();
  const link=form.getByRole('link',{name:'Faça seu orçamento',exact:true});
  let message=new URL(await link.getAttribute('href')).searchParams.get('text');
  assert.ok(message.includes('Peso desejado: A combinar com a Mi'));
  assert.ok(!message.includes('undefined')&&!message.includes('Total estimado:'));
  await form.getByRole('button',{name:'Editar Peso desejado',exact:true}).click();
  await form.getByRole('checkbox',{name:'Não sei o peso. Quero ajuda da Mi.',exact:true}).uncheck();
  await form.getByLabel('Peso desejado em kg').fill('2');
  await form.getByRole('button',{name:'Salvar alterações',exact:true}).click();
  message=new URL(await link.getAttribute('href')).searchParams.get('text');
  assert.ok(message.includes('Peso desejado: 2 kg'));
  assert.deepEqual(requests,[]);
  assert.equal(await page.evaluate(()=>JSON.stringify([localStorage,sessionStorage])),before);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
  await page.screenshot({path:`/tmp/mi-easier-review-${width}.png`,fullPage:true});
  await page.close();
  console.log(`Help flow, editing, privacy and width passed at ${width}px`);
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
