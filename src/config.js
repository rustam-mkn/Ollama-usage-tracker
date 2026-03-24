import fs from 'node:fs';
import path from 'node:path';

export const defaultConfigPath = path.resolve(process.cwd(), 'config/accounts.json');
export const defaultSnapshotPath = path.resolve(process.cwd(), 'data/usage-snapshot.json');
export const defaultCurrentAccountPath = path.resolve(process.cwd(), 'data/current-account.txt');

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
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`);
}

export function writeTextFile(filePath, text) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, `${text}\n`);
}
