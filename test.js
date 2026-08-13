import puppeteer from 'puppeteer';
(async () => {
  const browser = await puppeteer.launch({ args: ['--no-sandbox'] });
  const page = await browser.newPage();
  
  page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
  page.on('pageerror', error => console.error('BROWSER ERROR:', error.message));

  await page.goto('http://localhost:8889', { waitUntil: 'networkidle2' });
  await new Promise(r => setTimeout(r, 2000));
  
  const state = await page.evaluate(() => {
    return {
      matterDefined: typeof window.Matter !== 'undefined',
      ragdollDefined: window.document.querySelector('#ragdoll-canvas') !== null,
    };
  });
  console.log('Ragdoll Engine State:', state);
  
  await browser.close();
})();
