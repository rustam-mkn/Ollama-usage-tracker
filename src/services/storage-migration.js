import fs from 'node:fs';
import path from 'node:path';
import {
  configDirPath,
  dataDirPath,
  defaultConfigPath,
  defaultCurrentAccountPath,
  defaultSnapshotPath,
  ensureDir,
  legacyConfigPath,
  legacyCurrentAccountPath,
  legacyProfilesDirPath,
  legacySnapshotPath,
  profilesDirPath,
  readOptionalJsonFile,
  readOptionalTextFile,
} from '../config.js';

function isEmptyConfig(filePath) {
  const config = readOptionalJsonFile(filePath);
  return !config || !Array.isArray(config.accounts) || config.accounts.length === 0;
}

function isEmptySnapshot(filePath) {
  const snapshot = readOptionalJsonFile(filePath);
  return !snapshot || !Array.isArray(snapshot.accounts) || snapshot.accounts.length === 0;
}

function isEmptyText(filePath) {
  const value = readOptionalTextFile(filePath);
  return !value;
}

function copyFileIfNeeded(sourcePath, targetPath, targetIsEmpty) {
  if (!fs.existsSync(sourcePath)) {
    return false;
  }

  const shouldCopy = !fs.existsSync(targetPath) || targetIsEmpty(targetPath);
  if (!shouldCopy) {
    return false;
  }

  ensureDir(path.dirname(targetPath));
  fs.copyFileSync(sourcePath, targetPath);
  return true;
}

function migrateProfiles() {
  if (!fs.existsSync(legacyProfilesDirPath)) {
    return false;
  }

  ensureDir(profilesDirPath);
  let copied = false;

  for (const entry of fs.readdirSync(legacyProfilesDirPath)) {
    if (entry.startsWith('.')) {
      continue;
    }

    const sourcePath = path.join(legacyProfilesDirPath, entry);
    const targetPath = path.join(profilesDirPath, entry);
    if (!fs.statSync(sourcePath).isDirectory() || fs.existsSync(targetPath)) {
      continue;
    }

    fs.cpSync(sourcePath, targetPath, { recursive: true });
    copied = true;
  }

  return copied;
}

export function migrateLegacyStorage() {
  ensureDir(configDirPath);
  ensureDir(dataDirPath);
  ensureDir(profilesDirPath);

  const migrated = [];

  if (copyFileIfNeeded(legacyConfigPath, defaultConfigPath, isEmptyConfig)) {
    migrated.push('config');
  }

  if (copyFileIfNeeded(legacySnapshotPath, defaultSnapshotPath, isEmptySnapshot)) {
    migrated.push('snapshot');
  }

  if (copyFileIfNeeded(legacyCurrentAccountPath, defaultCurrentAccountPath, isEmptyText)) {
    migrated.push('current-account');
  }

  if (migrateProfiles()) {
    migrated.push('profiles');
  }

  return migrated;
}
