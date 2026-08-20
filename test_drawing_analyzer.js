import { chromium } from 'playwright';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();

  page.on('console', msg => {
    console.log(`[BROWSER LOG]: ${msg.text()}`);
  });

  page.on('pageerror', err => {
    console.error(`[BROWSER ERROR]: ${err.stack || err.message}`);
  });

  try {
    console.log('Loading app with devlogin...');
    await page.goto('http://localhost:5199/?devlogin=1');
    await page.waitForTimeout(3000);

    await page.screenshot({ path: 'C:/Users/adedo/.gemini/antigravity/brain/e4e93fa3-8668-4d0d-82ba-482b8c4bae3d/dashboard.png' });

    console.log('Clicking Create New Project...');
    await page.click('button:has-text("Create New Project")');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'C:/Users/adedo/.gemini/antigravity/brain/e4e93fa3-8668-4d0d-82ba-482b8c4bae3d/wizard_step1.png' });

    console.log('Filling details in wizard...');
    const inputs = await page.$$('.wizard-modal input[type="text"]');
    if (inputs.length >= 2) {
      await inputs[0].fill('Test Project');
      await inputs[1].fill('Test Client');
    } else {
      console.warn('Could not find enough inputs inside wizard');
    }

    console.log('Clicking Continue to Step 2...');
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(1000);

    await page.screenshot({ path: 'C:/Users/adedo/.gemini/antigravity/brain/e4e93fa3-8668-4d0d-82ba-482b8c4bae3d/wizard_step2.png' });

    console.log('Clicking AI Drawing Assistant...');
    await page.click('.selection-card.ai-card');
    await page.waitForTimeout(2000);

    await page.screenshot({ path: 'C:/Users/adedo/.gemini/antigravity/brain/e4e93fa3-8668-4d0d-82ba-482b8c4bae3d/after_ai_click.png' });
    console.log('Done!');
  } catch (e) {
    console.error('Script error:', e);
  } finally {
    await browser.close();
  }
}

run();
