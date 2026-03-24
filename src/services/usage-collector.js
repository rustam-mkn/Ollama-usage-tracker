import { chromium } from 'playwright';
import { nowLabel } from '../lib/format.js';

const SETTINGS_URL = 'https://ollama.com/settings';
const CHROME_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--no-first-run',
  '--no-default-browser-check',
];

function extractUsage(text, label) {
  const regex = new RegExp(
    `${label}\\s+(\\d+(?:[.,]\\d+)?)%\\s+used\\s+Resets\\s+in\\s+([^\\n]+)`,
    'i'
  );
  const match = text.match(regex);
  if (!match) {
    return null;
  }

  return {
    percent: Number(match[1].replace(',', '.')),
    resetIn: match[2].trim(),
  };
}

function extractEmail(text) {
  const match = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0].toLowerCase() : null;
}

async function readUsageFromPage(page, expectedEmail) {
  await page.goto(SETTINGS_URL, { waitUntil: 'domcontentloaded' });
  await page.waitForLoadState('networkidle').catch(() => {});
  const bodyText = await page.locator('body').innerText();
  const session = extractUsage(bodyText, 'Session usage');
  const weekly = extractUsage(bodyText, 'Weekly usage');
  const detectedEmail = extractEmail(bodyText);

  if (!session || !weekly) {
    throw new Error('Could not parse Cloud Usage from the Ollama settings page.');
  }

  if (expectedEmail && detectedEmail && detectedEmail !== expectedEmail.toLowerCase()) {
    throw new Error(`Logged into ${detectedEmail}, expected ${expectedEmail}.`);
  }

  return {
    email: expectedEmail?.toLowerCase() || detectedEmail,
    sessionPercent: session.percent,
    sessionResetIn: session.resetIn,
    weeklyPercent: weekly.percent,
    weeklyResetIn: weekly.resetIn,
    checkedAt: nowLabel(),
  };
}

export async function loginAccountInteractive(account) {
  const context = await chromium.launchPersistentContext(account.profileDir, {
    channel: 'chrome',
    headless: false,
    viewport: { width: 1440, height: 980 },
    args: CHROME_ARGS,
  });
  const page = context.pages()[0] || (await context.newPage());
  await page.goto(SETTINGS_URL, { waitUntil: 'domcontentloaded' });

  return {
    async collect() {
      return readUsageFromPage(page, account.email);
    },
    async close() {
      await context.close();
    },
  };
}

export async function refreshAccountUsage(account) {
  const context = await chromium.launchPersistentContext(account.profileDir, {
    channel: 'chrome',
    headless: true,
    viewport: { width: 1440, height: 980 },
    args: CHROME_ARGS,
  });

  try {
    const page = context.pages()[0] || (await context.newPage());
    return await readUsageFromPage(page, account.email);
  } finally {
    await context.close();
  }
}
