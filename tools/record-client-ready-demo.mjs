import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.DEMO_BASE_URL || 'http://127.0.0.1:4173/';
const viewport = { width: 1440, height: 900 };
const outputFileName = process.argv[2] || process.env.DEMO_VIDEO_NAME || 'quantra-app-demo-client-ready.webm';
const outputStem = path.parse(outputFileName).name.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
const outputDir = path.resolve(process.cwd(), 'tmp', `demo-video-run-${outputStem}`);
const finalVideoPath = path.resolve(process.cwd(), 'tmp', outputFileName);
const pauseScale = Number(process.env.DEMO_PAUSE_SCALE || 1.16);

const pause = (page, ms) => page.waitForTimeout(Math.round(ms * pauseScale));

const moveMouseToCenter = async (page, locator) => {
  const box = await locator.boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + (box.width / 2), box.y + (box.height / 2), { steps: 16 });
};

const clickWhenReady = async (page, locator, options = {}) => {
  await locator.waitFor({ state: 'visible' });
  await moveMouseToCenter(page, locator);
  await pause(page, 260);
  await locator.click(options);
};

const typeSlowly = async (locator, text) => {
  await locator.click();
  await locator.fill('');
  await locator.pressSequentially(text, { delay: 45 });
};

const fillLabeledNumber = async (page, labelPattern, nextValue) => {
  const input = page.getByLabel(labelPattern);
  await input.waitFor({ state: 'visible' });
  await input.fill('');
  await input.type(String(nextValue), { delay: 35 });
};

const nudgeNumberInput = async (page, labelPattern, delta, minValue) => {
  const input = page.getByLabel(labelPattern);
  await input.waitFor({ state: 'visible' });
  const currentRaw = await input.inputValue();
  const currentValue = Number(currentRaw || 0);
  const nextValue = Math.max(Number.isFinite(currentValue) ? currentValue + delta : delta, minValue);
  await input.fill('');
  await input.type(String(Math.round(nextValue)), { delay: 35 });
};

const nudgeLocatorNumber = async (locator, delta, minValue = 0) => {
  await locator.waitFor({ state: 'visible' });
  const currentRaw = await locator.inputValue();
  const currentValue = Number(currentRaw || 0);
  const nextValue = Math.max(Number.isFinite(currentValue) ? currentValue + delta : delta, minValue);
  await locator.fill('');
  await locator.type(String(Math.round(nextValue)), { delay: 35 });
};

const clickVisibleTextButton = async (page, text) => {
  const button = page.getByRole('button', { name: text, exact: true });
  await clickWhenReady(page, button);
};

