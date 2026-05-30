import { command, string, run, successfulBuild, linted } from '@fabster/core';

export const generateApp = command({
  name: 'generate-app',
  purpose: 'Generate an application using an Nx generator',
  steps: [run('npm install'), run('npx nx generate {generator} --name={name} --directory={directory} --no-interactive')],
  inputs: {
    generator: string('Nx generator, e.g. @nx/react:app'),
    name: string('Application name'),
    directory: string('Directory for the app, e.g. apps/todo'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'npm'],
  },
  gates: [successfulBuild(), linted()],
});
