#!/usr/bin/env node

import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const zshrcPath = path.join(os.homedir(), '.zshrc');
const cliPath = path.resolve(process.cwd(), 'src/cli.js');
const markerStart = '# >>> ollama account integration >>>';
const markerEnd = '# <<< ollama account integration <<<';
const block = `${markerStart}
ollama() {
  if [ "$1" = "account" ]; then
    shift
    node '${cliPath}' "$@"
  else
    command ollama "$@"
  fi
}
${markerEnd}
`;

const current = fs.existsSync(zshrcPath) ? fs.readFileSync(zshrcPath, 'utf8') : '';
const cleaned = current.replace(
  new RegExp(`${markerStart}[\\s\\S]*?${markerEnd}\\n?`, 'g'),
  ''
);
const next = cleaned.trimEnd() ? `${cleaned.trimEnd()}\n\n${block}` : `${block}`;

fs.writeFileSync(zshrcPath, next);
process.stdout.write(`Updated ${zshrcPath}\nRestart the shell or run: source ~/.zshrc\n`);
