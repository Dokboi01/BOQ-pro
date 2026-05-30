import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.DEMO_BASE_URL || 'http://127.0.0.1:4173/';
const viewport = { width: 1440, height: 900 };
const outputFileName = process.argv[2] || process.env.DEMO_VIDEO_NAME || 'quantra-app-demo-narrated.webm';
const outputStem = path.parse(outputFileName).name.replace(/[^a-z0-9_-]+/gi, '-').toLowerCase();
const outputDir = path.resolve(process.cwd(), 'tmp', `demo-video-run-${outputStem}`);
const finalVideoPath = path.resolve(
  process.cwd(),
  'tmp',
  outputFileName
);

const pause = (page, ms) => page.waitForTimeout(ms);

const moveMouseToCenter = async (page, locator) => {
  const box = await locator.boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + (box.width / 2), box.y + (box.height / 2), { steps: 14 });
};

const clickWhenReady = async (page, locator, options = {}) => {
  await locator.waitFor({ state: 'visible' });
  await moveMouseToCenter(page, locator);
  await pause(page, 220);
  await locator.click(options);
};

const typeSlowly = async (locator, text) => {
  await locator.click();
  await locator.fill('');
  await locator.pressSequentially(text, { delay: 35 });
};

const fillLabeledNumber = async (page, labelPattern, nextValue) => {
  const input = page.getByLabel(labelPattern);
  await input.waitFor({ state: 'visible' });
  await input.fill('');
  await input.type(String(nextValue), { delay: 30 });
};

const nudgeNumberInput = async (page, labelPattern, delta, minValue) => {
  const input = page.getByLabel(labelPattern);
  await input.waitFor({ state: 'visible' });
  const currentRaw = await input.inputValue();
  const currentValue = Number(currentRaw || 0);
  const nextValue = Math.max(Number.isFinite(currentValue) ? currentValue + delta : delta, minValue);
  await input.fill('');
  await input.type(String(Math.round(nextValue)), { delay: 28 });
};

const nudgeLocatorNumber = async (locator, delta, minValue = 0) => {
  await locator.waitFor({ state: 'visible' });
  const currentRaw = await locator.inputValue();
  const currentValue = Number(currentRaw || 0);
  const nextValue = Math.max(Number.isFinite(currentValue) ? currentValue + delta : delta, minValue);
  await locator.fill('');
  await locator.type(String(Math.round(nextValue)), { delay: 28 });
};

const scrollWithin = async (page, locator, distance, steps = 2) => {
  await locator.hover();
  for (let index = 0; index < steps; index += 1) {
    await page.mouse.wheel(0, distance / steps);
    await pause(page, 450);
  }
};

const clickVisibleTextButton = async (page, text) => {
  const button = page.getByRole('button', { name: text, exact: true });
  await clickWhenReady(page, button);
};

const selectFirstBoqCards = async (page, count = 3) => {
  const cards = page.locator('.boq-selection-card');
  await cards.first().waitFor({ state: 'visible' });
  const total = await cards.count();
  const safeCount = Math.min(count, total);

  for (let index = 0; index < safeCount; index += 1) {
    const card = cards.nth(index);
    await moveMouseToCenter(page, card);
    await pause(page, 220);
    await card.click();
    await pause(page, 420);
  }
};

