const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const base = process.env.BROWSER_BASE_URL || 'http://localhost:3038';
(async () => {
  const browser = await chromium.launch({executablePath:'/usr/bin/chromium',args:['--no-sandbox']});
  try {
    for (const width of [390,768,1440]) {
      const page = await browser.newPage({viewport:{width,height:1000},isMobile:width===390,hasTouch:width===390});
      const errors=[];page.on('pageerror',e=>errors.push(e.message));
      await page.goto(base);
      await page.getByRole('heading',{name:'Bolos artesanais. Feitos com amor.'}).waitFor();
      await page.locator('.flex-showcase').scrollIntoViewIfNeeded();
      const tabs = page.getByRole('tab');
      assert.equal(await tabs.count(),4);
      await tabs.nth(0).focus();await page.keyboard.press('ArrowRight');
      assert.equal(await tabs.nth(1).getAttribute('aria-selected'),'true');
      const href1 = await page.locator('.flex-reference').getAttribute('href');
      await page.keyboard.press('End');
      assert.equal(await tabs.nth(3).getAttribute('aria-selected'),'true');
      assert.notEqual(await page.locator('.flex-reference').getAttribute('href'),href1);
      if (width===390) await tabs.nth(2).tap();else await tabs.nth(2).click();
      assert.equal(await tabs.nth(2).getAttribute('aria-selected'),'true');
      await page.waitForTimeout(750);
      const panels = await page.locator('.flex-panel').evaluateAll(elements=>elements.map(e=>e.getBoundingClientRect().width));
      assert(panels[2]>panels[0]*2);
      const reference = new URL(await page.locator('.flex-reference').getAttribute('href'),base).searchParams.get('referencia');
      await page.screenshot({path:`/tmp/mi-reactbits-carousel-${width}.png`});
      assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
      await page.emulateMedia({reducedMotion:'reduce'});
      assert.equal(await page.locator('.star-border__light').first().evaluate(e=>getComputedStyle(e).display),'none');
      assert.equal(await page.locator('.mask-glyph').first().evaluate(e=>getComputedStyle(e).animationName),'none');
      await page.locator('.flex-reference').click();
      await page.getByRole('heading',{name:'Monte seu bolo',exact:true}).waitFor();
      await page.getByRole('button',{name:'Seu bolo até agora'}).count();
      await page.getByRole('button',{name:'Aniversário',exact:true}).click();
      for (let step=0;step<7;step++) {
        if ([1,2,4].includes(step)) await page.getByRole('button',{name:'Quero ajuda da Mi',exact:true}).click();
        if (step===3) await page.getByLabel('Brigadeiro branco',{exact:true}).check();
        if (step===5) await page.getByLabel('Data desejada',{exact:true}).fill('2030-12-01');
        await page.getByRole('button',{name:step===6?'Revisar meu bolo':'Continuar',exact:true}).click();
      }
      const order=page.getByRole('link',{name:'Pedir pelo WhatsApp',exact:true});
      assert((await order.getAttribute('class')).includes('star-border'));
      const link=new URL(await order.getAttribute('href'));
      assert.equal(link.pathname,'/5514991481627');
      assert(link.searchParams.get('text').includes(reference));
      assert.deepEqual(errors,[]);
      await page.close();
    }
    const noJs=await browser.newPage({javaScriptEnabled:false,viewport:{width:390,height:844}});
    await noJs.goto(base);
    await noJs.getByRole('heading',{name:'Bolos artesanais. Feitos com amor.'}).waitFor();
    assert.equal(await noJs.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    console.log('PASS: Star Border, Masked Heading, Flex Carousel, teclado/toque, referência no WhatsApp, redução de movimento e texto sem JavaScript.');
  } finally { await browser.close(); }
})().catch(e=>{console.error(e);process.exit(1)});
