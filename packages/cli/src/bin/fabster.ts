#!/usr/bin/env node

import { run } from '../run.js';

const args = process.argv.slice(2);
const command = args[0];

if (!command || command === 'help' || command === '--help') {
  console.log(`
fabster - workflow automation for fabricating code

Usage:
  fabster run <workflow-file>   Run a workflow definition
  fabster help                  Show this help message

Options:
  --dry-run                     Validate without executing
  --no-ui                       Disable TUI, output plain text
`);
  process.exit(0);
}

if (command === 'run') {
  const workflowFile = args[1];
  if (!workflowFile) {
    console.error('Error: workflow file path required');
    console.error('Usage: fabster run <workflow-file>');
    process.exit(1);
  }

  const dryRun = args.includes('--dry-run');
  const noUi = args.includes('--no-ui');

  run(workflowFile, { dryRun, ui: !noUi }).catch((err: Error) => {
    console.error(`Error: ${err.message}`);
    process.exit(1);
  });
} else {
  console.error(`Unknown command: ${command}`);
  console.error('Run "fabster help" for usage');
  process.exit(1);
}
