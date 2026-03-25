import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const currentFilePath = fileURLToPath(import.meta.url);
export const projectRootPath = path.resolve(path.dirname(currentFilePath), '..');
export const configDirPath = path.resolve(projectRootPath, 'config');
export const dataDirPath = path.resolve(projectRootPath, 'data');
export const profilesDirPath = path.resolve(projectRootPath, 'profiles');

export const defaultConfigPath = path.resolve(configDirPath, 'accounts.json');
export const defaultSnapshotPath = path.resolve(dataDirPath, 'usage-snapshot.json');
export const defaultCurrentAccountPath = path.resolve(dataDirPath, 'current-account.txt');

export const legacyConfigPath = path.resolve(os.homedir(), 'config', 'accounts.json');
export const legacySnapshotPath = path.resolve(os.homedir(), 'data', 'usage-snapshot.json');
export const legacyCurrentAccountPath = path.resolve(os.homedir(), 'data', 'current-account.txt');
export const legacyProfilesDirPath = path.resolve(os.homedir(), 'profiles');

export function ensureDir(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

export function readJsonFile(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

export function readOptionalTextFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return fs.readFileSync(filePath, 'utf8').trim() || null;
}

export function readOptionalJsonFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return null;
  }

  return readJsonFile(filePath);
}

export function writeJsonFile(filePath, data) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}
`);
}

export function writeTextFile(filePath, text) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${text}
`);
}
