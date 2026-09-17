import { command, run } from '@fabster/core';

export const npmInstall = command({
  name: 'npm-install',
  purpose: 'Install npm dependencies',
  steps: [run('npm install')],
  inputs: {},
});
