import { command, string, run, successfulBuild, linted } from '@fabster/core';

export const generateLibrary = command({
  name: 'generate-library',
  purpose: 'Generate a library using an Nx generator',
  steps: [run('npm install'), run('npx nx generate {generator} --name={name} --directory={directory} --no-interactive')],
  inputs: {
    generator: string('Nx generator, e.g. @nx/react:library'),
    name: string('Library name'),
    directory: string('Directory for the library, e.g. packages/ui'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm'],
  },
  gates: [successfulBuild(), linted()],
});
