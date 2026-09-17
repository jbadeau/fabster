import { command, string, run, use, successfulBuild, linted } from '@fabster/core';
import { npmInstall } from './npm-install.js';

export const generateLibrary = command({
  name: 'generate-library',
  purpose: 'Generate a library using an Nx generator',
  steps: [use(npmInstall, {}), run('npx nx generate {generator} --name={name} --directory={directory} --no-interactive')],
  inputs: {
    generator: string('Nx generator, e.g. @nx/react:library'),
    name: string('Library name'),
    directory: string('Directory for the library, e.g. packages/ui'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    network: ['registry.npmjs.org'],
    tools: ['node', 'npm'],
  },
  post: [successfulBuild(), linted()],
});