const installDemoOverlays = async (page) => {
  await page.addStyleTag({
    content: `
      #quantra-demo-title,
      #quantra-demo-caption {
        font-family: "Segoe UI", "Helvetica Neue", Arial, sans-serif;
        pointer-events: none;
      }

      #quantra-demo-title {
        position: fixed;
        inset: 0;
        z-index: 2147483000;
        display: grid;
        place-items: center;
        padding: 72px;
        color: #f8faf4;
        opacity: 0;
        transform: scale(1.01);
        transition: opacity 420ms ease, transform 520ms ease;
        background:
          linear-gradient(135deg, rgba(3, 27, 24, 0.96), rgba(28, 51, 34, 0.95) 50%, rgba(73, 54, 31, 0.94)),
          repeating-linear-gradient(90deg, rgba(255,255,255,0.04) 0 1px, transparent 1px 56px);
      }

      #quantra-demo-title.is-visible {
        opacity: 1;
        transform: scale(1);
      }

      #quantra-demo-title .demo-title-inner {
        width: min(1040px, 88vw);
      }

      #quantra-demo-title .demo-kicker {
        color: #f2c76e;
        font-size: 18px;
        font-weight: 700;
        letter-spacing: 0;
        margin-bottom: 18px;
        text-transform: uppercase;
      }

      #quantra-demo-title h1 {
        color: #ffffff;
        font-size: 84px;
        line-height: 0.95;
        letter-spacing: 0;
        margin: 0 0 24px;
      }

      #quantra-demo-title p {
        color: #e8efe5;
        font-size: 30px;
        line-height: 1.34;
        margin: 0;
        max-width: 900px;
      }

      #quantra-demo-title .demo-title-rule {
        width: 220px;
        height: 4px;
        margin: 34px 0 0;
        background: linear-gradient(90deg, #f2c76e, #55d18d);
      }

      #quantra-demo-caption {
        position: fixed;
        left: 44px;
        right: 44px;
        bottom: 34px;
        z-index: 2147483001;
        display: grid;
        grid-template-columns: 250px 1fr;
        gap: 22px;
        align-items: center;
        padding: 22px 28px;
        color: #f8faf4;
        opacity: 0;
        transform: translateY(18px);
        transition: opacity 260ms ease, transform 320ms ease;
        background: linear-gradient(135deg, rgba(5, 22, 21, 0.92), rgba(17, 36, 28, 0.91));
        border: 1px solid rgba(242, 199, 110, 0.4);
        box-shadow: 0 22px 70px rgba(0,0,0,0.32);
      }

      #quantra-demo-caption.is-visible {
        opacity: 1;
        transform: translateY(0);
      }

      #quantra-demo-caption .caption-label {
        color: #f2c76e;
        font-size: 18px;
        font-weight: 800;
        letter-spacing: 0;
        text-transform: uppercase;
      }

      #quantra-demo-caption .caption-body {
        color: #ffffff;
        font-size: 25px;
        line-height: 1.28;
        font-weight: 650;
      }

      #quantra-demo-caption .caption-body small {
        display: block;
        color: #dfe9dc;
        font-size: 18px;
        font-weight: 500;
        margin-top: 6px;
      }
    `,
  });

  await page.evaluate(() => {
    const existingTitle = document.getElementById('quantra-demo-title');
    const existingCaption = document.getElementById('quantra-demo-caption');
    if (existingTitle && existingCaption) return;

    const title = document.createElement('div');
    title.id = 'quantra-demo-title';
    title.innerHTML = `
      <div class="demo-title-inner">
        <div class="demo-kicker"></div>
        <h1></h1>
        <p></p>
        <div class="demo-title-rule"></div>
      </div>
    `;

    const caption = document.createElement('div');
    caption.id = 'quantra-demo-caption';
    caption.innerHTML = `
      <div class="caption-label"></div>
      <div class="caption-body"></div>
    `;

    document.body.append(title, caption);
  });
};

const showTitle = async (page, { kicker, title, subtitle }) => {
  await page.evaluate((payload) => {
    const overlay = document.getElementById('quantra-demo-title');
    overlay.querySelector('.demo-kicker').textContent = payload.kicker;
    overlay.querySelector('h1').textContent = payload.title;
    overlay.querySelector('p').textContent = payload.subtitle;
    overlay.classList.add('is-visible');
  }, { kicker, title, subtitle });
};

const hideTitle = async (page) => {
  await page.evaluate(() => {
    document.getElementById('quantra-demo-title')?.classList.remove('is-visible');
  });
};

const showCaption = async (page, label, html) => {
  await page.evaluate((payload) => {
    const caption = document.getElementById('quantra-demo-caption');
    caption.querySelector('.caption-label').textContent = payload.label;
    caption.querySelector('.caption-body').innerHTML = payload.html;
    caption.classList.add('is-visible');
  }, { label, html });
};

const hideCaption = async (page) => {
  await page.evaluate(() => {
    document.getElementById('quantra-demo-caption')?.classList.remove('is-visible');
  });
};

