import process from 'node:process';
import chalk from 'chalk';
import { confirm, input, select } from '@inquirer/prompts';
import { renderAccountBlocks, renderFramedTable } from '../render.js';
import {
  clearCurrentAccount,
  ensureAccountRecord,
  getCurrentAccount,
  loadConfig,
  loadSnapshot,
  mergeUsageState,
  removeAccountRecord,
  saveConfig,
  saveSnapshot,
  setCurrentAccount,
} from '../storage/store.js';
import { nowLabel } from '../lib/format.js';
import { loginAccountInteractive, refreshAccountUsage } from './usage-collector.js';

const accent = chalk.hex('#da7b5b');
const promptTheme = {
  prefix: {
    idle: accent('?'),
    done: chalk.green('✔'),
  },
  style: {
    answer: accent,
    highlight: accent,
    key: (text) => accent(chalk.bold(`<${text}>`)),
    description: accent,
  },
};

function clearScreen() {
  process.stdout.write('\x1Bc');
}

function renderState(state) {
  return state.view === 'cards' ? renderAccountBlocks(state) : renderFramedTable(state);
}

function listAccountChoices(config) {
  return config.accounts.map((account) => ({
    name: `\t${account.email}`,
    value: account.email,
  }));
}

function listCurrentAccountChoices(config) {
  const currentAccount = getCurrentAccount();
  return config.accounts.map((account) => ({
    name:
      account.email.toLowerCase() === currentAccount
        ? `\t${account.email} ${chalk.green('✔')}`
        : `\t${account.email}`,
    value: account.email,
  }));
}

async function pause(message = 'Press Enter to return to the menu.') {
  await input({
    message,
    theme: promptTheme,
  });
}

function updateSnapshotEntry(email, usage) {
  const snapshot = loadSnapshot();
  snapshot.source = 'playwright';
  snapshot.checkedAt = nowLabel();
  snapshot.accounts = [
    ...snapshot.accounts.filter((entry) => entry.email.toLowerCase() !== email.toLowerCase()),
    usage,
  ];
  saveSnapshot(snapshot);
}

async function refreshAllAccounts(config) {
  const nextAccounts = [];

  clearScreen();
  process.stdout.write(`${chalk.bold('Refreshing all accounts...')}\n\n`);

  for (const account of config.accounts) {
    process.stdout.write(`- ${account.email}\n`);

    try {
      const usage = await refreshAccountUsage(account);
      nextAccounts.push(usage);
      process.stdout.write(`  ${accent('ok')}\n`);
    } catch (error) {
      nextAccounts.push({
        email: account.email,
        error: error.message,
      });
      process.stdout.write(`  ${chalk.red(error.message)}\n`);
    }
  }

  saveSnapshot({
    source: 'playwright',
    checkedAt: nowLabel(),
    accounts: nextAccounts,
  });

  await pause();
}

function choice(name, value) {
  return {
    name: `\t${name}`,
    value,
  };
}

async function runInteractiveLogin(account, confirmationMessage) {
  const session = await loginAccountInteractive(account);
  let sessionClosed = false;

  try {
    await input({
      message: confirmationMessage,
      theme: promptTheme,
    });
    await session.close();
    sessionClosed = true;
    return await refreshAccountUsage(account);
  } finally {
    if (!sessionClosed) {
      await session.close().catch(() => {});
    }
  }
}

async function addAccount(config) {
  const email = (
    await input({
      message: 'Enter the Ollama account email:',
      theme: promptTheme,
      validate(value) {
        return /\S+@\S+\.\S+/.test(value) || 'Enter a valid email address.';
      },
    })
  )
    .trim()
    .toLowerCase();

  const existing = config.accounts.find((account) => account.email.toLowerCase() === email);
  if (existing) {
    process.stdout.write(`${chalk.yellow('This email is already tracked.')}\n`);
    await pause();
    return;
  }

  const account = ensureAccountRecord(config, email);
  saveConfig(config);

  clearScreen();
  process.stdout.write(
    `${chalk.bold('Browser login required')}\n` +
      `A browser profile for ${email} is opening. Log into Ollama there, then return here.\n\n`
  );

  const usage = await runInteractiveLogin(
    account,
    'Press Enter after the Cloud Usage page is fully loaded in the browser.'
  );
  updateSnapshotEntry(email, usage);

  if (!getCurrentAccount()) {
    setCurrentAccount(email);
  }

  await pause('Account added. Press Enter to return to the menu.');
}

