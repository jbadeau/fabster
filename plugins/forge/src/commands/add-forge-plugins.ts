import { command, run, string } from '@fabster/core';

export const addForgePlugins = command({
  name: 'add-forge-plugins',
  purpose: 'Add detected Forge technology plugins via nx add',
  steps: [
    run('pnpm install --no-frozen-lockfile'),
    run('node -e "const plugins=process.env.FORGE_PLUGINS||\'[]\';JSON.parse(plugins).forEach(p=>{const cmd=\'npx nx add @bjb-forge/nx-\'+p+\'-project\';console.log(\'Adding:\',cmd);require(\'child_process\').execSync(cmd,{stdio:\'inherit\'})})"'),
  ],
  inputs: {
    plugins: string('JSON array of plugin names to add, e.g. ["maven","react","docker"]'),
  },
  permissions: {
    fs: { read: ['/repo/**'], write: ['/repo/**'] },
    tools: ['node', 'pnpm'],
    network: ['csa.npm.pkg.sehlat.io', 'registry.npmjs.org'],
    secrets: ['CODEAK_REPOSITORY_BASIC_AUTH'],
  },
  gates: [],
});