const main = async () => {
  await fs.rm(outputDir, { recursive: true, force: true });
  await fs.mkdir(outputDir, { recursive: true });
  await fs.rm(finalVideoPath, { force: true });

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport,
    recordVideo: {
      dir: outputDir,
      size: viewport,
    },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(30000);

  const video = page.video();

  try {
    console.log('Opening landing page...');
    await page.goto(baseUrl, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('networkidle');
    await installDemoOverlays(page);

    await showTitle(page, {
      kicker: 'Client walkthrough',
      title: 'Quantra',
      subtitle: 'Quantity takeoff, formula pricing, benchmark comparison, and defended BOQ rate analysis in one workflow.',
    });
    await pause(page, 6200);
    await hideTitle(page);
    await pause(page, 900);

    await showCaption(page, 'Start', 'From sign-in to issued BOQ: every price is traceable.');
    await pause(page, 1600);
    await hideCaption(page);

    console.log('Opening login page...');
    const loginButton = page.getByRole('navigation').getByRole('button', { name: 'Log in', exact: true });
    await clickWhenReady(page, loginButton);
    await pause(page, 1450);

    console.log('Logging in with demo credentials...');
    const email = process.env.DEMO_USER_EMAIL || 'test@quantra.com';
    const password = process.env.DEMO_USER_PASSWORD || 'password';

    await typeSlowly(page.getByPlaceholder('name@company.com'), email);
    await pause(page, 300);
    await typeSlowly(page.getByPlaceholder('Enter your password'), password);
    await pause(page, 420);
    await clickVisibleTextButton(page, 'Sign in to Quantra');
    await page.getByRole('button', { name: 'Create New Project', exact: true }).waitFor({ state: 'visible' });
    await pause(page, 2100);

    console.log('Creating a new project...');
    await clickVisibleTextButton(page, 'Create New Project');
    await page.getByPlaceholder('e.g. Lekki Coastal Revetment BOQ', { exact: true }).waitFor({ state: 'visible' });
    await pause(page, 700);

    await typeSlowly(
      page.getByPlaceholder('e.g. Lekki Coastal Revetment BOQ', { exact: true }),
      'Quantra Client Ready Demo'
    );
    await pause(page, 300);
    await typeSlowly(page.getByPlaceholder('Client name', { exact: true }), 'Demo Client Ltd');
    await pause(page, 850);

    await clickVisibleTextButton(page, 'Continue');
    await pause(page, 950);

    console.log('Choosing structure...');
    const buildingButton = page.getByRole('button', {
      name: /Building Vertical building works with coordinated architectural, structural, and MEP bills\./,
    });
    await clickWhenReady(page, buildingButton);
    await pause(page, 1100);

    await clickVisibleTextButton(page, 'Continue');
    await pause(page, 1100);

    await clickVisibleTextButton(page, 'Create & Pick Items');
    await pause(page, 2600);

    console.log('Selecting formula-ready concrete BOQ item...');
    await showCaption(
      page,
      'Formula-ready item',
      'The selected BOQ line already has pricing basis, editable inputs, and a worked example.'
    );
    const concreteWorksSection = page.locator('.boq-selection-sidebar .glass-panel-item').filter({ hasText: 'Concrete Works' }).first();
    await clickWhenReady(page, concreteWorksSection);
    await pause(page, 1300);

    const formulaFilter = page.getByRole('button', { name: 'Formula Ready', exact: true });
    await clickWhenReady(page, formulaFilter, { force: true });
    await pause(page, 1350);

    const formulaSort = page.getByLabel('Sort results');
    await formulaSort.selectOption('formula');
    await pause(page, 1200);

    const formulaCard = page.locator('.boq-selection-card').first();
    await formulaCard.waitFor({ state: 'visible' });
    await moveMouseToCenter(page, formulaCard);
    await pause(page, 3200);
    await hideCaption(page);
    await formulaCard.click();
    await pause(page, 1450);

    const generateBoqButton = page.locator('.boq-selection-generate-btn');
    await generateBoqButton.waitFor({ state: 'visible' });
    await clickWhenReady(page, generateBoqButton);
    await pause(page, 3600);

    await page.locator('.ws-compact-title').waitFor({ state: 'visible' });
    await pause(page, 2200);

    console.log('Selecting the first item...');
    const focusExitButton = page.locator('.focus-mode-exit-btn');
    if (await focusExitButton.isVisible().catch(() => false)) {
      await clickWhenReady(page, focusExitButton);
      await pause(page, 800);
    }

    const firstItemRow = page.locator('tr.ws-item-row').first();
    await firstItemRow.waitFor({ state: 'visible' });
    const firstDescriptionCell = firstItemRow.locator('td.ws-desc');
    await clickWhenReady(page, firstDescriptionCell);
    await page.locator('.ws-detail-dock-title').waitFor({ state: 'visible' });
    await pause(page, 2300);

    console.log('Opening quantity takeoff...');
    await showCaption(
      page,
      'Quantity formula',
      'Quantity = Length x Width x Depth x Repeats<small>Allowance % is added before the value is applied to the BOQ row.</small>'
    );
    const takeoffButton = page.locator('.ws-detail-dock .ws-helper-btn[title="Geometric Takeoff"]');
    await clickWhenReady(page, takeoffButton);
    await page.getByRole('heading', { name: 'Takeoff Calculator', exact: true }).waitFor({ state: 'visible' });
    await pause(page, 2100);

    const mainTakeoffInputs = page.locator('.geo-calc-modal .form-item .geo-input:not(.highlight)');
    const mainInputCount = await mainTakeoffInputs.count();
    if (mainInputCount >= 1) {
      await mainTakeoffInputs.nth(0).fill('12');
      await pause(page, 650);
    }
    if (mainInputCount >= 2) {
      await mainTakeoffInputs.nth(1).fill('6');
      await pause(page, 650);
    }
    if (mainInputCount >= 3) {
      await mainTakeoffInputs.nth(2).fill('0.25');
      await pause(page, 650);
    }
    if (mainInputCount >= 4) {
      await mainTakeoffInputs.nth(3).fill('2');
      await pause(page, 650);
    }

    const allowanceInput = page.locator('.geo-calc-modal .geo-input.highlight');
    if (await allowanceInput.count()) {
      await allowanceInput.fill('5');
      await pause(page, 850);
    }

    await pause(page, 2800);
    await clickVisibleTextButton(page, 'Apply Quantity');
    await pause(page, 2300);
    await showCaption(
      page,
      'BOQ amount',
      'Amount = Applied Quantity x Selected Unit Rate<small>The row total changes whenever quantity or rate changes.</small>'
    );
    await pause(page, 3300);
    await hideCaption(page);

    console.log('Opening formula inputs...');
    const formulaInputsButton = page.getByRole('button', { name: 'Formula Inputs', exact: true });
    await clickWhenReady(page, formulaInputsButton);
    await page.locator('.boq-formula-modal').waitFor({ state: 'visible' });
    await showCaption(
      page,
      'Formula rate',
      'Rate/m3 = Concrete + Reinforcement + Formwork + Placing + Vibrating + Curing + OHP'
    );
    await pause(page, 3200);

    const formulaRatePanel = page.locator('.boq-formula-panel.strong');
    await moveMouseToCenter(page, formulaRatePanel);
    await pause(page, 1500);

    const formulaLogicPanel = page.locator('.boq-formula-panel').filter({ hasText: 'Formula Logic' }).first();
    await moveMouseToCenter(page, formulaLogicPanel);
    await pause(page, 1700);

    const formulaInputs = page.locator('.boq-formula-field input');
    if (await formulaInputs.count()) {
      await nudgeLocatorNumber(formulaInputs.nth(0), 1500, 1000);
      await pause(page, 850);
    }
    if ((await formulaInputs.count()) > 1) {
      await nudgeLocatorNumber(formulaInputs.nth(1), 600, 500);
      await pause(page, 850);
    }

    await showCaption(
      page,
      'Live recalculation',
      'Changing any input recalculates the unit rate, then the BOQ amount follows automatically.'
    );
    await pause(page, 2900);
    await clickVisibleTextButton(page, 'Apply Formula Inputs');
    await pause(page, 2600);
    await hideCaption(page);

    const formulaStatusHint = page.locator('.ws-rate-note').filter({ hasText: 'Formula rate active' }).first();
    if (await formulaStatusHint.isVisible().catch(() => false)) {
      await moveMouseToCenter(page, formulaStatusHint);
      await pause(page, 1900);
    }

    console.log('Showing benchmark pricing...');
    await showCaption(
      page,
      'Benchmark rate',
      'Benchmark pricing swaps the engineered formula rate for a regional market reference.'
    );
    const benchmarkCard = page.locator('.idp-pricing-stack .idp-price-opt').filter({ hasText: 'Benchmark' }).first();
    await clickWhenReady(page, benchmarkCard);
    await pause(page, 3000);

    const benchmarkStatusHint = page.locator('.ws-rate-note').filter({ hasText: 'Auto-priced using current market benchmark' }).first();
    if (await benchmarkStatusHint.isVisible().catch(() => false)) {
      await moveMouseToCenter(page, benchmarkStatusHint);
      await pause(page, 1800);
    }
    await hideCaption(page);

    console.log('Switching to manual pricing...');
    await showCaption(
      page,
      'Custom rate build-up',
      'Rate = Materials + Labour + Plant + Transport + Waste + Site Difficulty + Overheads + Profit'
    );
    const manualCard = page.locator('.idp-pricing-stack .idp-price-opt').filter({ hasText: 'Manual' }).first();
    await clickWhenReady(page, manualCard);
    await pause(page, 1300);

    const manualRateButton = page.getByRole('button', { name: 'Manual Rate', exact: true });
    await clickWhenReady(page, manualRateButton);
    await page.getByRole('button', { name: 'Apply custom pricing', exact: true }).waitFor({ state: 'visible' });
    await pause(page, 2100);

    const reinforcedConcretePreset = page.getByRole('button', { name: /Reinforced Concrete/i }).first();
    if (await reinforcedConcretePreset.isVisible().catch(() => false)) {
      await clickWhenReady(page, reinforcedConcretePreset);
      await pause(page, 1400);
    }

    await nudgeNumberInput(page, /Materials per/i, 2000, 2000);
    await pause(page, 700);
    await nudgeNumberInput(page, /Labour per/i, 1000, 1000);
    await pause(page, 700);
    await fillLabeledNumber(page, /Material waste %/i, 5);
    await pause(page, 700);

    const pricingReference = page.getByLabel('Pricing reference');
    await pricingReference.fill('Supplier call and site check');
    await pause(page, 450);

    const pricingNote = page.getByLabel('Pricing note');
    await pricingNote.fill('Adjusted for site access, labour productivity, and commercial margin.');
    await pause(page, 1600);

    const computedCustomRateCard = page.locator('.custom-pricing-summary .spotlight');
    await moveMouseToCenter(page, computedCustomRateCard);
    await pause(page, 1900);
    const formulaSummaryCard = page.locator('.custom-pricing-summary .summary-card').filter({ hasText: 'Rate Formula' }).first();
    await moveMouseToCenter(page, formulaSummaryCard);
    await pause(page, 2200);

    await clickVisibleTextButton(page, 'Apply custom pricing');
    await pause(page, 2600);
    await hideCaption(page);

    console.log('Opening detailed rate analysis...');
    await showCaption(
      page,
      'Detailed analysis',
      'Unit Rate = Direct Cost + Waste + Site Adjustment + Overheads + Profit'
    );
    const rateAnalysisButton = page.getByRole('button', { name: 'Rate Analysis', exact: true });
    await clickWhenReady(page, rateAnalysisButton);
    await page.locator('.analysis-modal').waitFor({ state: 'visible' });
    await pause(page, 2200);

    await moveMouseToCenter(page, page.locator('.formula-banner'));
    await pause(page, 3000);

    const finalAmountRow = page.locator('.analysis-modal .total-amount-row');
    await finalAmountRow.scrollIntoViewIfNeeded();
    await showCaption(
      page,
      'Final BOQ total',
      'BOQ Amount = Quantity x Unit Rate<small>The analysis explains both the unit rate and the total amount.</small>'
    );
    await pause(page, 3900);

    const cancelAnalysisButton = page.locator('.analysis-footer .btn-secondary');
    await clickWhenReady(page, cancelAnalysisButton);
    await pause(page, 1200);
    await hideCaption(page);

    console.log('Showing remaining app areas...');
    const customStatusHint = page.locator('.ws-rate-note').filter({ hasText: 'Custom rate override active' }).first();
    if (await customStatusHint.isVisible().catch(() => false)) {
      await moveMouseToCenter(page, customStatusHint);
      await pause(page, 1700);
    }

    await showCaption(page, 'Price library', 'Saved rates and pricing evidence stay available for future projects.');
    await clickVisibleTextButton(page, 'Price Library');
    await pause(page, 2400);

    await showCaption(page, 'Exports', 'Priced BOQs move into documents, reports, and submission-ready outputs.');
    await clickVisibleTextButton(page, 'Documents & Export');
    await pause(page, 2500);

    await showCaption(page, 'Methodology', 'Calculation rules stay visible, so the team can defend the numbers.');
    await clickVisibleTextButton(page, 'Calculations Guide');
    await pause(page, 2500);

    await hideCaption(page);
    const settingsButton = page.locator('.sidebar-footer').getByRole('button', { name: 'Settings', exact: true });
    await clickWhenReady(page, settingsButton);
    await pause(page, 1900);

    await showTitle(page, {
      kicker: 'End-to-end BOQ workflow',
      title: 'Quantra',
      subtitle: 'Measured quantities, formula rates, benchmarks, custom pricing, and final analysis connected from start to finish.',
    });
    await pause(page, 6200);
    await hideTitle(page);
    await pause(page, 900);

    const signOutButton = page.locator('.sidebar-footer').getByRole('button', { name: 'Sign Out', exact: true });
    await clickWhenReady(page, signOutButton);
    await page.getByRole('navigation').getByRole('button', { name: 'Log in', exact: true }).waitFor({ state: 'visible' });
    await pause(page, 1500);
  } finally {
    await context.close();
    await browser.close();
  }

  const recordedVideoPath = await video.path();
  await fs.rename(recordedVideoPath, finalVideoPath);
  console.log(`Client-ready demo video saved to ${finalVideoPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
