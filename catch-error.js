import puppeteer from 'puppeteer';

(async () => {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log(`[BROWSER ERROR] ${msg.text()}`);
    }
  });

  page.on('pageerror', err => {
    console.log(`[PAGE CRASH]`, err.message);
    console.log(`[STACK]`, err.stack);
  });

  await page.goto('http://localhost:5173');
  
  // Wait for React to load
  await new Promise(r => setTimeout(r, 2000));
  
  try {
    // We can try to simulate the clicks, but might be easier to just navigate LocalStorage 
    // Wait, let's just click through the wizard
    await page.evaluate(() => {
        const createBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('New Project'));
        if (createBtn) createBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 1000));
    
    // Step 1: Input name and client
    await page.type('input[placeholder="e.g. Dangote Refinery Road Works"]', 'Test Crash');
    await page.type('input[placeholder="Client Name"]', 'Test Client');
    
    // Click Continue
    await page.evaluate(() => {
        const continueBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Continue'));
        if (continueBtn) continueBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    // Step 2: Click 'Building'
    await page.evaluate(() => {
        const bldgBtn = Array.from(document.querySelectorAll('.selection-card h4')).find(el => el.textContent.includes('Building'));
        if (bldgBtn) bldgBtn.closest('.selection-card').click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    // Step 3: Click 'Bungalow'
    await page.evaluate(() => {
        const bgBtn = Array.from(document.querySelectorAll('.selection-card h4')).find(el => el.textContent.includes('Bungalow'));
        if (bgBtn) bgBtn.closest('.selection-card').click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    // Step 4: Click Continue
    await page.evaluate(() => {
        const contBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Continue'));
        if (contBtn) contBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    // Step 5: Click Review Project
    await page.evaluate(() => {
        const reviewBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Review Project'));
        if (reviewBtn) reviewBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 500));
    
    // Step 6: Click Generate BOQ
    console.log("About to click Generate BOQ...");
    await page.evaluate(() => {
        const genBtn = Array.from(document.querySelectorAll('button')).find(el => el.textContent.includes('Generate BOQ'));
        if (genBtn) genBtn.click();
    });
    
    await new Promise(r => setTimeout(r, 3000));
    console.log("Completed automation.");
    
  } catch (err) {
    console.log("Script error:", err.message);
  }
  
  await browser.close();
})();