async function reloginAccount(config) {
  if (!config.accounts.length) {
    return;
  }

  const email = await select({
    message: 'Choose an account to relogin:',
    choices: [...listAccountChoices(config), choice('Back', '__back__')],
    theme: promptTheme,
  });

  if (email === '__back__') {
    return;
  }

  const account = config.accounts.find((entry) => entry.email === email);
  const usage = await runInteractiveLogin(
    account,
    'Press Enter after you finish relogin and the usage page is visible.'
  );
  updateSnapshotEntry(email, usage);

  await pause('Relogin complete. Press Enter to return to the menu.');
}

async function chooseCurrentAccount(config) {
  if (!config.accounts.length) {
    return;
  }

  const selected = await select({
    message: 'Choose the current account to highlight:',
    choices: [
      ...listCurrentAccountChoices(config),
      choice('Back', '__back__'),
    ],
    theme: promptTheme,
  });

  if (selected === '__back__') {
    return;
  }

  setCurrentAccount(selected);
}

async function removeAccount(config) {
  if (!config.accounts.length) {
    return;
  }

  const email = await select({
    message: 'Choose an account to remove:',
    choices: [...listAccountChoices(config), choice('Back', '__back__')],
    theme: promptTheme,
  });

  if (email === '__back__') {
    return;
  }

  const approved = await confirm({
    message: `Stop tracking ${email}?`,
    default: false,
    theme: promptTheme,
  });

  if (!approved) {
    return;
  }

  removeAccountRecord(config, email);
  saveConfig(config);

  const snapshot = loadSnapshot();
  snapshot.accounts = snapshot.accounts.filter((entry) => entry.email.toLowerCase() !== email.toLowerCase());
  saveSnapshot(snapshot);

  if (getCurrentAccount() === email.toLowerCase()) {
    clearCurrentAccount();
  }

  await pause('Account removed. Press Enter to return to the menu.');
}

async function switchView(config) {
  const next = await select({
    message: 'Choose the default view:',
    choices: [
      choice('Table', 'table'),
      choice('Cards', 'cards'),
      choice('Back', '__back__'),
    ],
    default: config.view,
    theme: promptTheme,
  });

  if (next === '__back__') {
    return;
  }

  config.view = next;
  saveConfig(config);
}

function printDashboard() {
  const state = mergeUsageState({});
  clearScreen();
  process.stdout.write(`${renderState(state)}\n\n`);
}

function buildActions(config) {
  const choices = [choice('Refresh all accounts', 'refresh')];

  if (config.accounts.length) {
    choices.push(
      choice('Add new account', 'add'),
      choice('Set current account', 'current'),
      choice('Relogin account', 'relogin'),
      choice('Remove account', 'remove')
    );
  } else {
    choices.push(choice('Add first account', 'add'));
  }

  choices.push(choice('Switch view', 'view'), choice('Exit', 'exit'));
  return choices;
}

export async function runInteractiveMenu() {
  for (;;) {
    const config = loadConfig();
    printDashboard();

    const action = await select({
      message: 'Choose an action:',
      choices: buildActions(config),
      theme: promptTheme,
    });

    if (action === 'exit') {
      clearScreen();
      return;
    }

    if (action === 'refresh') {
      await refreshAllAccounts(config);
      continue;
    }

    if (action === 'add') {
      await addAccount(config);
      continue;
    }

    if (action === 'current') {
      await chooseCurrentAccount(config);
      continue;
    }

    if (action === 'relogin') {
      await reloginAccount(config);
      continue;
    }

    if (action === 'remove') {
      await removeAccount(config);
      continue;
    }

    if (action === 'view') {
      await switchView(config);
    }
  }
}
