import fs from 'node:fs/promises';
import path from 'node:path';
import { chromium } from 'playwright';

const baseUrl = process.env.DEMO_BASE_URL || 'http://127.0.0.1:4173/';
const viewport = { width: 1440, height: 900 };
const outputDir = path.resolve(process.cwd(), 'tmp', 'demo-video-run');
const finalVideoPath = path.resolve(process.cwd(), 'tmp', 'quantra-app-demo.webm');

const pause = (page, ms) => page.waitForTimeout(ms);

const typeSlowly = async (locator, text) => {
  await locator.click();
  await locator.pressSequentially(text, { delay: 35 });
};

const clickWhenReady = async (locator, options = {}) => {
  await locator.waitFor({ state: 'visible' });
  await locator.click(options);
};

const moveMouseToCenter = async (page, locator) => {
  const box = await locator.boundingBox();
  if (!box) return;
  await page.mouse.move(box.x + (box.width / 2), box.y + (box.height / 2), { steps: 12 });
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

    await page.mouse.move(200, 180, { steps: 14 });
    await pause(page, 350);
    await page.mouse.wheel(0, 460);
    await pause(page, 900);
    await page.mouse.wheel(0, -260);
    await pause(page, 900);

    console.log('Opening login page...');
    const nav = page.getByRole('navigation');
    const loginButton = nav.getByRole('button', { name: 'Log in', exact: true });
    await moveMouseToCenter(page, loginButton);
    await pause(page, 300);
    await clickWhenReady(loginButton);
    await pause(page, 1400);

    console.log('Using guest access...');
    const guestAccessButton = page.getByRole('button', {
      name: 'Engineer guest access for quick testing',
      exact: true,
    });
    await moveMouseToCenter(page, guestAccessButton);
    await pause(page, 300);
    await clickWhenReady(guestAccessButton);
    await page.getByRole('heading', { name: /Good Afternoon,/ }).waitFor({ state: 'visible' });
    await pause(page, 1800);

    console.log('Creating a new project...');
    const createProjectButton = page.getByRole('button', { name: 'Create New Project', exact: true });
    await moveMouseToCenter(page, createProjectButton);
    await pause(page, 250);
    await clickWhenReady(createProjectButton);
    await page.getByPlaceholder('e.g. Lekki Coastal Revetment BOQ', { exact: true }).waitFor({ state: 'visible' });
    await pause(page, 600);

    await typeSlowly(
      page.getByPlaceholder('e.g. Lekki Coastal Revetment BOQ', { exact: true }),
      'Lagos Residential Duplex Demo'
    );
    await pause(page, 250);
    await typeSlowly(
      page.getByPlaceholder('Client name', { exact: true }),
      'Demo Client Ltd'
    );
    await pause(page, 550);

    const wizardContinueButton = page.getByRole('button', { name: 'Continue', exact: true });
    await moveMouseToCenter(page, wizardContinueButton);
    await pause(page, 250);
    await clickWhenReady(wizardContinueButton);
    await pause(page, 900);

    console.log('Choosing structure and finalizing the wizard...');
    const buildingButton = page.getByRole('button', {
      name: /Building Vertical building works with coordinated architectural, structural, and MEP bills\./,
    });
    await moveMouseToCenter(page, buildingButton);
    await pause(page, 250);
    await clickWhenReady(buildingButton);
    await pause(page, 1000);

    const sectionContinueButton = page.getByRole('button', { name: 'Continue', exact: true });
    await moveMouseToCenter(page, sectionContinueButton);
    await pause(page, 250);
    await clickWhenReady(sectionContinueButton);
    await pause(page, 1200);

    const createAndPickButton = page.getByRole('button', { name: 'Create & Pick Items', exact: true });
    await moveMouseToCenter(page, createAndPickButton);
    await pause(page, 250);
    await clickWhenReady(createAndPickButton);
    await pause(page, 2200);

    console.log('Generating the BOQ from selected items...');
    const firstSelectionCard = page.locator('.boq-selection-card').first();
    await firstSelectionCard.waitFor({ state: 'visible' });
    await moveMouseToCenter(page, firstSelectionCard);
    await pause(page, 300);
    await clickWhenReady(firstSelectionCard);
    await pause(page, 900);

    await page.waitForFunction(() => {
      const button = document.querySelector('.boq-selection-generate-btn');
      return Boolean(button && !button.disabled);
    });

    const generateBoqButton = page.locator('.boq-selection-generate-btn');
    await moveMouseToCenter(page, generateBoqButton);
    await pause(page, 300);
    await clickWhenReady(generateBoqButton);
    await pause(page, 2500);

    await page.locator('.ws-compact-title').waitFor({ state: 'visible' });
    await pause(page, 2200);

    console.log('Showing the rest of the app...');
    const focusExitButton = page.locator('.focus-mode-exit-btn');
    if (await focusExitButton.isVisible().catch(() => false)) {
      await clickWhenReady(focusExitButton);
      await pause(page, 800);
    }

    const priceLibraryButton = page.getByRole('button', { name: 'Price Library', exact: true });
    await moveMouseToCenter(page, priceLibraryButton);
    await pause(page, 250);
    await clickWhenReady(priceLibraryButton);
    await pause(page, 1800);

    const reportsButton = page.getByRole('button', { name: 'Documents & Export', exact: true });
    await moveMouseToCenter(page, reportsButton);
    await pause(page, 250);
    await clickWhenReady(reportsButton);
    await pause(page, 1800);

    const methodologyButton = page.getByRole('button', { name: 'Calculations Guide', exact: true });
    await moveMouseToCenter(page, methodologyButton);
    await pause(page, 250);
    await clickWhenReady(methodologyButton);
    await pause(page, 1800);

    const settingsButton = page.locator('.sidebar-footer').getByRole('button', { name: 'Settings', exact: true });
    await moveMouseToCenter(page, settingsButton);
    await pause(page, 250);
    await clickWhenReady(settingsButton);
    await pause(page, 1800);

    const signOutButton = page.locator('.sidebar-footer').getByRole('button', { name: 'Sign Out', exact: true });
    await moveMouseToCenter(page, signOutButton);
    await pause(page, 250);
    await clickWhenReady(signOutButton);
    await page.getByRole('navigation').getByRole('button', { name: 'Log in', exact: true }).waitFor({ state: 'visible' });
    await pause(page, 1600);
  } finally {
    await context.close();
    await browser.close();
  }

  const recordedVideoPath = await video.path();
  await fs.rename(recordedVideoPath, finalVideoPath);
  console.log(`Demo video saved to ${finalVideoPath}`);
};

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
