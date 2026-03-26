#!/usr/bin/env node

import process from 'node:process';
import { Command, InvalidOptionArgumentError } from 'commander';
import { runInteractiveMenu } from './services/menu.js';
import { migrateLegacyStorage } from './services/storage-migration.js';
import { mergeUsageState } from './storage/store.js';

const program = new Command();

program
  .name('ollama-account')
  .description('Track and refresh cloud usage across multiple Ollama accounts.')
  .option('--json', 'Print merged state as JSON')
  .option(
    '--refresh-interval <minutes>',
    'Auto-refresh interval in minutes while the menu is open (0 disables it)',
    (value) => {
      const minutes = Number.parseInt(value, 10);
      if (Number.isNaN(minutes) || minutes < 0) {
        throw new InvalidOptionArgumentError('refresh interval must be a non-negative integer');
      }

      return minutes;
    },
    20
  )
  .action(async (options) => {
    migrateLegacyStorage();
    if (options.json) {
      process.stdout.write(`${JSON.stringify(mergeUsageState({}), null, 2)}\n`);
      return;
    }

    await runInteractiveMenu({
      autoRefreshMinutes: options.refreshInterval,
    });
  });

program.parseAsync(process.argv).catch((error) => {
  process.stderr.write(`${error.message}\n`);
  process.exit(1);
});