const main = async () => {
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
    await pause(page, 1800);

    await page.mouse.move(220, 170, { steps: 16 });
    await pause(page, 350);
    await page.mouse.wheel(0, 380);
    await pause(page, 750);
    await page.mouse.wheel(0, -250);
    await pause(page, 900);

    console.log('Opening login page...');
    const loginButton = page.getByRole('navigation').getByRole('button', { name: 'Log in', exact: true });
    await clickWhenReady(page, loginButton);
    await pause(page, 1300);

    console.log('Using guest access...');
    await clickVisibleTextButton(page, 'Engineer guest access for quick testing');
    await page.getByRole('button', { name: 'Create New Project', exact: true }).waitFor({ state: 'visible' });
    await pause(page, 1800);

    console.log('Creating a new project...');
    await clickVisibleTextButton(page, 'Create New Project');
    await page.getByPlaceholder('e.g. Lekki Coastal Revetment BOQ', { exact: true }).waitFor({ state: 'visible' });
    await pause(page, 500);

    await typeSlowly(
      page.getByPlaceholder('e.g. Lekki Coastal Revetment BOQ', { exact: true }),
      'Quantra Narrated Demo Project'
    );
    await pause(page, 200);
    await typeSlowly(page.getByPlaceholder('Client name', { exact: true }), 'Demo Client Ltd');
    await pause(page, 650);

    await clickVisibleTextButton(page, 'Continue');
    await pause(page, 800);

    console.log('Choosing structure...');
    const buildingButton = page.getByRole('button', {
      name: /Building Vertical building works with coordinated architectural, structural, and MEP bills\./,
    });
    await clickWhenReady(page, buildingButton);
    await pause(page, 850);

    await clickVisibleTextButton(page, 'Continue');
    await pause(page, 900);

    await clickVisibleTextButton(page, 'Create & Pick Items');
    await pause(page, 2200);

    console.log('Selecting formula-ready concrete BOQ item...');
    const concreteWorksSection = page.locator('.boq-selection-sidebar .glass-panel-item').filter({ hasText: 'Concrete Works' }).first();
    await clickWhenReady(page, concreteWorksSection);
    await pause(page, 1300);

    const formulaFilter = page.getByRole('button', { name: 'Formula Ready', exact: true });
    await clickWhenReady(page, formulaFilter, { force: true });
    await pause(page, 1200);

    const formulaSort = page.getByLabel('Sort results');
    await formulaSort.selectOption('formula');
    await pause(page, 1000);

    const formulaCard = page.locator('.boq-selection-card').first();
    await formulaCard.waitFor({ state: 'visible' });
    await moveMouseToCenter(page, formulaCard);
    await pause(page, 2200);
    await formulaCard.click();
    await pause(page, 1200);

    const generateBoqButton = page.locator('.boq-selection-generate-btn');
    await generateBoqButton.waitFor({ state: 'visible' });
    await clickWhenReady(page, generateBoqButton);
    await pause(page, 3200);

    await page.locator('.ws-compact-title').waitFor({ state: 'visible' });
    await pause(page, 1800);

    console.log('Selecting the first item...');
    const focusExitButton = page.locator('.focus-mode-exit-btn');
    if (await focusExitButton.isVisible().catch(() => false)) {
      await clickWhenReady(page, focusExitButton);
      await pause(page, 700);
    }

    const firstItemRow = page.locator('tr.ws-item-row').first();
    await firstItemRow.waitFor({ state: 'visible' });
    const firstDescriptionCell = firstItemRow.locator('td.ws-desc');
    await clickWhenReady(page, firstDescriptionCell);
    await page.locator('.ws-detail-dock-title').waitFor({ state: 'visible' });
    await pause(page, 2200);

    console.log('Opening quantity takeoff...');
    const takeoffButton = page.locator('.ws-detail-dock .ws-helper-btn[title="Geometric Takeoff"]');
    await clickWhenReady(page, takeoffButton);
    await page.getByRole('heading', { name: 'Takeoff Calculator', exact: true }).waitFor({ state: 'visible' });
    await pause(page, 1800);

    const mainTakeoffInputs = page.locator('.geo-calc-modal .form-item .geo-input:not(.highlight)');
    const mainInputCount = await mainTakeoffInputs.count();
    if (mainInputCount >= 1) {
      await mainTakeoffInputs.nth(0).fill('12');
      await pause(page, 300);
    }
    if (mainInputCount >= 2) {
      await mainTakeoffInputs.nth(1).fill('6');
      await pause(page, 300);
    }
    if (mainInputCount >= 3) {
      await mainTakeoffInputs.nth(2).fill('0.25');
      await pause(page, 300);
    }
    if (mainInputCount >= 4) {
      await mainTakeoffInputs.nth(3).fill('2');
      await pause(page, 300);
    }

    const allowanceInput = page.locator('.geo-calc-modal .geo-input.highlight');
    if (await allowanceInput.count()) {
      await allowanceInput.fill('5');
      await pause(page, 350);
    }

    await pause(page, 1800);
    await clickVisibleTextButton(page, 'Apply Quantity');
    await pause(page, 2300);

    console.log('Opening formula inputs...');
    const formulaInputsButton = page.getByRole('button', { name: 'Formula Inputs', exact: true });
    await clickWhenReady(page, formulaInputsButton);
    await page.locator('.boq-formula-modal').waitFor({ state: 'visible' });
    await pause(page, 2400);

    const formulaRatePanel = page.locator('.boq-formula-panel.strong');
    await moveMouseToCenter(page, formulaRatePanel);
    await pause(page, 1200);

    const formulaLogicPanel = page.locator('.boq-formula-panel').filter({ hasText: 'Formula Logic' }).first();
    await moveMouseToCenter(page, formulaLogicPanel);
    await pause(page, 1200);

    const formulaInputs = page.locator('.boq-formula-field input');
    if (await formulaInputs.count()) {
      await nudgeLocatorNumber(formulaInputs.nth(0), 1500, 1000);
      await pause(page, 450);
    }
    if ((await formulaInputs.count()) > 1) {
      await nudgeLocatorNumber(formulaInputs.nth(1), 600, 500);
      await pause(page, 450);
    }

    await pause(page, 2200);
    await clickVisibleTextButton(page, 'Apply Formula Inputs');
    await pause(page, 2200);

    const formulaStatusHint = page.locator('.ws-rate-note').filter({ hasText: 'Formula rate active' }).first();
    if (await formulaStatusHint.isVisible().catch(() => false)) {
      await moveMouseToCenter(page, formulaStatusHint);
      await pause(page, 1800);
    }

    console.log('Showing benchmark pricing...');
    const benchmarkCard = page.locator('.idp-pricing-stack .idp-price-opt').filter({ hasText: 'Benchmark' }).first();
    await clickWhenReady(page, benchmarkCard);
    await pause(page, 2400);

    const benchmarkStatusHint = page.locator('.ws-rate-note').filter({ hasText: 'Auto-priced using current market benchmark' }).first();
    if (await benchmarkStatusHint.isVisible().catch(() => false)) {
      await moveMouseToCenter(page, benchmarkStatusHint);
      await pause(page, 1900);
    }

    console.log('Switching to manual pricing...');
    const manualCard = page.locator('.idp-pricing-stack .idp-price-opt').filter({ hasText: 'Manual' }).first();
    await clickWhenReady(page, manualCard);
    await pause(page, 1100);

    const manualRateButton = page.getByRole('button', { name: 'Manual Rate', exact: true });
    await clickWhenReady(page, manualRateButton);
    await page.getByRole('button', { name: 'Apply custom pricing', exact: true }).waitFor({ state: 'visible' });
    await pause(page, 1800);

    const reinforcedConcretePreset = page.getByRole('button', { name: /Reinforced Concrete/i }).first();
    if (await reinforcedConcretePreset.isVisible().catch(() => false)) {
      await clickWhenReady(page, reinforcedConcretePreset);
      await pause(page, 1200);
    }

    await nudgeNumberInput(page, /Materials per/i, 2000, 2000);
    await pause(page, 450);
    await nudgeNumberInput(page, /Labour per/i, 1000, 1000);
    await pause(page, 450);
    await fillLabeledNumber(page, /Material waste %/i, 5);
    await pause(page, 450);

    const pricingReference = page.getByLabel('Pricing reference');
    await pricingReference.fill('Supplier call and site check');
    await pause(page, 300);

    const pricingNote = page.getByLabel('Pricing note');
    await pricingNote.fill('Adjusted for site access, labour productivity, and commercial margin.');
    await pause(page, 1200);

    const computedCustomRateCard = page.locator('.custom-pricing-summary .spotlight');
    await moveMouseToCenter(page, computedCustomRateCard);
    await pause(page, 1600);
    const formulaSummaryCard = page.locator('.custom-pricing-summary .summary-card').filter({ hasText: 'Rate Formula' }).first();
    await moveMouseToCenter(page, formulaSummaryCard);
    await pause(page, 1800);

    await clickVisibleTextButton(page, 'Apply custom pricing');
    await pause(page, 2200);

    console.log('Opening detailed rate analysis...');
    const rateAnalysisButton = page.getByRole('button', { name: 'Rate Analysis', exact: true });
    await clickWhenReady(page, rateAnalysisButton);
    await page.locator('.analysis-modal').waitFor({ state: 'visible' });
    await pause(page, 1800);

    const analysisContent = page.locator('.analysis-content');
    await moveMouseToCenter(page, page.locator('.formula-banner'));
    await pause(page, 2200);

    const finalAmountRow = page.locator('.analysis-modal .total-amount-row');
    await finalAmountRow.scrollIntoViewIfNeeded();
    await pause(page, 2200);

    const cancelAnalysisButton = page.locator('.analysis-footer .btn-secondary');
    await clickWhenReady(page, cancelAnalysisButton);
    await pause(page, 1000);

    console.log('Showing remaining app areas...');
    const customStatusHint = page.locator('.ws-rate-note').filter({ hasText: 'Custom rate override active' }).first();
    if (await customStatusHint.isVisible().catch(() => false)) {
      await moveMouseToCenter(page, customStatusHint);
      await pause(page, 1500);
    }

    await clickVisibleTextButton(page, 'Price Library');
    await pause(page, 1800);

    await clickVisibleTextButton(page, 'Documents & Export');
    await pause(page, 1800);

    await clickVisibleTextButton(page, 'Calculations Guide');
    await pause(page, 1800);

    const settingsButton = page.locator('.sidebar-footer').getByRole('button', { name: 'Settings', exact: true });
    await clickWhenReady(page, settingsButton);
    await pause(page, 1600);

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
  console.log(`Narrated demo video saved to ${finalVideoPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
