#!/usr/bin/env node

import process from 'node:process';
import { Command } from 'commander';
import { runInteractiveMenu } from './services/menu.js';
import { migrateLegacyStorage } from './services/storage-migration.js';
import { mergeUsageState } from './storage/store.js';

const program = new Command();

program
  .name('ollama-account')
  .description('Track and refresh cloud usage across multiple Ollama accounts.')
  .option('--json', 'Print merged state as JSON')
  .action(async (options) => {
    migrateLegacyStorage();
    if (options.json) {
      process.stdout.write(`${JSON.stringify(mergeUsageState({}), null, 2)}\n`);
      return;
    }

    await runInteractiveMenu();
  });

program.parseAsync(process.argv).catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
