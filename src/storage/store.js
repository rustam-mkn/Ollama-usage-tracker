import fs from 'node:fs';
import path from 'node:path';
import {
  defaultConfigPath,
  defaultCurrentAccountPath,
  defaultSnapshotPath,
  ensureDir,
  profilesDirPath,
  readOptionalJsonFile,
  readOptionalTextFile,
  writeJsonFile,
  writeTextFile,
} from '../config.js';
import { slugifyEmail } from '../lib/slug.js';

const DEFAULT_CONFIG = {
  version: 1,
  view: 'table',
  accounts: [],
};

const DEFAULT_SNAPSHOT = {
  source: 'playwright',
  checkedAt: null,
  accounts: [],
};

export function loadConfig(configPath = defaultConfigPath) {
  const raw = readOptionalJsonFile(configPath);
  if (!raw) {
    return structuredClone(DEFAULT_CONFIG);
  }

  const accounts = Array.isArray(raw.accounts) ? raw.accounts : [];
  return {
    version: 1,
    view: raw.view === 'cards' ? 'cards' : 'table',
    accounts: accounts.map((account) => ({
      name: account.name || account.email,
      email: account.email,
      profileDir:
        account.profileDir ||
        path.resolve(profilesDirPath, slugifyEmail(account.email)),
      createdAt: account.createdAt || null,
      updatedAt: account.updatedAt || null,
    })),
  };
}

export function saveConfig(config, configPath = defaultConfigPath) {
  writeJsonFile(configPath, config);
}

export function loadSnapshot(snapshotPath = defaultSnapshotPath) {
  return readOptionalJsonFile(snapshotPath) || structuredClone(DEFAULT_SNAPSHOT);
}

export function saveSnapshot(snapshot, snapshotPath = defaultSnapshotPath) {
  writeJsonFile(snapshotPath, snapshot);
}

export function getCurrentAccount(currentAccountPath = defaultCurrentAccountPath) {
  return readOptionalTextFile(currentAccountPath)?.toLowerCase() || null;
}

export function setCurrentAccount(email, currentAccountPath = defaultCurrentAccountPath) {
  writeTextFile(currentAccountPath, email.trim().toLowerCase());
}

export function clearCurrentAccount(currentAccountPath = defaultCurrentAccountPath) {
  if (fs.existsSync(currentAccountPath)) {
    fs.unlinkSync(currentAccountPath);
  }
}

export function ensureAccountRecord(config, email) {
  const normalized = email.trim().toLowerCase();
  const existing = config.accounts.find((account) => account.email.toLowerCase() === normalized);
  if (existing) {
    return existing;
  }

  const profileDir = path.resolve(profilesDirPath, slugifyEmail(normalized));
  ensureDir(profileDir);
  const next = {
    name: normalized,
    email: normalized,
    profileDir,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  config.accounts.push(next);
  return next;
}

export function removeAccountRecord(config, email) {
  const normalized = email.trim().toLowerCase();
  config.accounts = config.accounts.filter((account) => account.email.toLowerCase() !== normalized);
}

export function mergeUsageState({
  configPath = defaultConfigPath,
  snapshotPath = defaultSnapshotPath,
  currentAccountPath = defaultCurrentAccountPath,
  currentAccountOverride,
}) {
  const config = loadConfig(configPath);
  const snapshot = loadSnapshot(snapshotPath);
  const currentAccount =
    currentAccountOverride ||
    process.env.OLLAMA_ACTIVE_ACCOUNT ||
    getCurrentAccount(currentAccountPath);
  const usageByEmail = new Map(
    (snapshot.accounts || []).map((entry) => [entry.email.toLowerCase(), entry])
  );

  return {
    view: config.view,
    currentAccount,
    checkedAt: snapshot.checkedAt || null,
    source: snapshot.source || 'playwright',
    accounts: config.accounts.map((account) => {
      const usage = usageByEmail.get(account.email.toLowerCase());
      if (!usage) {
        return {
          ...account,
          available: false,
          missingUsage: true,
        };
      }

      return {
        ...account,
        available: !usage.error,
        missingUsage:
          !!usage.error ||
          usage.sessionPercent == null ||
          usage.weeklyPercent == null ||
          usage.sessionResetIn == null ||
          usage.weeklyResetIn == null,
        sessionPercent: usage.sessionPercent,
        sessionResetIn: usage.sessionResetIn,
        weeklyPercent: usage.weeklyPercent,
        weeklyResetIn: usage.weeklyResetIn,
        checkedAt: usage.checkedAt || snapshot.checkedAt || null,
        error: usage.error || null,
      };
    }),
  };
}
