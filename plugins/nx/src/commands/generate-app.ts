import { command, string, run, use, successfulBuild, linted } from '@fabster/core';
import { npmInstall } from './npm-install.js';

export const generateApp = command({
  name: 'generate-app',
  purpose: 'Generate an application using an Nx generator',
  steps: [use(npmInstall, {}), run('npx nx generate {generator} --name={name} --directory={directory} --no-interactive {extraArgs}')],
  inputs: {
    generator: string('Nx generator, e.g. @nx/react:app'),
    name: string('Application name'),
    directory: string('Directory for the app, e.g. apps/todo'),
    // Always required rather than defaulted: a value must be resolved for
    // every call, including an explicit '', or the literal "{extraArgs}"
    // placeholder is left in the command line unresolved (interpolate()
    // only substitutes keys actually present in the resolved inputs).
    extraArgs: string('Extra flags appended to the generator invocation, e.g. --e2eTestRunner=none (pass \'\' for none)'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    network: ['registry.npmjs.org'],
    tools: ['node', 'npm'],
  },
  post: [successfulBuild(), linted()],
});
